import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { nativeElement, textContent } from '../../../test-harness';
import { SITE_SEARCH_GET } from '../../services/site-search/site-search';
import { SearchPage } from './search';

const sampleResults = [
  {
    title: 'Directory',
    snippet: 'Browse members',
    href: '/directory',
    kind: 'site-tree' as const,
  },
  {
    title: 'Announcements',
    snippet: 'Society news',
    href: '/announcements',
    kind: 'announcement' as const,
  },
];

async function setupSearchPage(
  searchGet: (query: {
    q: string;
    limit?: number;
    kind?: string;
  }) => Promise<typeof sampleResults | null>,
  initialUrl = '/search?q=dir',
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SearchPage],
    providers: [
      provideRouter([{ path: 'search', component: SearchPage }]),
      { provide: SITE_SEARCH_GET, useValue: searchGet },
    ],
  }).compileComponents();

  const router = TestBed.inject(Router);
  await router.navigateByUrl(initialUrl);
  const fixture = TestBed.createComponent(SearchPage);
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
    router,
  };
}

// @relation(GSSC-MLLR-471, scope=range_start, role=Test)
test('GSSC-MLLR-471 Semantic', async () => {
  let lastQuery: { q: string; kind?: string } | null = null;
  const { page, root } = await setupSearchPage(async (query) => {
    lastQuery = { q: query.q, kind: query.kind };
    return sampleResults.filter((row) =>
      query.kind ? row.kind === query.kind : true,
    );
  });

  expect(lastQuery).toEqual({ q: 'dir', kind: undefined });
  expect(page.results().length).toBe(2);
  expect(page.loadError()).toBe(false);
  expect(textContent(root, '.gssc-search-page__heading')).toBe('Search');
  expect(root.querySelectorAll('.gssc-search-page__result').length).toBe(2);
  expect(root.querySelector('.gssc-search-page__unavailable')).toBeNull();

  const { page: emptyPage, root: emptyRoot } = await setupSearchPage(
    async () => [],
    '/search?q=zzz',
  );
  expect(emptyPage.results()).toEqual([]);
  expect(emptyPage.loadError()).toBe(false);
  expect(emptyRoot.querySelector('.gssc-search-page__unavailable')).toBeNull();
  expect(emptyRoot.querySelector('.gssc-search-page__results')).toBeNull();

  const { page: failedPage, root: failedRoot } = await setupSearchPage(
    async () => null,
    '/search?q=dir',
  );
  expect(failedPage.results()).toEqual([]);
  expect(failedPage.loadError()).toBe(true);
  expect(textContent(failedRoot, '.gssc-search-page__unavailable')).toBe(
    'Search unavailable.',
  );
  expect(failedRoot.querySelector('.gssc-search-page__results')).toBeNull();
});
// @relation(GSSC-MLLR-471, scope=range_end, role=Test)

// @relation(GSSC-MLLR-472, scope=range_start, role=Test)
test('GSSC-MLLR-472 Syntactic', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const page = root.querySelector('.gssc-search-page')!;
  const filters = root.querySelector('.gssc-search-page__filters')!;
  const results = root.querySelector('.gssc-search-page__results')!;
  expect(page.contains(filters)).toBe(true);
  expect(
    filters.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const { root: empty } = await setupSearchPage(async () => [], '/search?q=zzz');
  expect(empty.querySelector('.gssc-search-page__results')).toBeNull();
});
// @relation(GSSC-MLLR-472, scope=range_end, role=Test)

// @relation(GSSC-MLLR-473, scope=range_start, role=Test)
test('GSSC-MLLR-473 Lexical', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const page = root.querySelector<HTMLElement>('.gssc-search-page')!;
  expect(page.className).toContain('bg-gssc-white');
  expect(page.className).toContain('font-sans');
  const heading = root.querySelector<HTMLElement>('.gssc-search-page__heading')!;
  expect(heading.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-473, scope=range_end, role=Test)

// @relation(GSSC-MLLR-474, scope=range_start, role=Test)
test('GSSC-MLLR-474 Semantic', async () => {
  let calls = 0;
  const { root, fixture, page } = await setupSearchPage(async (query) => {
    calls += 1;
    expect(query.q).toBe(calls === 1 ? 'dir' : 'account');
    return sampleResults;
  });
  const input = root.querySelector<HTMLInputElement>('.gssc-search-page__query')!;
  input.value = 'account';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  expect(page.query()).toBe('account');
  root.querySelector<HTMLFormElement>('.gssc-search-page__filters')!.requestSubmit();
  await fixture.whenStable();
  await Promise.resolve();
  expect(calls).toBe(2);
});
// @relation(GSSC-MLLR-474, scope=range_end, role=Test)

// @relation(GSSC-MLLR-475, scope=range_start, role=Test)
test('GSSC-MLLR-475 Syntactic', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const filters = root.querySelector('.gssc-search-page__filters')!;
  const query = root.querySelector('.gssc-search-page__query')!;
  expect(filters.contains(query)).toBe(true);
  expect(query.getAttribute('type')).toBe('search');
});
// @relation(GSSC-MLLR-475, scope=range_end, role=Test)

// @relation(GSSC-MLLR-476, scope=range_start, role=Test)
test('GSSC-MLLR-476 Lexical', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const query = root.querySelector<HTMLElement>('.gssc-search-page__query')!;
  expect(query.className).toContain('font-sans');
  expect(query.className).toContain('text-gssc-dark-green');
  expect(query.className).toContain('border-gssc-gray');
});
// @relation(GSSC-MLLR-476, scope=range_end, role=Test)

// @relation(GSSC-MLLR-477, scope=range_start, role=Test)
test('GSSC-MLLR-477 Semantic', async () => {
  let lastKind: string | undefined;
  const { root, fixture } = await setupSearchPage(async (query) => {
    lastKind = query.kind;
    return sampleResults.filter((row) =>
      query.kind ? row.kind === query.kind : true,
    );
  });
  const select = root.querySelector<HTMLSelectElement>('.gssc-search-page__kind')!;
  select.value = 'announcement';
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  root.querySelector<HTMLFormElement>('.gssc-search-page__filters')!.requestSubmit();
  await fixture.whenStable();
  await Promise.resolve();
  expect(lastKind).toBe('announcement');
});
// @relation(GSSC-MLLR-477, scope=range_end, role=Test)

// @relation(GSSC-MLLR-478, scope=range_start, role=Test)
test('GSSC-MLLR-478 Syntactic', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const filters = root.querySelector('.gssc-search-page__filters')!;
  expect(filters.querySelector('.gssc-search-page__query')).not.toBeNull();
  expect(filters.querySelector('.gssc-search-page__kind')).not.toBeNull();
});
// @relation(GSSC-MLLR-478, scope=range_end, role=Test)

// @relation(GSSC-MLLR-479, scope=range_start, role=Test)
test('GSSC-MLLR-479 Lexical', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const kind = root.querySelector<HTMLElement>('.gssc-search-page__kind')!;
  expect(kind.className).toContain('font-sans');
  expect(kind.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-479, scope=range_end, role=Test)

// @relation(GSSC-MLLR-480, scope=range_start, role=Test)
test('GSSC-MLLR-480 Semantic', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const link = root.querySelector<HTMLAnchorElement>(
    '.gssc-search-page__result-link',
  )!;
  expect(textContent(root, '.gssc-search-page__result-title')).toBe('Directory');
  expect(textContent(root, '.gssc-search-page__result-snippet')).toBe(
    'Browse members',
  );
  expect(textContent(root, '.gssc-search-page__result-kind')).toBe('site-tree');
  expect(link.getAttribute('href')).toBe('/directory');
});
// @relation(GSSC-MLLR-480, scope=range_end, role=Test)

// @relation(GSSC-MLLR-481, scope=range_start, role=Test)
test('GSSC-MLLR-481 Syntactic', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const list = root.querySelector('.gssc-search-page__results')!;
  const items = list.querySelectorAll('.gssc-search-page__result');
  expect(items.length).toBe(2);
  expect(list.tagName).toBe('UL');
});
// @relation(GSSC-MLLR-481, scope=range_end, role=Test)

// @relation(GSSC-MLLR-482, scope=range_start, role=Test)
test('GSSC-MLLR-482 Lexical', async () => {
  const { root } = await setupSearchPage(async () => sampleResults);
  const title = root.querySelector<HTMLElement>('.gssc-search-page__result-title')!;
  const snippet = root.querySelector<HTMLElement>(
    '.gssc-search-page__result-snippet',
  )!;
  expect(title.className).toContain('font-sans');
  expect(title.className).toContain('text-gssc-dark-green');
  expect(snippet.className).toContain('text-gssc-gray');
});
// @relation(GSSC-MLLR-482, scope=range_end, role=Test)
