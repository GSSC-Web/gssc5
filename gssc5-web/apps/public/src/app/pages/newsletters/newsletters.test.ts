import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { nativeElement, textContent } from '../../../test-harness';
import { filesApiUrl, type NewsletterCatalogEntry } from './newsletter-catalog';
import {
  NEWSLETTER_CATALOG_GET,
  NEWSLETTER_FILE_RESOLVE,
  NEWSLETTER_SECTION_LIST_BY_TAG,
  NewslettersPage,
  type NewsletterSectionListEntry,
} from './newsletters';

const fixtureCatalog: NewsletterCatalogEntry[] = [
  {
    cuid: 'nl-v5-n3',
    volume: 5,
    number: 3,
    month: 3,
    year: 2025,
    filePath: 'file-2025-03',
    keywords: ['spring'],
  },
  {
    cuid: 'nl-v5-n1',
    volume: 5,
    number: 1,
    month: 1,
    year: 2025,
    filePath: 'file-2025-01',
    keywords: ['winter'],
  },
  {
    cuid: 'nl-v4-n11',
    volume: 4,
    number: 11,
    month: 11,
    year: 2024,
    filePath: 'file-2024-11',
    keywords: ['autumn'],
  },
  {
    cuid: 'nl-v3-n6',
    volume: 3,
    number: 6,
    month: 6,
    year: 2023,
    filePath: 'file-2023-06',
    keywords: ['summer'],
  },
];

const fixtureIntro: NewsletterSectionListEntry[] = [
  {
    cuid: 'intro-b',
    header: 'Second',
    body: 'b',
    tags: ['newsletter'],
    index: 2,
  },
  {
    cuid: 'intro-a',
    header: 'First',
    body: 'a',
    tags: ['newsletter'],
    index: 1,
  },
];

function blobUrlFor(fileRef: string): string {
  return `blob:newsletter-test/${fileRef}`;
}

async function setupNewslettersPage(
  catalog: NewsletterCatalogEntry[] = fixtureCatalog,
  options: {
    deniedRefs?: Set<string>;
    intro?: NewsletterSectionListEntry[];
    query?: Record<string, string>;
  } = {},
) {
  TestBed.resetTestingModule();
  const denied = options.deniedRefs ?? new Set<string>();
  const resolveCalls: string[] = [];
  const fileResolve = async (fileRef: string) => {
    resolveCalls.push(fileRef);
    if (denied.has(fileRef)) return null;
    return blobUrlFor(fileRef);
  };
  const navigations: Array<Record<string, string>> = [];

  await TestBed.configureTestingModule({
    imports: [NewslettersPage],
    providers: [
      provideRouter([{ path: '**', component: NewslettersPage }]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(options.query ?? {}),
          },
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: async (
            _commands: unknown,
            extras?: { queryParams?: Record<string, string> },
          ) => {
            navigations.push(extras?.queryParams ?? {});
            return true;
          },
        },
      },
      { provide: NEWSLETTER_CATALOG_GET, useValue: async () => catalog },
      {
        provide: NEWSLETTER_SECTION_LIST_BY_TAG,
        useValue: async () => options.intro ?? fixtureIntro,
      },
      { provide: NEWSLETTER_FILE_RESOLVE, useValue: fileResolve },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(NewslettersPage);
  const page = fixture.componentInstance;
  await settle(fixture, page);

  return {
    fixture,
    root: nativeElement(fixture),
    page,
    resolveCalls,
    navigations,
  };
}

async function settle(
  fixture: { detectChanges: () => void; whenStable: () => Promise<void> },
  page?: NewslettersPage,
) {
  fixture.detectChanges();
  await fixture.whenStable();
  for (let i = 0; i < 25; i++) {
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
    if (!page) continue;
    const ref = page.selectedFilePath();
    const url = page.selectedFileUrl();
    if (ref === null && url === null) break;
    if (ref !== null && (url !== null || i > 5)) {
      if (url !== null || i >= 8) break;
    }
  }
  fixture.detectChanges();
  await fixture.whenStable();
}

function volumeSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelector('[data-testid="newsletter-volume"]')!;
}

function numberSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelector('[data-testid="newsletter-number"]')!;
}

function yearSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelector('[data-testid="newsletter-year"]')!;
}

function monthSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelector('[data-testid="newsletter-month"]')!;
}

function setSelectValue(
  select: HTMLSelectElement,
  value: string,
  fixture: { detectChanges: () => void; whenStable: () => Promise<void> },
  page?: NewslettersPage,
): Promise<void> {
  select.value = value;
  select.dispatchEvent(new Event('change'));
  return settle(fixture, page);
}

test('filesApiUrl maps cuid and /files paths to Unified Backend GET', () => {
  expect(filesApiUrl('file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('/files/file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('https://cdn.example/x.pdf')).toBe('https://cdn.example/x.pdf');
});

// @relation(GSSC-PLLR-207, scope=range_start, role=Test)
test('GSSC-PLLR-207 Semantic Selection Form', async () => {
  const { root, page, navigations } = await setupNewslettersPage();

  expect(root.querySelector('.gssc-newsletters-form')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-mode')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-volume')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-number')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-current-year')).toBeNull();
  expect(root.querySelector('.gssc-newsletters-search')).toBeNull();

  expect(page.selected()?.cuid).toBe('nl-v5-n3');
  expect(page.selectionMode()).toBe('volume-number');
  expect(navigations.at(-1)).toEqual({ cuid: 'nl-v5-n3' });
});
// @relation(GSSC-PLLR-207, scope=range_end, role=Test)

test('GSSC-PLLR-207 query cuid deep-link selects catalog entry', async () => {
  const { page } = await setupNewslettersPage(fixtureCatalog, {
    query: { cuid: 'nl-v4-n11' },
  });
  expect(page.selected()?.cuid).toBe('nl-v4-n11');
  expect(page.selectionMode()).toBe('volume-number');
});

test('GSSC-PLLR-207 query volume+number deep-link selects catalog entry', async () => {
  const { page } = await setupNewslettersPage(fixtureCatalog, {
    query: { volume: '3', number: '6' },
  });
  expect(page.selected()?.cuid).toBe('nl-v3-n6');
  expect(page.selectionMode()).toBe('volume-number');
});

test('GSSC-PLLR-207 query year+month deep-link selects and sets month-year mode', async () => {
  const { page, root } = await setupNewslettersPage(fixtureCatalog, {
    query: { year: '2024', month: '11' },
  });
  expect(page.selected()?.cuid).toBe('nl-v4-n11');
  expect(page.selectionMode()).toBe('month-year');
  expect(root.querySelector('[data-testid="newsletter-month"]')).not.toBeNull();
  expect(root.querySelector('[data-testid="newsletter-year"]')).not.toBeNull();
});

test('GSSC-PLLR-207 invalid query falls back to newest', async () => {
  const { page } = await setupNewslettersPage(fixtureCatalog, {
    query: { cuid: 'missing' },
  });
  expect(page.selected()?.cuid).toBe('nl-v5-n3');
});

// @relation(GSSC-PLLR-208, scope=range_start, role=Test)
test('GSSC-PLLR-208 Syntactic Selection Form', async () => {
  const { root } = await setupNewslettersPage();
  const intro = root.querySelector('.gssc-newsletters-intro')!;
  const form = root.querySelector('.gssc-newsletters-form')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;
  const download = root.querySelector('.gssc-newsletters-download')!;

  expect(intro.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(form.querySelector('.gssc-newsletters-mode')).not.toBeNull();
  expect(form.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(form.compareDocumentPosition(download) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-208, scope=range_end, role=Test)

// @relation(GSSC-PLLR-209, scope=range_start, role=Test)
test('GSSC-PLLR-209 Lexical Selection Form', async () => {
  const { root } = await setupNewslettersPage();
  const form = root.querySelector<HTMLElement>('.gssc-newsletters-form')!;

  expect(form.classList.contains('font-sans')).toBe(true);
  expect(form.classList.contains('bg-gssc-white')).toBe(true);
  expect(form.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(form.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-209, scope=range_end, role=Test)

// @relation(GSSC-PLLR-210, scope=range_start, role=Test)
test('GSSC-PLLR-210 Semantic Volume Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const select = volumeSelect(root);
  expect([...select.options].map((opt) => opt.value)).toEqual(['5', '4', '3']);

  await setSelectValue(select, '4', fixture, page);
  expect(page.selected()?.cuid).toBe('nl-v4-n11');
  expect(page.selectedVolume()).toBe(4);
});
// @relation(GSSC-PLLR-210, scope=range_end, role=Test)

// @relation(GSSC-PLLR-211, scope=range_start, role=Test)
test('GSSC-PLLR-211 Syntactic Volume Menu', async () => {
  const { root } = await setupNewslettersPage();
  const menu = root.querySelector('.gssc-newsletters-volume')!;
  const form = root.querySelector('.gssc-newsletters-form')!;
  const number = root.querySelector('.gssc-newsletters-number')!;

  expect(form.contains(menu)).toBe(true);
  expect(menu.querySelector('select.gssc-newsletters-volume__control')).not.toBeNull();
  expect(textContent(menu, '.gssc-newsletters-volume__label')).toBe('Volume');
  expect(
    menu.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING ||
      number.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-211, scope=range_end, role=Test)

// @relation(GSSC-PLLR-212, scope=range_start, role=Test)
test('GSSC-PLLR-212 Lexical Volume Menu', async () => {
  const { root } = await setupNewslettersPage();
  const menu = root.querySelector<HTMLElement>('.gssc-newsletters-volume')!;
  const control = root.querySelector<HTMLElement>('.gssc-newsletters-volume__control')!;

  expect(menu.classList.contains('font-sans')).toBe(true);
  expect(menu.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('bg-gssc-white')).toBe(true);
  expect(control.classList.contains('border-gssc-gray')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-212, scope=range_end, role=Test)

// @relation(GSSC-PLLR-213, scope=range_start, role=Test)
test('GSSC-PLLR-213 Semantic Number Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();

  expect([...numberSelect(root).options].map((opt) => opt.value)).toEqual(['1', '3']);
  await setSelectValue(numberSelect(root), '1', fixture, page);
  expect(page.selected()?.cuid).toBe('nl-v5-n1');
});
// @relation(GSSC-PLLR-213, scope=range_end, role=Test)

// @relation(GSSC-PLLR-214, scope=range_start, role=Test)
test('GSSC-PLLR-214 Syntactic Number Menu', async () => {
  const { root } = await setupNewslettersPage();
  const menu = root.querySelector('.gssc-newsletters-number')!;
  const form = root.querySelector('.gssc-newsletters-form')!;

  expect(form.contains(menu)).toBe(true);
  expect(menu.querySelector('select.gssc-newsletters-number__control')).not.toBeNull();
  expect(textContent(menu, '.gssc-newsletters-number__label')).toBe('Number');
});
// @relation(GSSC-PLLR-214, scope=range_end, role=Test)

// @relation(GSSC-PLLR-215, scope=range_start, role=Test)
test('GSSC-PLLR-215 Lexical Number Menu', async () => {
  const { root } = await setupNewslettersPage();
  const menu = root.querySelector<HTMLElement>('.gssc-newsletters-number')!;
  const control = root.querySelector<HTMLElement>('.gssc-newsletters-number__control')!;

  expect(menu.classList.contains('font-sans')).toBe(true);
  expect(menu.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('bg-gssc-white')).toBe(true);
  expect(control.classList.contains('border-gssc-gray')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-215, scope=range_end, role=Test)

// @relation(GSSC-PLLR-216, scope=range_start, role=Test)
test('GSSC-PLLR-216 Semantic Month Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  expect([...monthSelect(root).options].map((opt) => opt.textContent?.trim())).toEqual([
    'January',
    'March',
  ]);
  await setSelectValue(monthSelect(root), '1', fixture, page);
  expect(page.selected()?.cuid).toBe('nl-v5-n1');
});
// @relation(GSSC-PLLR-216, scope=range_end, role=Test)

// @relation(GSSC-PLLR-217, scope=range_start, role=Test)
test('GSSC-PLLR-217 Syntactic Month Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  const menu = root.querySelector('.gssc-newsletters-month')!;
  const form = root.querySelector('.gssc-newsletters-form')!;
  expect(form.contains(menu)).toBe(true);
  expect(menu.querySelector('select.gssc-newsletters-month__control')).not.toBeNull();
  expect(textContent(menu, '.gssc-newsletters-month__label')).toBe('Month');
});
// @relation(GSSC-PLLR-217, scope=range_end, role=Test)

// @relation(GSSC-PLLR-218, scope=range_start, role=Test)
test('GSSC-PLLR-218 Lexical Month Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  const menu = root.querySelector<HTMLElement>('.gssc-newsletters-month')!;
  const control = root.querySelector<HTMLElement>('.gssc-newsletters-month__control')!;
  expect(menu.classList.contains('font-sans')).toBe(true);
  expect(menu.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('bg-gssc-white')).toBe(true);
  expect(control.classList.contains('border-gssc-gray')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-218, scope=range_end, role=Test)

// @relation(GSSC-PLLR-219, scope=range_start, role=Test)
test('GSSC-PLLR-219 Semantic Year Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  expect([...yearSelect(root).options].map((opt) => opt.value)).toEqual([
    '2025',
    '2024',
    '2023',
  ]);
  await setSelectValue(yearSelect(root), '2024', fixture, page);
  expect(page.selected()?.cuid).toBe('nl-v4-n11');
});
// @relation(GSSC-PLLR-219, scope=range_end, role=Test)

// @relation(GSSC-PLLR-220, scope=range_start, role=Test)
test('GSSC-PLLR-220 Syntactic Year Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  const menu = root.querySelector('.gssc-newsletters-year')!;
  const form = root.querySelector('.gssc-newsletters-form')!;
  expect(form.contains(menu)).toBe(true);
  expect(textContent(menu, '.gssc-newsletters-year__label')).toBe('Year');
});
// @relation(GSSC-PLLR-220, scope=range_end, role=Test)

// @relation(GSSC-PLLR-221, scope=range_start, role=Test)
test('GSSC-PLLR-221 Lexical Year Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  page.setSelectionMode('month-year');
  await settle(fixture, page);

  const control = root.querySelector<HTMLElement>('.gssc-newsletters-year__control')!;
  expect(control.classList.contains('bg-gssc-white')).toBe(true);
  expect(control.classList.contains('border-gssc-gray')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-221, scope=range_end, role=Test)

// @relation(GSSC-PLLR-222, scope=range_start, role=Test)
test('GSSC-PLLR-222 Semantic Selection Mode Toggle', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const before = page.selected()?.cuid;
  page.setSelectionMode('month-year');
  await settle(fixture, page);
  expect(page.selected()?.cuid).toBe(before);
  expect(root.querySelector('[data-testid="newsletter-month"]')).not.toBeNull();
  expect(root.querySelector('[data-testid="newsletter-volume"]')).toBeNull();

  page.setSelectionMode('volume-number');
  await settle(fixture, page);
  expect(page.selected()?.cuid).toBe(before);
  expect(root.querySelector('[data-testid="newsletter-volume"]')).not.toBeNull();
});
// @relation(GSSC-PLLR-222, scope=range_end, role=Test)

// @relation(GSSC-PLLR-223, scope=range_start, role=Test)
test('GSSC-PLLR-223 Syntactic Selection Mode Toggle', async () => {
  const { root } = await setupNewslettersPage();
  const form = root.querySelector('.gssc-newsletters-form')!;
  const mode = root.querySelector('.gssc-newsletters-mode')!;
  const menus = root.querySelector('.gssc-newsletters-menus')!;
  expect(form.contains(mode)).toBe(true);
  expect(mode.compareDocumentPosition(menus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-223, scope=range_end, role=Test)

// @relation(GSSC-PLLR-224, scope=range_start, role=Test)
test('GSSC-PLLR-224 Lexical Selection Mode Toggle', async () => {
  const { root } = await setupNewslettersPage();
  const mode = root.querySelector<HTMLElement>('.gssc-newsletters-mode')!;
  const option = root.querySelector<HTMLElement>('.gssc-newsletters-mode__option')!;
  expect(mode.classList.contains('font-sans')).toBe(true);
  expect(mode.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(option.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-224, scope=range_end, role=Test)

// @relation(GSSC-PLLR-225, scope=range_start, role=Test)
test('GSSC-PLLR-225 Semantic Preview', async () => {
  const { root, page, fixture, resolveCalls } = await setupNewslettersPage();

  expect(page.selectedFilePath()).toBe('file-2025-03');
  expect(resolveCalls[0]).toBe('file-2025-03');
  expect(page.selectedFileUrl()).toBe(blobUrlFor('file-2025-03'));
  expect(root.querySelector('[data-testid="newsletter-preview"]')).not.toBeNull();

  await setSelectValue(numberSelect(root), '1', fixture, page);
  expect(page.selectedFilePath()).toBe('file-2025-01');
  expect(page.selectedFileUrl()).toBe(blobUrlFor('file-2025-01'));
});
// @relation(GSSC-PLLR-225, scope=range_end, role=Test)

// @relation(GSSC-PLLR-226, scope=range_start, role=Test)
test('GSSC-PLLR-226 Syntactic Preview', async () => {
  const { root } = await setupNewslettersPage();
  const form = root.querySelector('.gssc-newsletters-form')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;
  expect(form.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-226, scope=range_end, role=Test)

// @relation(GSSC-PLLR-227, scope=range_start, role=Test)
test('GSSC-PLLR-227 Lexical Preview', async () => {
  const { root } = await setupNewslettersPage();
  const preview = root.querySelector<HTMLElement>('.gssc-newsletters-preview')!;
  expect(preview.classList.contains('bg-gssc-white')).toBe(true);
  expect(preview.classList.contains('border-gssc-gray')).toBe(true);
  expect(preview.classList.contains('min-h-96')).toBe(true);
});
// @relation(GSSC-PLLR-227, scope=range_end, role=Test)

// @relation(GSSC-PLLR-252, scope=range_start, role=Test)
test('GSSC-PLLR-252 Semantic Download', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const download = root.querySelector<HTMLAnchorElement>('[data-testid="newsletter-download"]')!;
  expect(download.getAttribute('href')).toBe(blobUrlFor('file-2025-03'));
  expect(download.hasAttribute('download')).toBe(true);

  await setSelectValue(volumeSelect(root), '4', fixture, page);
  expect(
    root
      .querySelector<HTMLAnchorElement>('[data-testid="newsletter-download"]')!
      .getAttribute('href'),
  ).toBe(blobUrlFor('file-2024-11'));
});
// @relation(GSSC-PLLR-252, scope=range_end, role=Test)

// @relation(GSSC-PLLR-253, scope=range_start, role=Test)
test('GSSC-PLLR-253 Syntactic Download', async () => {
  const { root } = await setupNewslettersPage();
  const download = root.querySelector('.gssc-newsletters-download')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;
  const selected = root.querySelector('.gssc-newsletters-selected')!;
  expect(selected.contains(download)).toBe(true);
  expect(selected.contains(preview)).toBe(true);
});
// @relation(GSSC-PLLR-253, scope=range_end, role=Test)

// @relation(GSSC-PLLR-254, scope=range_start, role=Test)
test('GSSC-PLLR-254 Lexical Download', async () => {
  const { root } = await setupNewslettersPage();
  const download = root.querySelector<HTMLElement>('.gssc-newsletters-download')!;
  expect(download.classList.contains('font-sans')).toBe(true);
  expect(download.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(download.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(download.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-254, scope=range_end, role=Test)

// @relation(GSSC-PLLR-255, scope=range_start, role=Test)
test('GSSC-PLLR-255 Semantic Intro Sections', async () => {
  const { root } = await setupNewslettersPage();
  const intro = root.querySelector('.gssc-newsletters-intro')!;
  const cuids = [...intro.querySelectorAll('gssc-section-from-cuid')].map((el) =>
    el.getAttribute('ng-reflect-cuid'),
  );
  // Angular may not always expose ng-reflect; assert count + order via component state.
  expect(intro.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
});
// @relation(GSSC-PLLR-255, scope=range_end, role=Test)

// @relation(GSSC-PLLR-256, scope=range_start, role=Test)
test('GSSC-PLLR-256 Syntactic Intro Sections', async () => {
  const { root, page } = await setupNewslettersPage();
  expect(page.introCuids()).toEqual(['intro-a', 'intro-b']);
  const intro = root.querySelector('.gssc-newsletters-intro')!;
  const form = root.querySelector('.gssc-newsletters-form')!;
  expect(intro.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const empty = await setupNewslettersPage(fixtureCatalog, { intro: [] });
  expect(empty.root.querySelector('.gssc-newsletters-intro')).toBeNull();
});
// @relation(GSSC-PLLR-256, scope=range_end, role=Test)

// @relation(GSSC-PLLR-257, scope=range_start, role=Test)
test('GSSC-PLLR-257 Lexical Intro Sections', async () => {
  const { root } = await setupNewslettersPage();
  const intro = root.querySelector('.gssc-newsletters-intro')!;
  expect(intro.querySelector('gssc-section-from-cuid')).not.toBeNull();
  // No independent lexical chrome beyond Section From CUID hosts.
  expect(intro.className.includes('border-gssc')).toBe(false);
});
// @relation(GSSC-PLLR-257, scope=range_end, role=Test)

test('preview and download omit when /files denies ACL or soft-deleted file', async () => {
  const { root, page } = await setupNewslettersPage(fixtureCatalog, {
    deniedRefs: new Set(['file-2025-03']),
  });

  expect(page.selectedFilePath()).toBe('file-2025-03');
  expect(page.selectedFileUrl()).toBeNull();
  expect(root.querySelector('[data-testid="newsletter-preview"]')).toBeNull();
  expect(root.querySelector('[data-testid="newsletter-download"]')).toBeNull();
});
