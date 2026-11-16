import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, textContent } from '../../../test-harness';
import {
  PUBLIC_SITE_TREE_GET,
  SitemapPage,
  type SitemapTreeNode,
} from './sitemap';

const sampleTree: SitemapTreeNode = {
  cuid: 'root_home',
  label: 'Home',
  path: '/',
  sortOrder: 0,
  sectionTag: null,
  children: [
    {
      cuid: 'node_membership',
      label: 'Membership',
      path: '/membership',
      sortOrder: 0,
      sectionTag: null,
      children: [],
    },
    {
      cuid: 'node_leadership',
      label: 'Leadership',
      path: '/leadership',
      sortOrder: 1,
      sectionTag: null,
      children: [
        {
          cuid: 'node_officers',
          label: 'Officers',
          path: '/leadership',
          sortOrder: 0,
          sectionTag: null,
          children: [],
        },
      ],
    },
  ],
};

async function setupSitemapPage(
  treeGet: () => Promise<SitemapTreeNode | null>,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SitemapPage],
    providers: [
      provideRouter([]),
      { provide: PUBLIC_SITE_TREE_GET, useValue: treeGet },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SitemapPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
  };
}

// @relation(GSSC-PLLR-333, scope=range_start, role=Test)
test('GSSC-PLLR-333 Semantic', async () => {
  let treeCalls = 0;
  const { page, root } = await setupSitemapPage(async () => {
    treeCalls += 1;
    return sampleTree;
  });

  expect(treeCalls).toBe(1);
  expect(page.root()).toEqual(sampleTree);
  expect(textContent(root, '.gssc-sitemap-page__heading')).toBe('Sitemap');
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-sitemap-entry__link'),
  ];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'Home',
    'Membership',
    'Leadership',
    'Officers',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/',
    '/membership',
    '/leadership',
    '/leadership',
  ]);
});
// @relation(GSSC-PLLR-333, scope=range_end, role=Test)

// @relation(GSSC-PLLR-334, scope=range_start, role=Test)
test('GSSC-PLLR-334 Syntactic', async () => {
  const { root: present } = await setupSitemapPage(async () => sampleTree);
  const host = present.querySelector<HTMLElement>('.gssc-sitemap-page')!;
  expect(host.classList.contains('w-full')).toBe(true);
  expect(present.querySelector('.gssc-sitemap-page__content')).not.toBeNull();
  expect(present.querySelector('.gssc-sitemap-page__tree')).not.toBeNull();

  const rootItem = present.querySelector('.gssc-sitemap-entry')!;
  const nestedTree = rootItem.querySelector(':scope > gssc-sitemap-tree, :scope > .gssc-sitemap-tree');
  // Child list is a nested gssc-sitemap-tree under the root entry.
  expect(rootItem.querySelector('gssc-sitemap-tree')).not.toBeNull();
  const childLabels = [
    ...rootItem.querySelectorAll(':scope > gssc-sitemap-tree .gssc-sitemap-entry__link'),
  ].map((el) => el.textContent?.trim());
  expect(childLabels).toEqual(['Membership', 'Leadership', 'Officers']);

  const leadershipItem = [...present.querySelectorAll('.gssc-sitemap-entry')].find(
    (el) => el.querySelector(':scope > .gssc-sitemap-entry__link')?.textContent?.trim() === 'Leadership',
  )!;
  expect(
    leadershipItem.querySelector(':scope > gssc-sitemap-tree .gssc-sitemap-entry__link')
      ?.textContent?.trim(),
  ).toBe('Officers');

  void nestedTree;

  const { root: missing } = await setupSitemapPage(async () => null);
  expect(missing.querySelector('.gssc-sitemap-page__content')).toBeNull();
  expect(missing.querySelector('.gssc-sitemap-entry')).toBeNull();
});
// @relation(GSSC-PLLR-334, scope=range_end, role=Test)

// @relation(GSSC-PLLR-335, scope=range_start, role=Test)
test('GSSC-PLLR-335 Lexical', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const host = root.querySelector<HTMLElement>('.gssc-sitemap-page')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);

  const heading = root.querySelector<HTMLElement>('.gssc-sitemap-page__heading')!;
  expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-335, scope=range_end, role=Test)

// @relation(GSSC-PLLR-336, scope=range_start, role=Test)
test('GSSC-PLLR-336 Semantic', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const membership = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-sitemap-entry__link'),
  ].find((link) => link.textContent?.trim() === 'Membership')!;
  expect(membership.textContent?.trim()).toBe('Membership');
  expect(membership.getAttribute('href')).toBe('/membership');
});
// @relation(GSSC-PLLR-336, scope=range_end, role=Test)

// @relation(GSSC-PLLR-337, scope=range_start, role=Test)
test('GSSC-PLLR-337 Syntactic', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const entries = root.querySelectorAll('.gssc-sitemap-entry');
  expect(entries.length).toBe(4);
  for (const entry of entries) {
    expect(entry.querySelector(':scope > .gssc-sitemap-entry__link')).not.toBeNull();
    expect(entry.parentElement?.classList.contains('gssc-sitemap-tree')).toBe(true);
  }
});
// @relation(GSSC-PLLR-337, scope=range_end, role=Test)

// @relation(GSSC-PLLR-338, scope=range_start, role=Test)
test('GSSC-PLLR-338 Lexical', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const link = root.querySelector<HTMLElement>('.gssc-sitemap-entry__link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('underline')).toBe(true);
});
// @relation(GSSC-PLLR-338, scope=range_end, role=Test)
