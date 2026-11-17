import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, textContent } from '../../../test-harness';
import {
  MEMBERS_SITE_TREE_GET,
  SitemapPage,
  type SitemapTreeNode,
} from './sitemap';

const sampleTree: SitemapTreeNode = {
  cuid: 'root_dashboard',
  label: 'Dashboard',
  path: '/',
  sortOrder: 0,
  sectionTag: null,
  children: [
    {
      cuid: 'node_directory',
      label: 'Directory',
      path: '/directory',
      sortOrder: 0,
      sectionTag: null,
      children: [],
    },
    {
      cuid: 'node_account',
      label: 'Account',
      path: '/account',
      sortOrder: 1,
      sectionTag: null,
      children: [
        {
          cuid: 'node_password',
          label: 'Password',
          path: '/account',
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
      { provide: MEMBERS_SITE_TREE_GET, useValue: treeGet },
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

// @relation(GSSC-MLLR-504, scope=range_start, role=Test)
test('GSSC-MLLR-504 Semantic', async () => {
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
    'Dashboard',
    'Directory',
    'Account',
    'Password',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/',
    '/directory',
    '/account',
    '/account',
  ]);
});
// @relation(GSSC-MLLR-504, scope=range_end, role=Test)

// @relation(GSSC-MLLR-505, scope=range_start, role=Test)
test('GSSC-MLLR-505 Syntactic', async () => {
  const { root: present } = await setupSitemapPage(async () => sampleTree);
  const host = present.querySelector<HTMLElement>('.gssc-sitemap-page')!;
  expect(host.classList.contains('w-full')).toBe(true);
  expect(present.querySelector('.gssc-sitemap-page__content')).not.toBeNull();
  expect(present.querySelector('.gssc-sitemap-page__tree')).not.toBeNull();

  const rootItem = present.querySelector('.gssc-sitemap-entry')!;
  expect(rootItem.querySelector('gssc-sitemap-tree')).not.toBeNull();
  const childLabels = [
    ...rootItem.querySelectorAll(
      ':scope > gssc-sitemap-tree .gssc-sitemap-entry__link',
    ),
  ].map((el) => el.textContent?.trim());
  expect(childLabels).toEqual(['Directory', 'Account', 'Password']);

  const accountItem = [...present.querySelectorAll('.gssc-sitemap-entry')].find(
    (el) =>
      el.querySelector(':scope > .gssc-sitemap-entry__link')?.textContent?.trim() ===
      'Account',
  )!;
  expect(
    accountItem
      .querySelector(':scope > gssc-sitemap-tree .gssc-sitemap-entry__link')
      ?.textContent?.trim(),
  ).toBe('Password');

  const { root: missing } = await setupSitemapPage(async () => null);
  expect(missing.querySelector('.gssc-sitemap-page__content')).toBeNull();
  expect(missing.querySelector('.gssc-sitemap-entry')).toBeNull();
});
// @relation(GSSC-MLLR-505, scope=range_end, role=Test)

// @relation(GSSC-MLLR-506, scope=range_start, role=Test)
test('GSSC-MLLR-506 Lexical', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const host = root.querySelector<HTMLElement>('.gssc-sitemap-page')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);

  const heading = root.querySelector<HTMLElement>('.gssc-sitemap-page__heading')!;
  expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-506, scope=range_end, role=Test)

// @relation(GSSC-MLLR-507, scope=range_start, role=Test)
test('GSSC-MLLR-507 Semantic', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const directory = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-sitemap-entry__link'),
  ].find((link) => link.textContent?.trim() === 'Directory')!;
  expect(directory.textContent?.trim()).toBe('Directory');
  expect(directory.getAttribute('href')).toBe('/directory');
});
// @relation(GSSC-MLLR-507, scope=range_end, role=Test)

// @relation(GSSC-MLLR-508, scope=range_start, role=Test)
test('GSSC-MLLR-508 Syntactic', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const entries = root.querySelectorAll('.gssc-sitemap-entry');
  expect(entries.length).toBe(4);
  for (const entry of entries) {
    expect(entry.querySelector(':scope > .gssc-sitemap-entry__link')).not.toBeNull();
    expect(entry.parentElement?.classList.contains('gssc-sitemap-tree')).toBe(true);
  }
});
// @relation(GSSC-MLLR-508, scope=range_end, role=Test)

// @relation(GSSC-MLLR-509, scope=range_start, role=Test)
test('GSSC-MLLR-509 Lexical', async () => {
  const { root } = await setupSitemapPage(async () => sampleTree);
  const link = root.querySelector<HTMLElement>('.gssc-sitemap-entry__link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('underline')).toBe(true);
});
// @relation(GSSC-MLLR-509, scope=range_end, role=Test)
