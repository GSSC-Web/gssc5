import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  RESEARCH_TOOLS_LIST_GET,
  ResearchToolsPage,
  type ResearchToolEntry,
} from './research-tools';

const sampleTools: ResearchToolEntry[] = [
  {
    cuid: 'tool_charts',
    title: 'Four Generations Chart',
    referenceLink: '/documents/4-generation-chart.pdf',
  },
  {
    cuid: 'tool_external',
    title: 'Victoria Genealogical Society',
    referenceLink: 'http://www.victoriags.org/',
  },
];

async function setupResearchToolsPage(
  listGet: () => Promise<ResearchToolEntry[] | null>,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResearchToolsPage],
    providers: [{ provide: RESEARCH_TOOLS_LIST_GET, useValue: listGet }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchToolsPage);
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

// @relation(GSSC-PLLR-159, scope=range_start, role=Test)
test('GSSC-PLLR-159 Semantic', async () => {
  let listCalls = 0;
  const { page } = await setupResearchToolsPage(async () => {
    listCalls += 1;
    return sampleTools;
  });

  expect(listCalls).toBe(1);
  expect(page.tools()).toEqual(sampleTools);
  expect(page.tools().map((tool) => tool.cuid)).toEqual([
    'tool_charts',
    'tool_external',
  ]);
  expect(page.tools().map((tool) => tool.title)).toEqual([
    'Four Generations Chart',
    'Victoria Genealogical Society',
  ]);
  expect(page.tools().map((tool) => tool.referenceLink)).toEqual([
    '/documents/4-generation-chart.pdf',
    'http://www.victoriags.org/',
  ]);
});
// @relation(GSSC-PLLR-159, scope=range_end, role=Test)

// @relation(GSSC-PLLR-160, scope=range_start, role=Test)
test('GSSC-PLLR-160 Syntactic', async () => {
  const { root: present } = await setupResearchToolsPage(async () => sampleTools);
  expect(textContent(present, '.gssc-research-tools-page__heading')).toBe(
    'Research Resources',
  );
  expect(present.querySelector('.gssc-research-tools-page__content')).not.toBeNull();
  expect(present.querySelector('.gssc-research-tools-page__grid')).not.toBeNull();
  expect(present.querySelectorAll('.gssc-research-tool-link').length).toBe(2);
  // Tools listing is normal page content — not nested under generic sections.
  expect(present.querySelector('gssc-section')).toBeNull();
  expect(present.querySelector('gssc-section-from-cuid')).toBeNull();
  expect(present.querySelector('.gssc-section')).toBeNull();

  const { root: empty } = await setupResearchToolsPage(async () => []);
  expect(empty.querySelector('.gssc-research-tools-page__grid')).toBeNull();
  expect(empty.querySelector('.gssc-research-tool-link')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();
  expect(empty.querySelector('gssc-section-from-cuid')).toBeNull();

  const { root: failed } = await setupResearchToolsPage(async () => null);
  expect(failed.querySelector('.gssc-research-tools-page__grid')).toBeNull();
});
// @relation(GSSC-PLLR-160, scope=range_end, role=Test)

// @relation(GSSC-PLLR-161, scope=range_start, role=Test)
test('GSSC-PLLR-161 Lexical', async () => {
  const { root } = await setupResearchToolsPage(async () => sampleTools);
  const host = root.querySelector<HTMLElement>('.gssc-research-tools-page')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);

  const heading = root.querySelector<HTMLElement>(
    '.gssc-research-tools-page__heading',
  )!;
  expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);

  const grid = root.querySelector<HTMLElement>(
    '.gssc-research-tools-page__grid',
  )!;
  expect(grid.classList.contains('grid')).toBe(true);
  expect(grid.classList.contains('grid-cols-1')).toBe(true);
  expect(grid.classList.contains('sm:grid-cols-2')).toBe(true);
});
// @relation(GSSC-PLLR-161, scope=range_end, role=Test)

// @relation(GSSC-PLLR-228, scope=range_start, role=Test)
test('GSSC-PLLR-228 Semantic', async () => {
  const { root } = await setupResearchToolsPage(async () => sampleTools);
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-research-tool-link'),
  ];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'Four Generations Chart',
    'Victoria Genealogical Society',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/documents/4-generation-chart.pdf',
    'http://www.victoriags.org/',
  ]);
});
// @relation(GSSC-PLLR-228, scope=range_end, role=Test)

// @relation(GSSC-PLLR-229, scope=range_start, role=Test)
test('GSSC-PLLR-229 Syntactic', async () => {
  const { root } = await setupResearchToolsPage(async () => sampleTools);
  const cells = root.querySelectorAll('.gssc-research-tools-page__cell');
  expect(cells.length).toBe(2);
  for (const cell of cells) {
    expect(cell.querySelector(':scope > .gssc-research-tool-link')).not.toBeNull();
    expect(cell.parentElement?.classList.contains('gssc-research-tools-page__grid')).toBe(
      true,
    );
  }
});
// @relation(GSSC-PLLR-229, scope=range_end, role=Test)

// @relation(GSSC-PLLR-230, scope=range_start, role=Test)
test('GSSC-PLLR-230 Lexical', async () => {
  const { root } = await setupResearchToolsPage(async () => sampleTools);
  const link = root.querySelector<HTMLElement>('.gssc-research-tool-link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-230, scope=range_end, role=Test)
