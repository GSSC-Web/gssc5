import { TestBed } from '@angular/core/testing';
import { nativeElement } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import {
  RESEARCH_TOOLS_PAGE_TAG,
  RESEARCH_TOOLS_SECTION_LIST_GET,
  ResearchToolsPage,
  type ResearchToolsSectionListEntry,
} from './research-tools';

const listEntries: ResearchToolsSectionListEntry[] = [
  {
    cuid: 'tool_charts',
    header: 'Research Charts',
    body: 'Blank charts for recording family information.',
    tags: [RESEARCH_TOOLS_PAGE_TAG],
    index: 1,
  },
  {
    cuid: 'tool_external',
    header: 'External Society Link',
    body: 'Link to an outside research society.',
    tags: [RESEARCH_TOOLS_PAGE_TAG, 'external'],
    index: 2,
  },
];

const backendByCuid: Record<string, BackendSectionData> = {
  tool_charts: {
    cuid: 'tool_charts',
    header: 'Research Charts',
    body: 'Blank charts for recording family information.',
    resources: ['/files/charts.pdf'],
    tags: [RESEARCH_TOOLS_PAGE_TAG],
    index: 1,
  },
  tool_external: {
    cuid: 'tool_external',
    header: 'External Society Link',
    body: 'Link to an outside research society.',
    resources: ['https://example.org/society'],
    tags: [RESEARCH_TOOLS_PAGE_TAG, 'external'],
    index: 2,
  },
};

async function setupResearchToolsPage(
  listGet: () => Promise<ResearchToolsSectionListEntry[] | null>,
  backendGet: (cuid: string) => Promise<BackendSectionData | null> = async (
    cuid,
  ) => backendByCuid[cuid] ?? null,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResearchToolsPage],
    providers: [
      { provide: RESEARCH_TOOLS_SECTION_LIST_GET, useValue: listGet },
      { provide: SECTION_BACKEND_GET, useValue: backendGet },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchToolsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  // Allow async list load + Section From CUID effects to settle.
  await Promise.resolve();
  await Promise.resolve();
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
    return listEntries;
  });

  expect(listCalls).toBe(1);
  expect(page.toolCuids()).toEqual(['tool_charts', 'tool_external']);
});
// @relation(GSSC-PLLR-159, scope=range_end, role=Test)

// @relation(GSSC-PLLR-160, scope=range_start, role=Test)
test('GSSC-PLLR-160 Syntactic', async () => {
  const { root: present } = await setupResearchToolsPage(async () => listEntries);
  const loaders = present.querySelectorAll('gssc-section-from-cuid');
  expect(loaders.length).toBe(2);
  expect(present.querySelectorAll('gssc-section').length).toBe(2);

  const { root: empty } = await setupResearchToolsPage(async () => []);
  expect(empty.querySelector('gssc-section-from-cuid')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();

  const { root: failed } = await setupResearchToolsPage(async () => null);
  expect(failed.querySelector('gssc-section-from-cuid')).toBeNull();
  expect(failed.querySelector('gssc-section')).toBeNull();
});
// @relation(GSSC-PLLR-160, scope=range_end, role=Test)

// @relation(GSSC-PLLR-161, scope=range_start, role=Test)
test('GSSC-PLLR-161 Lexical', async () => {
  const { root } = await setupResearchToolsPage(async () => listEntries);
  const host = root.querySelector<HTMLElement>('.gssc-research-tools-page')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);

  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);

  // List host must not invent competing section chrome classes of its own.
  expect(host.classList.contains('border-gssc-gray')).toBe(false);
  expect(host.classList.contains('text-gssc-dark-green')).toBe(false);
});
// @relation(GSSC-PLLR-161, scope=range_end, role=Test)
