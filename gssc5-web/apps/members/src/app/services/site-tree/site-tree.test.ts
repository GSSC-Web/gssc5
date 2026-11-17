import { TestBed } from '@angular/core/testing';
import { MemberSession } from '../member-session';
import {
  SITE_TREE_GET,
  SiteTree,
  limitNavSubmenuDepth,
  navItemsFromMembersTree,
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
  frontend: 'members',
  root: node('root', 'Dashboard', '/', [
    node('dir', 'Directory', '/directory'),
    node('pubs', 'Publications', '/publications', [
      node('cat', 'Catalog', '/publications/catalog', [
        node('section', 'Section', '/publications/catalog/section', [
          node('deep', 'Too Deep', '/publications/catalog/deep'),
        ]),
      ]),
      node('tools', 'Tools', '/publications/tools'),
    ]),
  ]),
};

/** Helper coverage for depth trimming; MLLR-447 Test @relation lives in header.test.ts. */
test('limitNavSubmenuDepth keeps two submenu levels', () => {
  const limited = limitNavSubmenuDepth(sampleTree.root.children, 2);
  const publications = limited.find((item) => item.path === '/publications')!;
  expect(publications.children).toHaveLength(2);
  const catalog = publications.children.find(
    (item) => item.path === '/publications/catalog',
  )!;
  expect(catalog.children.map((item) => item.label)).toEqual(['Section']);
  expect(catalog.children[0]!.children).toEqual([]);
});

/** Helper coverage for root + children; MLLR-441 Test @relation lives in header.test.ts. */
test('navItemsFromMembersTree prepends root as home', () => {
  const items = navItemsFromMembersTree(sampleTree);
  expect(items[0]).toEqual({
    cuid: 'root',
    label: 'Dashboard',
    path: '/',
    children: [],
  });
  expect(items.map((item) => item.label)).toEqual([
    'Dashboard',
    'Directory',
    'Publications',
  ]);
});

test('SiteTree refresh loads members nav items', async () => {
  const getTree = async () => sampleTree;
  TestBed.configureTestingModule({
    providers: [{ provide: SITE_TREE_GET, useValue: getTree }],
  });
  const session = TestBed.inject(MemberSession);
  session.isAdmin.set(true);
  const siteTree = TestBed.inject(SiteTree);
  await siteTree.refresh();
  expect(siteTree.loaded()).toBe(true);
  expect(siteTree.navItems().map((item) => item.path)).toEqual([
    '/',
    '/directory',
    '/publications',
  ]);
});

test('SiteTree refresh filters permission-gated Members nodes', async () => {
  const getTree = async () =>
    ({
      frontend: 'members',
      root: node('root', 'Dashboard', '/', [
        node('dir', 'Directory', '/directory'),
        node('news', 'Newsletters', '/newsletters'),
        node('pubs', 'Publications', '/publications'),
      ]),
    }) satisfies NestedSiteTreePayload;
  TestBed.configureTestingModule({
    providers: [{ provide: SITE_TREE_GET, useValue: getTree }],
  });
  const session = TestBed.inject(MemberSession);
  session.isAdmin.set(false);
  session.isNewsletterEditor.set(false);
  session.isPublicationEditor.set(false);
  session.isToolEditor.set(false);
  const siteTree = TestBed.inject(SiteTree);
  await siteTree.refresh();
  expect(siteTree.navItems().map((item) => item.path)).toEqual([
    '/',
    '/directory',
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
