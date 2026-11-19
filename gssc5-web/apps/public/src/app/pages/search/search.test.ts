import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SITE_SEARCH_GET,
  type SiteSearchQuery,
  type SiteSearchResult,
} from '../../services/site-search/site-search';
import { SearchPage } from './search';

const sampleResults: SiteSearchResult[] = [
  {
    title: 'Membership',
    snippet: 'Join the society',
    href: '/membership',
    kind: 'site-tree',
  },
  {
    title: 'Library Hours',
    snippet: 'Hours change this week',
    href: '/announcements/1',
    kind: 'announcement',
  },
];

async function setupSearchPage(options?: {
  initialUrl?: string;
  searchGet?: (query: SiteSearchQuery) => Promise<SiteSearchResult[] | null>;
}) {
  TestBed.resetTestingModule();
  const calls: SiteSearchQuery[] = [];
  const searchGet =
    options?.searchGet ??
    (async (query: SiteSearchQuery) => {
      calls.push(query);
      return sampleResults.filter((entry) =>
        query.kind ? entry.kind === query.kind : true,
      );
    });

  await TestBed.configureTestingModule({
    imports: [SearchPage],
    providers: [
      provideRouter([{ path: 'search', component: SearchPage }]),
      { provide: SITE_SEARCH_GET, useValue: searchGet },
    ],
  }).compileComponents();

  const router = TestBed.inject(Router);
  await router.navigateByUrl(options?.initialUrl ?? '/search');
  const fixture = TestBed.createComponent(SearchPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    router,
    page: fixture.componentInstance,
    root: nativeElement(fixture),
    calls,
  };
}

// @relation(GSSC-PLLR-363, scope=range_start, role=Test)
test('GSSC-PLLR-363 Semantic', async () => {
  const { page, root, calls } = await setupSearchPage({
    initialUrl: '/search?q=membership',
  });
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(calls[0]?.q).toBe('membership');
  expect(page.results()).toEqual(sampleResults);
  expect(page.loadError()).toBe(false);
  expect(textContent(root, '.gssc-search-page__heading')).toBe('Search');
  expect(root.querySelectorAll('.gssc-search-page__result').length).toBe(2);
  expect(root.querySelector('.gssc-search-page__unavailable')).toBeNull();

  const { page: emptyPage, root: emptyRoot } = await setupSearchPage({
    initialUrl: '/search?q=zzz',
    searchGet: async () => [],
  });
  expect(emptyPage.results()).toEqual([]);
  expect(emptyPage.loadError()).toBe(false);
  expect(emptyRoot.querySelector('.gssc-search-page__unavailable')).toBeNull();
  expect(emptyRoot.querySelector('.gssc-search-page__results')).not.toBeNull();
  expect(emptyRoot.querySelectorAll('.gssc-search-page__result').length).toBe(0);

  const { page: failedPage, root: failedRoot } = await setupSearchPage({
    initialUrl: '/search?q=membership',
    searchGet: async () => null,
  });
  expect(failedPage.results()).toEqual([]);
  expect(failedPage.loadError()).toBe(true);
  expect(textContent(failedRoot, '.gssc-search-page__unavailable')).toBe(
    'Search unavailable.',
  );
  expect(failedRoot.querySelector('.gssc-search-page__results')).toBeNull();
});
// @relation(GSSC-PLLR-363, scope=range_end, role=Test)

// @relation(GSSC-PLLR-364, scope=range_start, role=Test)
test('GSSC-PLLR-364 Syntactic', async () => {
  const { root } = await setupSearchPage({ initialUrl: '/search?q=membership' });
  const page = root.querySelector('.gssc-search-page')!;
  expect(page.classList.contains('w-full')).toBe(true);
  const controls = root.querySelector('.gssc-search-page__controls')!;
  const results = root.querySelector('.gssc-search-page__results')!;
  expect(
    controls.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(root.querySelector('.gssc-search-page__query')).not.toBeNull();
  expect(root.querySelector('.gssc-search-page__kind')).not.toBeNull();
});
// @relation(GSSC-PLLR-364, scope=range_end, role=Test)

// @relation(GSSC-PLLR-365, scope=range_start, role=Test)
test('GSSC-PLLR-365 Lexical', async () => {
  const { root } = await setupSearchPage();
  const page = root.querySelector('.gssc-search-page')!;
  expect(page.classList.contains('bg-gssc-white')).toBe(true);
  expect(page.classList.contains('font-sans')).toBe(true);
  const heading = root.querySelector('.gssc-search-page__heading')!;
  expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-365, scope=range_end, role=Test)

// @relation(GSSC-PLLR-366, scope=range_start, role=Test)
test('GSSC-PLLR-366 Semantic', async () => {
  const { fixture, root, router, calls } = await setupSearchPage({
    initialUrl: '/search',
  });
  const input = root.querySelector<HTMLInputElement>('.gssc-search-page__query')!;
  input.value = 'library';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  root.querySelector<HTMLFormElement>('.gssc-search-page__controls')!.requestSubmit();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toContain('q=library');
  expect(calls.some((call) => call.q === 'library')).toBe(true);
});
// @relation(GSSC-PLLR-366, scope=range_end, role=Test)

// @relation(GSSC-PLLR-367, scope=range_start, role=Test)
test('GSSC-PLLR-367 Syntactic', async () => {
  const { root } = await setupSearchPage();
  const query = root.querySelector('.gssc-search-page__query')!;
  expect(query.getAttribute('type')).toBe('search');
  expect(query.classList.contains('w-full')).toBe(true);
  expect(
    root
      .querySelector('.gssc-search-page__controls')!
      .contains(query),
  ).toBe(true);
});
// @relation(GSSC-PLLR-367, scope=range_end, role=Test)

// @relation(GSSC-PLLR-368, scope=range_start, role=Test)
test('GSSC-PLLR-368 Lexical', async () => {
  const { root } = await setupSearchPage();
  const query = root.querySelector('.gssc-search-page__query')!;
  expect(query.classList.contains('font-sans')).toBe(true);
  expect(query.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(query.classList.contains('bg-gssc-white')).toBe(true);
  expect(query.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-368, scope=range_end, role=Test)

// @relation(GSSC-PLLR-369, scope=range_start, role=Test)
test('GSSC-PLLR-369 Semantic', async () => {
  const { fixture, root, calls } = await setupSearchPage({
    initialUrl: '/search?q=membership',
  });
  const select = root.querySelector<HTMLSelectElement>('.gssc-search-page__kind')!;
  select.value = 'announcement';
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(calls.some((call) => call.kind === 'announcement')).toBe(true);
  expect(root.querySelectorAll('.gssc-search-page__result').length).toBe(1);
  expect(textContent(root, '.gssc-search-page__result-title')).toBe(
    'Library Hours',
  );
});
// @relation(GSSC-PLLR-369, scope=range_end, role=Test)

// @relation(GSSC-PLLR-370, scope=range_start, role=Test)
test('GSSC-PLLR-370 Syntactic', async () => {
  const { root } = await setupSearchPage();
  const controls = root.querySelector('.gssc-search-page__controls')!;
  const kind = root.querySelector('.gssc-search-page__kind')!;
  expect(controls.contains(kind)).toBe(true);
  expect(kind.tagName).toBe('SELECT');
});
// @relation(GSSC-PLLR-370, scope=range_end, role=Test)

// @relation(GSSC-PLLR-371, scope=range_start, role=Test)
test('GSSC-PLLR-371 Lexical', async () => {
  const { root } = await setupSearchPage();
  const kind = root.querySelector('.gssc-search-page__kind')!;
  expect(kind.classList.contains('font-sans')).toBe(true);
  expect(kind.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(kind.classList.contains('bg-gssc-white')).toBe(true);
  expect(kind.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-371, scope=range_end, role=Test)

// @relation(GSSC-PLLR-372, scope=range_start, role=Test)
test('GSSC-PLLR-372 Semantic', async () => {
  const { root } = await setupSearchPage({ initialUrl: '/search?q=membership' });
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-search-page__result-title'),
  ];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'Membership',
    'Library Hours',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/membership',
    '/announcements/1',
  ]);
  expect(textContent(root, '.gssc-search-page__result-snippet')).toContain(
    'Join the society',
  );
});
// @relation(GSSC-PLLR-372, scope=range_end, role=Test)

// @relation(GSSC-PLLR-373, scope=range_start, role=Test)
test('GSSC-PLLR-373 Syntactic', async () => {
  const { root } = await setupSearchPage({ initialUrl: '/search?q=membership' });
  const results = root.querySelector('.gssc-search-page__results')!;
  const first = results.querySelector('.gssc-search-page__result')!;
  expect(first.tagName).toBe('LI');
  expect(
    root
      .querySelector('.gssc-search-page__controls')!
      .compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-373, scope=range_end, role=Test)

// @relation(GSSC-PLLR-374, scope=range_start, role=Test)
test('GSSC-PLLR-374 Lexical', async () => {
  const { root } = await setupSearchPage({ initialUrl: '/search?q=membership' });
  const title = root.querySelector('.gssc-search-page__result-title')!;
  const snippet = root.querySelector('.gssc-search-page__result-snippet')!;
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(title.classList.contains('underline')).toBe(true);
  expect(snippet.classList.contains('font-sans')).toBe(true);
  expect(snippet.classList.contains('text-gssc-dark-brown')).toBe(true);
});
// @relation(GSSC-PLLR-374, scope=range_end, role=Test)
