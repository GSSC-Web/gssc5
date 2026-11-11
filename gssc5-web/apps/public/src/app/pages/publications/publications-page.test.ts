import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  PUBLICATIONS_LIST_GET,
  PublicationsPage,
  type PublicationEntry,
} from './publications-page';

const samplePublications: PublicationEntry[] = [
  {
    cuid: 'pub_cooking',
    title: 'The Cooking Gene',
    referenceLink: '/documents/cooking-gene.pdf',
    description: 'Presented courtesy of the Cookbook Committee',
  },
  {
    cuid: 'pub_register',
    title: 'The 1890 Great Register',
    referenceLink: 'https://example.org/great-register.pdf',
    description: null,
  },
];

async function setupPublicationsPage(
  listGet: () => Promise<PublicationEntry[] | null>,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [PublicationsPage],
    providers: [{ provide: PUBLICATIONS_LIST_GET, useValue: listGet }],
  }).compileComponents();
  const fixture = TestBed.createComponent(PublicationsPage);
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

// @relation(GSSC-PLLR-243, scope=range_start, role=Test)
test('GSSC-PLLR-243 Semantic', async () => {
  let listCalls = 0;
  const { page } = await setupPublicationsPage(async () => {
    listCalls += 1;
    return samplePublications;
  });

  expect(listCalls).toBe(1);
  expect(page.publications()).toEqual(samplePublications);
  expect(page.publications().map((pub) => pub.cuid)).toEqual([
    'pub_cooking',
    'pub_register',
  ]);
  expect(page.publications().map((pub) => pub.title)).toEqual([
    'The Cooking Gene',
    'The 1890 Great Register',
  ]);
  expect(page.publications().map((pub) => pub.referenceLink)).toEqual([
    '/documents/cooking-gene.pdf',
    'https://example.org/great-register.pdf',
  ]);
  expect(page.publications().map((pub) => pub.description)).toEqual([
    'Presented courtesy of the Cookbook Committee',
    null,
  ]);
});
// @relation(GSSC-PLLR-243, scope=range_end, role=Test)

// @relation(GSSC-PLLR-244, scope=range_start, role=Test)
test('GSSC-PLLR-244 Syntactic', async () => {
  const { root: present } = await setupPublicationsPage(async () => samplePublications);
  expect(textContent(present, '.gssc-publications-page__heading')).toBe('Publications');
  expect(present.querySelector('.gssc-publications-page__content')).not.toBeNull();
  expect(present.querySelector('.gssc-publications-page__grid')).not.toBeNull();
  expect(present.querySelectorAll('.gssc-publication-link').length).toBe(2);
  expect(present.querySelector('gssc-section')).toBeNull();
  expect(present.querySelector('gssc-section-from-cuid')).toBeNull();
  expect(present.querySelector('.gssc-section')).toBeNull();

  const { root: empty } = await setupPublicationsPage(async () => []);
  expect(empty.querySelector('.gssc-publications-page__grid')).toBeNull();
  expect(empty.querySelector('.gssc-publication-link')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();

  const { root: failed } = await setupPublicationsPage(async () => null);
  expect(failed.querySelector('.gssc-publications-page__grid')).toBeNull();
});
// @relation(GSSC-PLLR-244, scope=range_end, role=Test)

// @relation(GSSC-PLLR-245, scope=range_start, role=Test)
test('GSSC-PLLR-245 Lexical', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const host = root.querySelector<HTMLElement>('.gssc-publications-page')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);

  const heading = root.querySelector<HTMLElement>('.gssc-publications-page__heading')!;
  expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);

  const grid = root.querySelector<HTMLElement>('.gssc-publications-page__grid')!;
  expect(grid.classList.contains('grid')).toBe(true);
  expect(grid.classList.contains('grid-cols-1')).toBe(true);
  expect(grid.classList.contains('sm:grid-cols-2')).toBe(true);
});
// @relation(GSSC-PLLR-245, scope=range_end, role=Test)

// @relation(GSSC-PLLR-246, scope=range_start, role=Test)
test('GSSC-PLLR-246 Semantic', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.gssc-publication-link')];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'The Cooking Gene',
    'The 1890 Great Register',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/documents/cooking-gene.pdf',
    'https://example.org/great-register.pdf',
  ]);
});
// @relation(GSSC-PLLR-246, scope=range_end, role=Test)

// @relation(GSSC-PLLR-247, scope=range_start, role=Test)
test('GSSC-PLLR-247 Syntactic', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const cells = root.querySelectorAll('.gssc-publications-page__cell');
  expect(cells.length).toBe(2);
  for (const cell of cells) {
    expect(cell.querySelector(':scope > .gssc-publication-link')).not.toBeNull();
    expect(cell.parentElement?.classList.contains('gssc-publications-page__grid')).toBe(true);
  }
  const first = cells[0]!;
  const link = first.querySelector('.gssc-publication-link')!;
  const description = first.querySelector('.gssc-publication-description')!;
  expect(
    link.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-247, scope=range_end, role=Test)

// @relation(GSSC-PLLR-248, scope=range_start, role=Test)
test('GSSC-PLLR-248 Lexical', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const link = root.querySelector<HTMLElement>('.gssc-publication-link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-248, scope=range_end, role=Test)

// @relation(GSSC-PLLR-249, scope=range_start, role=Test)
test('GSSC-PLLR-249 Semantic', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const descriptions = [
    ...root.querySelectorAll('.gssc-publication-description'),
  ].map((node) => node.textContent?.trim());
  expect(descriptions).toEqual(['Presented courtesy of the Cookbook Committee']);
  const cells = root.querySelectorAll('.gssc-publications-page__cell');
  expect(cells[1]!.querySelector('.gssc-publication-description')).toBeNull();
});
// @relation(GSSC-PLLR-249, scope=range_end, role=Test)

// @relation(GSSC-PLLR-250, scope=range_start, role=Test)
test('GSSC-PLLR-250 Syntactic', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const cell = root.querySelectorAll('.gssc-publications-page__cell')[0]!;
  const link = cell.querySelector('.gssc-publication-link')!;
  const description = cell.querySelector('.gssc-publication-description')!;
  expect(description.parentElement).toBe(cell);
  expect(
    link.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-250, scope=range_end, role=Test)

// @relation(GSSC-PLLR-251, scope=range_start, role=Test)
test('GSSC-PLLR-251 Lexical', async () => {
  const { root } = await setupPublicationsPage(async () => samplePublications);
  const description = root.querySelector<HTMLElement>('.gssc-publication-description')!;
  expect(description.classList.contains('font-sans')).toBe(true);
  expect(description.classList.contains('font-normal')).toBe(true);
  expect(description.classList.contains('text-gssc-black')).toBe(true);
  expect(description.classList.contains('text-base')).toBe(true);
});
// @relation(GSSC-PLLR-251, scope=range_end, role=Test)
