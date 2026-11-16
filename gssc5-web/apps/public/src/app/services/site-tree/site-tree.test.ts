import { TestBed } from '@angular/core/testing';
import {
  SITE_TREE_GET,
  SiteTree,
  limitNavSubmenuDepth,
  navItemsFromPublicTree,
  type NestedSiteTreePayload,
  type SiteTreeNavNode,
} from './site-tree';

function node(
  cuid: string,
  label: string,
  path: string,
  children: SiteTreeNavNode[] = [],
): SiteTreeNavNode {
  return { cuid, label, path, children };
}

const sampleTree: NestedSiteTreePayload = {
  frontend: 'public',
  root: node('root', 'Home', '/', [
    node('m', 'Membership', '/membership'),
    node('p', 'Publications', '/publications', [
      node('c', 'Cemetery', '/publications/cemetery', [
        node('section', 'Cemetery Section', '/publications/cemetery/section', [
          node('deep', 'Too Deep', '/publications/cemetery/deep'),
        ]),
      ]),
      node('w', 'War Veterans', '/publications/war-veterans'),
    ]),
  ]),
};

/** Helper coverage for depth trimming; PLLR-335 Test @relation lives in header.test.ts. */
test('limitNavSubmenuDepth keeps two submenu levels', () => {
  const limited = limitNavSubmenuDepth(sampleTree.root.children, 2);
  const publications = limited.find((item) => item.path === '/publications')!;
  expect(publications.children).toHaveLength(2);
  const cemetery = publications.children.find(
    (item) => item.path === '/publications/cemetery',
  )!;
  expect(cemetery.children.map((item) => item.label)).toEqual(['Cemetery Section']);
  expect(cemetery.children[0]!.children).toEqual([]);
});

/** Helper coverage for home + children; PLLR-329 Test @relation lives in header.test.ts. */
test('navItemsFromPublicTree prepends home', () => {
  const items = navItemsFromPublicTree(sampleTree);
  expect(items[0]).toEqual({
    cuid: 'root',
    label: 'Home',
    path: '/',
    children: [],
  });
  expect(items.map((item) => item.label)).toEqual([
    'Home',
    'Membership',
    'Publications',
  ]);
});

test('SiteTree refresh loads public nav items', async () => {
  const getTree = async () => sampleTree;
  TestBed.configureTestingModule({
    providers: [{ provide: SITE_TREE_GET, useValue: getTree }],
  });
  const siteTree = TestBed.inject(SiteTree);
  await siteTree.refresh();
  expect(siteTree.loaded()).toBe(true);
  expect(siteTree.navItems().map((item) => item.path)).toEqual([
    '/',
    '/membership',
    '/publications',
  ]);
});

test('SiteTree refresh clears items when the tree is missing', async () => {
  TestBed.configureTestingModule({
    providers: [{ provide: SITE_TREE_GET, useValue: async () => null }],
  });
  const siteTree = TestBed.inject(SiteTree);
  await siteTree.refresh();
  expect(siteTree.navItems()).toEqual([]);
  expect(siteTree.loaded()).toBe(true);
});
