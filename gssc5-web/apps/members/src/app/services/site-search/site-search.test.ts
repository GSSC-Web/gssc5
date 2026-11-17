import { TestBed } from '@angular/core/testing';
import {
  PAGE_SEARCH_LIMIT,
  QUICK_SEARCH_LIMIT,
  SITE_SEARCH_GET,
  SITE_SEARCH_KINDS,
  type SiteSearchGet,
  type SiteSearchResult,
} from './site-search';

const sample: SiteSearchResult[] = [
  {
    title: 'Directory',
    snippet: 'Member directory',
    href: '/directory',
    kind: 'site-tree',
  },
];

test('SITE_SEARCH_GET token resolves injectable search function', async () => {
  const get: SiteSearchGet = async () => sample;
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    providers: [{ provide: SITE_SEARCH_GET, useValue: get }],
  }).compileComponents();
  const injected = TestBed.inject(SITE_SEARCH_GET);
  await expect(injected({ q: 'dir', limit: QUICK_SEARCH_LIMIT })).resolves.toEqual(
    sample,
  );
});

test('site search constants cover quick and page limits and known kinds', () => {
  expect(QUICK_SEARCH_LIMIT).toBe(5);
  expect(PAGE_SEARCH_LIMIT).toBe(50);
  expect(SITE_SEARCH_KINDS).toContain('directory');
  expect(SITE_SEARCH_KINDS).toContain('site-tree');
});
