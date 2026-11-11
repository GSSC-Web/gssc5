import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { filesApiUrl, type NewsletterCatalogEntry } from './newsletter-catalog';
import {
  NEWSLETTER_CATALOG_GET,
  NEWSLETTER_CURRENT_YEAR,
  NEWSLETTER_FILE_RESOLVE,
  NewslettersPage,
} from './newsletters';

const FROZEN_YEAR = 2025;

/** Catalog resources are stored-file cuids (GSSC5-71 /files/{cuid}). */
const fixtureCatalog: NewsletterCatalogEntry[] = [
  {
    cuid: 'nl-2025-03',
    header: 'March 2025 Newsletter',
    body: 'Spring issue',
    tags: ['newsletter', 'year-2025', 'month-03'],
    index: 2,
    resources: ['file-2025-03'],
  },
  {
    cuid: 'nl-2025-01',
    header: 'January 2025 Newsletter',
    body: 'Winter issue',
    tags: ['newsletter', 'year-2025', 'month-01'],
    index: 1,
    resources: ['file-2025-01'],
  },
  {
    cuid: 'nl-2024-11',
    header: 'November 2024 Newsletter',
    body: 'Autumn archive',
    tags: ['newsletter', 'year-2024', 'month-11'],
    index: 3,
    resources: ['file-2024-11'],
  },
  {
    cuid: 'nl-2023-06',
    header: 'June 2023 Newsletter',
    body: 'Older summer',
    tags: ['newsletter', 'year-2023', 'month-06'],
    index: 4,
    resources: ['file-2023-06'],
  },
];

function blobUrlFor(fileRef: string): string {
  return `blob:newsletter-test/${fileRef}`;
}

async function setupNewslettersPage(
  catalog: NewsletterCatalogEntry[] = fixtureCatalog,
  currentYear = FROZEN_YEAR,
  options: {
    /** File refs that resolve to null (ACL deny / soft-delete / missing). */
    deniedRefs?: Set<string>;
    fileResolve?: (fileRef: string) => Promise<string | null>;
  } = {},
) {
  TestBed.resetTestingModule();
  const denied = options.deniedRefs ?? new Set<string>();
  const resolveCalls: string[] = [];
  const fileResolve =
    options.fileResolve ??
    (async (fileRef: string) => {
      resolveCalls.push(fileRef);
      if (denied.has(fileRef)) return null;
      return blobUrlFor(fileRef);
    });

  await TestBed.configureTestingModule({
    imports: [NewslettersPage],
    providers: [
      { provide: NEWSLETTER_CURRENT_YEAR, useValue: currentYear },
      { provide: NEWSLETTER_CATALOG_GET, useValue: async () => catalog },
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
  };
}

async function settle(
  fixture: { detectChanges: () => void; whenStable: () => Promise<void> },
  page?: NewslettersPage,
) {
  fixture.detectChanges();
  await fixture.whenStable();
  // File resolve runs in an effect + Promise; flush until the URL settles.
  for (let i = 0; i < 25; i++) {
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
    if (!page) continue;
    const ref = page.selectedFileRef();
    const url = page.selectedFileUrl();
    if (ref === null && url === null) break;
    if (ref !== null && (url !== null || i > 5)) {
      // After a few turns, accept null URL as ACL/soft-delete denial.
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

function setSelectValue(
  select: HTMLSelectElement,
  value: string,
  fixture: { detectChanges: () => void; whenStable: () => Promise<void> },
): Promise<void> {
  select.value = value;
  select.dispatchEvent(new Event('change'));
  return settle(fixture);
}

test('filesApiUrl maps cuid and /files paths to Unified Backend GET', () => {
  expect(filesApiUrl('file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('/files/file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('https://cdn.example/x.pdf')).toBe('https://cdn.example/x.pdf');
});

// @relation(GSSC-PLLR-207, scope=range_start, role=Test)
test('GSSC-PLLR-207 Semantic Selection Form', async () => {
  const { root, page } = await setupNewslettersPage();

  expect(root.querySelector('.gssc-newsletters-form')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-volume')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-number')).not.toBeNull();
  expect(root.querySelector('.gssc-newsletters-current-year')).not.toBeNull();

  expect(page.selected()?.cuid).toBe('nl-2025-03');
  expect(page.selectedYear()).toBe(2025);
  expect(page.selectedMonth()).toBe(3);
});
// @relation(GSSC-PLLR-207, scope=range_end, role=Test)

// @relation(GSSC-PLLR-208, scope=range_start, role=Test)
test('GSSC-PLLR-208 Syntactic Selection Form', async () => {
  const { root } = await setupNewslettersPage();
  const form = root.querySelector('.gssc-newsletters-form')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;
  const download = root.querySelector('.gssc-newsletters-download')!;

  expect(form.querySelector('.gssc-newsletters-volume')).not.toBeNull();
  expect(form.querySelector('.gssc-newsletters-number')).not.toBeNull();
  expect(form.querySelector('.gssc-newsletters-current-year')).not.toBeNull();
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
test('GSSC-PLLR-210 Semantic Current Year List', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const items = [
    ...root.querySelectorAll('.gssc-newsletters-current-year__entry'),
  ];

  expect(items.map((el) => el.textContent?.trim())).toEqual([
    'January 2025 Newsletter',
    'March 2025 Newsletter',
  ]);

  (items[0] as HTMLButtonElement).click();
  await settle(fixture);
  expect(page.selected()?.cuid).toBe('nl-2025-01');
});
// @relation(GSSC-PLLR-210, scope=range_end, role=Test)

// @relation(GSSC-PLLR-211, scope=range_start, role=Test)
test('GSSC-PLLR-211 Syntactic Current Year List', async () => {
  const { root } = await setupNewslettersPage();
  const list = root.querySelector('.gssc-newsletters-current-year')!;
  const form = root.querySelector('.gssc-newsletters-form')!;

  expect(form.contains(list)).toBe(true);
  expect(list.querySelector('.gssc-newsletters-current-year__list')).not.toBeNull();
});
// @relation(GSSC-PLLR-211, scope=range_end, role=Test)

// @relation(GSSC-PLLR-212, scope=range_start, role=Test)
test('GSSC-PLLR-212 Lexical Current Year List', async () => {
  const { root } = await setupNewslettersPage();
  const selected = root.querySelector<HTMLElement>(
    '.gssc-newsletters-current-year__entry.bg-gssc-gray',
  )!;
  const other = root.querySelector<HTMLElement>(
    '.gssc-newsletters-current-year__entry.bg-transparent',
  )!;

  expect(selected.classList.contains('font-sans')).toBe(true);
  expect(selected.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(selected.classList.contains('bg-gssc-gray')).toBe(true);
  expect(other.classList.contains('font-sans')).toBe(true);
  expect(other.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-212, scope=range_end, role=Test)

// @relation(GSSC-PLLR-213, scope=range_start, role=Test)
test('GSSC-PLLR-213 Semantic Volume Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const select = volumeSelect(root);
  const options = [...select.options].map((opt) => opt.value);

  expect(options).toEqual(['2025', '2024', '2023']);

  await setSelectValue(select, '2024', fixture);
  expect(page.selectedYear()).toBe(2024);
  expect(page.numberMonths()).toEqual([11]);
  expect(page.selected()?.cuid).toBe('nl-2024-11');
});
// @relation(GSSC-PLLR-213, scope=range_end, role=Test)

// @relation(GSSC-PLLR-214, scope=range_start, role=Test)
test('GSSC-PLLR-214 Syntactic Volume Menu', async () => {
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
// @relation(GSSC-PLLR-214, scope=range_end, role=Test)

// @relation(GSSC-PLLR-215, scope=range_start, role=Test)
test('GSSC-PLLR-215 Lexical Volume Menu', async () => {
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
// @relation(GSSC-PLLR-215, scope=range_end, role=Test)

// @relation(GSSC-PLLR-216, scope=range_start, role=Test)
test('GSSC-PLLR-216 Semantic Number Menu', async () => {
  const { root, page, fixture } = await setupNewslettersPage();

  expect(page.numberMonths()).toEqual([1, 3]);
  expect([...numberSelect(root).options].map((opt) => opt.textContent?.trim())).toEqual([
    'January',
    'March',
  ]);

  await setSelectValue(numberSelect(root), '1', fixture);
  expect(page.selected()?.cuid).toBe('nl-2025-01');
});
// @relation(GSSC-PLLR-216, scope=range_end, role=Test)

// @relation(GSSC-PLLR-217, scope=range_start, role=Test)
test('GSSC-PLLR-217 Syntactic Number Menu', async () => {
  const { root } = await setupNewslettersPage();
  const menu = root.querySelector('.gssc-newsletters-number')!;
  const form = root.querySelector('.gssc-newsletters-form')!;

  expect(form.contains(menu)).toBe(true);
  expect(menu.querySelector('select.gssc-newsletters-number__control')).not.toBeNull();
  expect(textContent(menu, '.gssc-newsletters-number__label')).toBe('Number');
});
// @relation(GSSC-PLLR-217, scope=range_end, role=Test)

// @relation(GSSC-PLLR-218, scope=range_start, role=Test)
test('GSSC-PLLR-218 Lexical Number Menu', async () => {
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
// @relation(GSSC-PLLR-218, scope=range_end, role=Test)

// @relation(GSSC-PLLR-219, scope=range_start, role=Test)
test('GSSC-PLLR-219 Semantic Preview', async () => {
  const { root, page, fixture, resolveCalls } = await setupNewslettersPage();

  expect(page.selectedFileRef()).toBe('file-2025-03');
  expect(resolveCalls[0]).toBe('file-2025-03');
  expect(page.selectedFileUrl()).toBe(blobUrlFor('file-2025-03'));
  expect(root.querySelector('[data-testid="newsletter-preview"]')).not.toBeNull();

  const january = [
    ...root.querySelectorAll<HTMLButtonElement>('.gssc-newsletters-current-year__entry'),
  ].find((el) => el.textContent?.includes('January'))!;
  january.click();
  await settle(fixture);
  expect(page.selectedFileRef()).toBe('file-2025-01');
  expect(page.selectedFileUrl()).toBe(blobUrlFor('file-2025-01'));
  expect(root.querySelector('[data-testid="newsletter-preview"]')).not.toBeNull();
});
// @relation(GSSC-PLLR-219, scope=range_end, role=Test)

// @relation(GSSC-PLLR-220, scope=range_start, role=Test)
test('GSSC-PLLR-220 Syntactic Preview', async () => {
  const { root } = await setupNewslettersPage();
  const form = root.querySelector('.gssc-newsletters-form')!;
  const search = root.querySelector('.gssc-newsletters-search')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;

  expect(preview).not.toBeNull();
  expect(form.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(search.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-220, scope=range_end, role=Test)

// @relation(GSSC-PLLR-221, scope=range_start, role=Test)
test('GSSC-PLLR-221 Lexical Preview', async () => {
  const { root } = await setupNewslettersPage();
  const preview = root.querySelector<HTMLElement>('.gssc-newsletters-preview')!;

  expect(preview.classList.contains('bg-gssc-white')).toBe(true);
  expect(preview.classList.contains('border-gssc-gray')).toBe(true);
  expect(preview.classList.contains('min-h-96')).toBe(true);
});
// @relation(GSSC-PLLR-221, scope=range_end, role=Test)

// @relation(GSSC-PLLR-222, scope=range_start, role=Test)
test('GSSC-PLLR-222 Semantic Download', async () => {
  const { root, fixture } = await setupNewslettersPage();
  const download = root.querySelector<HTMLAnchorElement>('[data-testid="newsletter-download"]')!;

  expect(download.getAttribute('href')).toBe(blobUrlFor('file-2025-03'));
  expect(download.hasAttribute('download')).toBe(true);

  await setSelectValue(volumeSelect(root), '2024', fixture);
  expect(
    root
      .querySelector<HTMLAnchorElement>('[data-testid="newsletter-download"]')!
      .getAttribute('href'),
  ).toBe(blobUrlFor('file-2024-11'));
});
// @relation(GSSC-PLLR-222, scope=range_end, role=Test)

// @relation(GSSC-PLLR-223, scope=range_start, role=Test)
test('GSSC-PLLR-223 Syntactic Download', async () => {
  const { root } = await setupNewslettersPage();
  const download = root.querySelector('.gssc-newsletters-download')!;
  const preview = root.querySelector('.gssc-newsletters-preview')!;
  const selected = root.querySelector('.gssc-newsletters-selected')!;

  expect(selected.contains(download)).toBe(true);
  expect(selected.contains(preview)).toBe(true);
});
// @relation(GSSC-PLLR-223, scope=range_end, role=Test)

// @relation(GSSC-PLLR-224, scope=range_start, role=Test)
test('GSSC-PLLR-224 Lexical Download', async () => {
  const { root } = await setupNewslettersPage();
  const download = root.querySelector<HTMLElement>('.gssc-newsletters-download')!;

  expect(download.classList.contains('font-sans')).toBe(true);
  expect(download.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(download.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(download.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-224, scope=range_end, role=Test)

// @relation(GSSC-PLLR-225, scope=range_start, role=Test)
test('GSSC-PLLR-225 Semantic Catalog Search', async () => {
  const { root, page, fixture } = await setupNewslettersPage();
  const input = root.querySelector<HTMLInputElement>('[data-testid="newsletter-search"]')!;

  input.value = 'November';
  input.dispatchEvent(new Event('input'));
  await settle(fixture);

  const results = [...root.querySelectorAll('.gssc-newsletters-search__result')];
  expect(results.map((el) => el.textContent?.trim())).toEqual([
    'November 2024 Newsletter',
  ]);

  input.value = 'March';
  input.dispatchEvent(new Event('input'));
  await settle(fixture);
  expect(root.querySelectorAll('.gssc-newsletters-search__result').length).toBe(0);

  input.value = '2023';
  input.dispatchEvent(new Event('input'));
  await settle(fixture);
  const older = root.querySelector<HTMLButtonElement>('.gssc-newsletters-search__result')!;
  older.click();
  await settle(fixture);
  expect(page.selected()?.cuid).toBe('nl-2023-06');
  expect(page.selectedFileRef()).toBe('file-2023-06');
  expect(page.selectedFileUrl()).toBe(blobUrlFor('file-2023-06'));
});
// @relation(GSSC-PLLR-225, scope=range_end, role=Test)

// @relation(GSSC-PLLR-226, scope=range_start, role=Test)
test('GSSC-PLLR-226 Syntactic Catalog Search', async () => {
  const { root } = await setupNewslettersPage();
  const search = root.querySelector('.gssc-newsletters-search')!;
  const pageRoot = root.querySelector('.gssc-newsletters-page')!;

  expect(pageRoot.contains(search)).toBe(true);
  expect(search.querySelector('.gssc-newsletters-search__field')).not.toBeNull();
  expect(search.querySelector('.gssc-newsletters-search__results')).not.toBeNull();
});
// @relation(GSSC-PLLR-226, scope=range_end, role=Test)

// @relation(GSSC-PLLR-227, scope=range_start, role=Test)
test('GSSC-PLLR-227 Lexical Catalog Search', async () => {
  const { root } = await setupNewslettersPage();
  const search = root.querySelector<HTMLElement>('.gssc-newsletters-search')!;
  const field = root.querySelector<HTMLElement>('.gssc-newsletters-search__field')!;

  expect(search.classList.contains('font-sans')).toBe(true);
  expect(search.classList.contains('bg-gssc-white')).toBe(true);
  expect(search.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(search.classList.contains('border-gssc-gray')).toBe(true);
  expect(field.classList.contains('bg-gssc-white')).toBe(true);
  expect(field.classList.contains('border-gssc-gray')).toBe(true);
  expect(field.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-227, scope=range_end, role=Test)

test('current year heading uses NEWSLETTER_CURRENT_YEAR token', async () => {
  const { root } = await setupNewslettersPage();
  expect(textContent(root, '.gssc-newsletters-current-year__heading')).toBe(
    '2025 Newsletters',
  );
});

test('preview and download omit when /files denies ACL or soft-deleted file', async () => {
  const { root, page } = await setupNewslettersPage(fixtureCatalog, FROZEN_YEAR, {
    deniedRefs: new Set(['file-2025-03']),
  });

  expect(page.selectedFileRef()).toBe('file-2025-03');
  expect(page.selectedFileUrl()).toBeNull();
  expect(root.querySelector('[data-testid="newsletter-preview"]')).toBeNull();
  expect(root.querySelector('[data-testid="newsletter-download"]')).toBeNull();
});
