import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import {
  SECTION_CREATE,
  SECTION_DELETE_BY_CUID,
  SECTION_GET_BY_CUID,
  SECTION_PATCH_BY_CUID,
  SECTIONS_LIST,
  SECTIONS_LIST_TEMPLATES,
  type SectionCreateBody,
  type SectionDetail,
  type SectionListEntry,
  type SectionPatchBody,
  type SectionTemplateListEntry,
} from '../../services/sections-api';
import { PageSectionEditorPage } from './page-section-editor';

const sampleList: SectionListEntry[] = [
  {
    cuid: 'sec-a',
    header: 'Alpha header',
    body: 'Alpha body',
    tags: ['home'],
    index: 0,
    imageFile: null,
    imagePosition: 'none',
  },
  {
    cuid: 'sec-b',
    header: 'Bravo header',
    body: 'Bravo body',
    tags: ['home'],
    index: 1,
    imageFile: null,
    imagePosition: 'left',
  },
];

const sampleDetailA: SectionDetail = {
  ...sampleList[0]!,
  resources: ['https://example.com/a'],
};

const sampleDetailB: SectionDetail = {
  ...sampleList[1]!,
  resources: [],
};

const sampleTemplates: SectionTemplateListEntry[] = [
  { cuid: 'tmpl-1', name: 'Section Template A' },
  { cuid: 'tmpl-2', name: 'Section Template B' },
];

type Harness = {
  list: () => Promise<SectionListEntry[]>;
  getByCuid: (cuid: string) => Promise<SectionDetail | null>;
  patchByCuid: (
    cuid: string,
    body: SectionPatchBody,
  ) => Promise<{ ok: true; detail: SectionDetail } | { ok: false; forbidden: boolean }>;
  create: (
    body: SectionCreateBody,
  ) => Promise<{ ok: true; detail: SectionDetail } | { ok: false; forbidden: boolean }>;
  deleteByCuid: (
    cuid: string,
  ) => Promise<{ ok: true } | { ok: false; forbidden: boolean }>;
  listTemplates: () => Promise<SectionTemplateListEntry[]>;
  deleted: string[];
};

function defaultHarness(overrides?: Partial<Harness>): Harness {
  const deleted: string[] = overrides?.deleted ?? [];
  return {
    list: async () => sampleList.filter((row) => !deleted.includes(row.cuid)),
    getByCuid: async (cuid: string) => {
      if (cuid === 'sec-a') return sampleDetailA;
      if (cuid === 'sec-b') return sampleDetailB;
      if (cuid === 'sec-new') {
        return {
          cuid: 'sec-new',
          header: 'Created header',
          body: 'Created body',
          resources: [],
          tags: ['home'],
          index: 2,
          imageFile: null,
          imagePosition: 'none',
        };
      }
      return null;
    },
    patchByCuid: async (cuid: string, body: SectionPatchBody) => ({
      ok: true,
      detail: {
        ...(cuid === 'sec-b' ? sampleDetailB : sampleDetailA),
        ...body,
        cuid,
        header: body.header === undefined ? sampleDetailA.header : body.header,
        body: body.body ?? sampleDetailA.body,
        resources: body.resources ?? sampleDetailA.resources,
        tags: body.tags ?? sampleDetailA.tags,
        index: sampleDetailA.index,
      },
    }),
    create: async (body: SectionCreateBody) => ({
      ok: true,
      detail: {
        cuid: 'sec-new',
        header: body.header ?? null,
        body: body.body,
        resources: body.resources ?? [],
        tags: body.tags ?? ['home'],
        index: 2,
        imageFile: body.imageFile ?? null,
        imagePosition: body.imagePosition ?? 'none',
      },
    }),
    listTemplates: async () => sampleTemplates,
    deleteByCuid: async (cuid: string) => {
      deleted.push(cuid);
      return { ok: true };
    },
    ...overrides,
    deleted,
  };
}

async function setup(overrides?: Partial<Harness>) {
  const harness = defaultHarness(overrides);
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [PageSectionEditorPage],
    providers: [
      EditorSession,
      { provide: SECTIONS_LIST, useValue: harness.list },
      { provide: SECTION_GET_BY_CUID, useValue: harness.getByCuid },
      { provide: SECTION_PATCH_BY_CUID, useValue: harness.patchByCuid },
      { provide: SECTION_CREATE, useValue: harness.create },
      { provide: SECTION_DELETE_BY_CUID, useValue: harness.deleteByCuid },
      { provide: SECTIONS_LIST_TEMPLATES, useValue: harness.listTemplates },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PageSectionEditorPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, page: fixture.componentInstance, root: nativeElement(fixture), harness };
}

async function selectSection(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown>; componentInstance: PageSectionEditorPage },
  cuid: string,
): Promise<void> {
  fixture.componentInstance.onSelectSection(cuid);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
}

async function flushAsync(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function clickSectionDelete(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
): Promise<void> {
  root.querySelector<HTMLButtonElement>('[data-slot="section-delete"]')!.click();
  await flushAsync(fixture);
}

// @relation(GSSC-MLLR-261, scope=range_start, role=Test)
test('GSSC-MLLR-261 Semantic', async () => {
  const { root, fixture } = await setup();
  expect(root.querySelector('[data-slot="page-section-editor"]')).toBeTruthy();
  expect(textContent(root, '.gssc-page-section-editor__title')).toContain('Page');
  expect(root.querySelector('[data-slot="section-list"]')).toBeTruthy();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('gssc-editor')).toBeTruthy();
});
// @relation(GSSC-MLLR-261, scope=range_end, role=Test)

// @relation(GSSC-MLLR-262, scope=range_start, role=Test)
test('GSSC-MLLR-262 Syntactic', async () => {
  const { root } = await setup();
  const page = root.querySelector('.gssc-page-section-editor')!;
  expect(page.className).toContain('flex');
  expect(page.className).toContain('flex-col');
  expect(page.className).toContain('w-full');
  expect(page.className).toContain('max-w-3xl');
  expect(page.className).toContain('gap-5');
  expect(page.className).not.toContain('px-4');
});
// @relation(GSSC-MLLR-262, scope=range_end, role=Test)

// @relation(GSSC-MLLR-263, scope=range_start, role=Test)
test('GSSC-MLLR-263 Lexical', async () => {
  const { root } = await setup();
  const page = root.querySelector('.gssc-page-section-editor')!;
  expect(page.className).toContain('font-sans');
  expect(page.className).toContain('text-gssc-dark-green');
  const title = root.querySelector('.gssc-page-section-editor__title')!;
  expect(title.className).toContain('font-semibold');
  expect(title.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-263, scope=range_end, role=Test)

// @relation(GSSC-MLLR-264, scope=range_start, role=Test)
test('GSSC-MLLR-264 Semantic', async () => {
  const { root, fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('#page-section-editor-tags')).toBeTruthy();
  expect(page.editorTagsText()).toBe('home');
  page.editorTagsText.set('membership-info, home');
  fixture.detectChanges();
  expect(page.editorTagsText()).toContain('membership-info');
});
// @relation(GSSC-MLLR-264, scope=range_end, role=Test)

// @relation(GSSC-MLLR-265, scope=range_start, role=Test)
test('GSSC-MLLR-265 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const field = root.querySelector('#page-section-editor-tags')!.closest('.gssc-form-text-field')!;
  expect(field.className).toContain('flex');
  expect(field.className).toContain('w-full');
  expect(root.querySelector('.gssc-section-fields')).toBeTruthy();
});
// @relation(GSSC-MLLR-265, scope=range_end, role=Test)

// @relation(GSSC-MLLR-266, scope=range_start, role=Test)
test('GSSC-MLLR-266 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const field = root.querySelector('#page-section-editor-tags')!.closest('.gssc-form-text-field')!;
  expect(field.className).toContain('border-gssc-dark-green');
  expect(field.className).toContain('bg-gssc-white');
  expect(field.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-266, scope=range_end, role=Test)

// @relation(GSSC-MLLR-267, scope=range_start, role=Test)
test('GSSC-MLLR-267 Semantic', async () => {
  const { root } = await setup();
  const list = root.querySelector('[data-slot="section-list"]')!;
  expect(list).toBeTruthy();
  expect(list.querySelectorAll('.gssc-page-section-editor__section-item').length).toBe(2);
  expect(textContent(list, '.gssc-page-section-editor__section-item')).toContain('Alpha');
});
// @relation(GSSC-MLLR-267, scope=range_end, role=Test)

// @relation(GSSC-MLLR-268, scope=range_start, role=Test)
test('GSSC-MLLR-268 Syntactic', async () => {
  const { root } = await setup();
  const list = root.querySelector('.gssc-page-section-editor__section-list')!;
  expect(list.className).toContain('flex');
  expect(list.className).toContain('flex-col');
  expect(list.className).toContain('w-full');
});
// @relation(GSSC-MLLR-268, scope=range_end, role=Test)

// @relation(GSSC-MLLR-269, scope=range_start, role=Test)
test('GSSC-MLLR-269 Lexical', async () => {
  const { root } = await setup();
  const list = root.querySelector('.gssc-page-section-editor__section-list')!;
  expect(list.className).toContain('border-gssc-gray');
  expect(list.className).toContain('bg-gssc-white');
  const title = root.querySelector('.gssc-page-section-editor__section-list-title')!;
  expect(title.className).toContain('text-gssc-dark-green');
  expect(title.className).toContain('font-semibold');
  expect(textContent(root, '.gssc-page-section-editor__section-list-title')).toBe('Catalog');
});
// @relation(GSSC-MLLR-269, scope=range_end, role=Test)

// @relation(GSSC-MLLR-270, scope=range_start, role=Test)
test('GSSC-MLLR-270 Semantic', async () => {
  const { root, fixture, page } = await setup();
  const item = root.querySelector<HTMLButtonElement>(
    '.gssc-page-section-editor__section-item[data-cuid="sec-a"]',
  )!;
  item.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.selectedCuid()).toBe('sec-a');
  expect(page.editorHeader()).toBe('Alpha header');
  expect(page.editorBody()).toBe('Alpha body');
});
// @relation(GSSC-MLLR-270, scope=range_end, role=Test)

// @relation(GSSC-MLLR-271, scope=range_start, role=Test)
test('GSSC-MLLR-271 Syntactic', async () => {
  const { root } = await setup();
  const item = root.querySelector('.gssc-page-section-editor__section-item')!;
  expect(item.className).toContain('w-full');
  expect(item.className).toContain('text-start');
});
// @relation(GSSC-MLLR-271, scope=range_end, role=Test)

// @relation(GSSC-MLLR-272, scope=range_start, role=Test)
test('GSSC-MLLR-272 Lexical', async () => {
  const { root } = await setup();
  const item = root.querySelector('.gssc-page-section-editor__section-item')!;
  expect(item.className).toContain('font-sans');
  expect(item.className).toContain('text-gssc-dark-green');
  expect(item.className).toContain('text-sm');
});
// @relation(GSSC-MLLR-272, scope=range_end, role=Test)

// @relation(GSSC-MLLR-273, scope=range_start, role=Test)
test('GSSC-MLLR-273 Semantic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('gssc-editor')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-header')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-body')).toBeTruthy();
});
// @relation(GSSC-MLLR-273, scope=range_end, role=Test)

// @relation(GSSC-MLLR-274, scope=range_start, role=Test)
test('GSSC-MLLR-274 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const workspace = root.querySelector('.gssc-page-section-editor__workspace')!;
  expect(workspace.className).toContain('grid');
  expect(workspace.className).toContain('w-full');
});
// @relation(GSSC-MLLR-274, scope=range_end, role=Test)

// @relation(GSSC-MLLR-275, scope=range_start, role=Test)
test('GSSC-MLLR-275 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const editor = root.querySelector('.gssc-editor')!;
  expect(editor.className).toContain('bg-gssc-white');
  expect(editor.className).toContain('border-gssc-gray');
  expect(editor.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-275, scope=range_end, role=Test)

// @relation(GSSC-MLLR-276, scope=range_start, role=Test)
test('GSSC-MLLR-276 Semantic', async () => {
  const { root, fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('[data-slot="section-preview"]')).toBeTruthy();
  expect(page.previewContents().header).toBe('Alpha header');
});
// @relation(GSSC-MLLR-276, scope=range_end, role=Test)

// @relation(GSSC-MLLR-277, scope=range_start, role=Test)
test('GSSC-MLLR-277 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const preview = root.querySelector('.gssc-page-section-editor__preview')!;
  expect(preview.className).toContain('flex');
  expect(preview.className).toContain('flex-col');
});
// @relation(GSSC-MLLR-277, scope=range_end, role=Test)

// @relation(GSSC-MLLR-278, scope=range_start, role=Test)
test('GSSC-MLLR-278 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const title = root.querySelector('.gssc-page-section-editor__preview-title')!;
  expect(title.className).toContain('text-gssc-dark-green');
  expect(title.className).toContain('font-semibold');
});
// @relation(GSSC-MLLR-278, scope=range_end, role=Test)

// @relation(GSSC-MLLR-279, scope=range_start, role=Test)
test('GSSC-MLLR-279 Semantic', async () => {
  let listCalls = 0;
  const { page } = await setup({
    list: async () => {
      listCalls += 1;
      return sampleList;
    },
  });
  expect(listCalls).toBeGreaterThanOrEqual(1);
  expect(page.sections().map((s) => s.cuid)).toEqual(['sec-a', 'sec-b']);
});
// @relation(GSSC-MLLR-279, scope=range_end, role=Test)

// @relation(GSSC-MLLR-280, scope=range_start, role=Test)
test('GSSC-MLLR-280 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(page.editorHeader()).toBe('Alpha header');
  expect(page.editorBody()).toBe('Alpha body');
  expect(page.editorResourcesText()).toBe('https://example.com/a');
  expect(page.editorTagsText()).toBe('home');
  await selectSection(fixture, 'sec-b');
  expect(page.editorHeader()).toBe('Bravo header');
  expect(page.editorImagePosition()).toBe('left');
});
// @relation(GSSC-MLLR-280, scope=range_end, role=Test)

// @relation(GSSC-MLLR-281, scope=range_start, role=Test)
test('GSSC-MLLR-281 Semantic', async () => {
  const patches: SectionPatchBody[] = [];
  const { fixture, page } = await setup({
    patchByCuid: async (cuid, body) => {
      patches.push(body);
      return {
        ok: true,
        detail: { ...sampleDetailA, ...body, cuid, tags: body.tags ?? sampleDetailA.tags },
      };
    },
  });
  await selectSection(fixture, 'sec-a');
  page.editorBody.set('Updated body');
  page.editorTagsText.set('home, calendar');
  await page.onEditorSaved();
  expect(patches.length).toBe(1);
  expect(patches[0]!.body).toBe('Updated body');
  expect(patches[0]!.tags).toEqual(['home', 'calendar']);
  expect(page.statusMessage()).toBe('Saved.');
});
// @relation(GSSC-MLLR-281, scope=range_end, role=Test)

// @relation(GSSC-MLLR-282, scope=range_start, role=Test)
test('GSSC-MLLR-282 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  page.editorBody.set('Scratch');
  page.onEditorCancelled();
  expect(page.editorBody()).toBe('Alpha body');
  expect(page.statusMessage()).toBe('Discarded.');
});
// @relation(GSSC-MLLR-282, scope=range_end, role=Test)

// @relation(GSSC-MLLR-283, scope=range_start, role=Test)
test('GSSC-MLLR-283 Semantic', async () => {
  const { fixture, page } = await setup({
    patchByCuid: async () => ({ ok: false, forbidden: true }),
  });
  await selectSection(fixture, 'sec-a');
  page.editorBody.set('Nope');
  await page.onEditorSaved();
  expect(page.permitted()).toBe(false);
  expect(page.statusMessage()).toContain('permission');
});
// @relation(GSSC-MLLR-283, scope=range_end, role=Test)

// @relation(GSSC-MLLR-284, scope=range_start, role=Test)
test('GSSC-MLLR-284 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(page.editorResourceId()).toBe('section:sec-a');
  await selectSection(fixture, 'sec-b');
  expect(page.editorResourceId()).toBe('section:sec-b');
});
// @relation(GSSC-MLLR-284, scope=range_end, role=Test)

// @relation(GSSC-MLLR-285, scope=range_start, role=Test)
test('GSSC-MLLR-285 Semantic', async () => {
  const session = new EditorSession();
  expect(session.tryAcquire('section:sec-a', 'holder-1')).toBe(true);
  expect(session.tryAcquire('section:sec-b', 'holder-2')).toBe(true);
  expect(session.tryAcquire('section:sec-a', 'holder-2')).toBe(false);
});
// @relation(GSSC-MLLR-285, scope=range_end, role=Test)

// @relation(GSSC-MLLR-286, scope=range_start, role=Test)
test('GSSC-MLLR-286 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(page.hasSelection()).toBe(true);
  expect(page.editorTagsText()).toBe('home');
  page.editorTagsText.set('calendar');
  fixture.detectChanges();
  expect(page.editorTagsText()).toBe('calendar');
});
// @relation(GSSC-MLLR-286, scope=range_end, role=Test)

// @relation(GSSC-MLLR-581, scope=range_start, role=Test)
test('GSSC-MLLR-581 Semantic', async () => {
  const { root, fixture, page } = await setup();
  const createBtn = root.querySelector<HTMLButtonElement>('[data-slot="section-create"]')!;
  expect(createBtn).toBeTruthy();
  expect(textContent(root, '[data-slot="section-create"]')).toContain('New section');
  createBtn.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.mode()).toBe('create');
  expect(root.querySelector('gssc-editor')).toBeTruthy();
  expect(page.editorResourceId()).toBe('section:new');
});
// @relation(GSSC-MLLR-581, scope=range_end, role=Test)

// @relation(GSSC-MLLR-582, scope=range_start, role=Test)
test('GSSC-MLLR-582 Syntactic', async () => {
  const { root } = await setup();
  const createBtn = root.querySelector('.gssc-page-section-editor__create')!;
  expect(createBtn.className).toContain('inline-flex');
  expect(createBtn.className).toContain('items-center');
  expect(createBtn.className).toContain('px-3');
});
// @relation(GSSC-MLLR-582, scope=range_end, role=Test)

// @relation(GSSC-MLLR-583, scope=range_start, role=Test)
test('GSSC-MLLR-583 Lexical', async () => {
  const { root } = await setup();
  const createBtn = root.querySelector('.gssc-page-section-editor__create')!;
  expect(createBtn.className).toContain('font-sans');
  expect(createBtn.className).toContain('text-sm');
  expect(createBtn.className).toContain('border-gssc-dark-green');
  expect(createBtn.className).toContain('bg-gssc-light-green');
  expect(createBtn.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-583, scope=range_end, role=Test)

// @relation(GSSC-MLLR-584, scope=range_start, role=Test)
test('GSSC-MLLR-584 Semantic', async () => {
  const { root, fixture, page } = await setup();
  page.startCreate();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('#page-section-editor-template')).toBeTruthy();
  expect(page.templates().map((t) => t.cuid)).toEqual(['tmpl-1', 'tmpl-2']);
});
// @relation(GSSC-MLLR-584, scope=range_end, role=Test)

// @relation(GSSC-MLLR-585, scope=range_start, role=Test)
test('GSSC-MLLR-585 Syntactic', async () => {
  const { root, fixture, page } = await setup();
  page.startCreate();
  fixture.detectChanges();
  await fixture.whenStable();
  const field = root.querySelector('#page-section-editor-template')!.closest(
    '.gssc-form-select-field',
  )!;
  expect(field.className).toContain('w-full');
  expect(field.className).toContain('flex');
});
// @relation(GSSC-MLLR-585, scope=range_end, role=Test)

// @relation(GSSC-MLLR-586, scope=range_start, role=Test)
test('GSSC-MLLR-586 Lexical', async () => {
  const { root, fixture, page } = await setup();
  page.startCreate();
  fixture.detectChanges();
  await fixture.whenStable();
  const field = root.querySelector('#page-section-editor-template')!.closest(
    '.gssc-form-select-field',
  )!;
  expect(field.className).toContain('border-gssc-dark-green');
  expect(field.className).toContain('bg-gssc-white');
  expect(field.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-586, scope=range_end, role=Test)

// @relation(GSSC-MLLR-587, scope=range_start, role=Test)
test('GSSC-MLLR-587 Template Required For Create', async () => {
  const creates: SectionCreateBody[] = [];
  const { fixture, page } = await setup({
    create: async (body) => {
      creates.push(body);
      return { ok: true, detail: { ...sampleDetailA, cuid: 'sec-new', body: body.body } };
    },
  });
  page.startCreate();
  page.editorBody.set('New body');
  page.editorTagsText.set('home');
  fixture.detectChanges();
  await page.onEditorSaved();
  expect(creates.length).toBe(0);
  expect(page.statusMessage()).toContain('Template');
  page.templateId.set('tmpl-1');
  await page.onEditorSaved();
  expect(creates.length).toBe(1);
  expect(creates[0]!.templateId).toBe('tmpl-1');
  expect(creates[0]!.tags).toEqual(['home']);
});
// @relation(GSSC-MLLR-587, scope=range_end, role=Test)

// @relation(GSSC-MLLR-588, scope=range_start, role=Test)
test('GSSC-MLLR-588 Editor Mode Selection', async () => {
  const { fixture, page } = await setup();
  page.startCreate();
  expect(page.mode()).toBe('create');
  expect(page.editorResourceId()).toBe('section:new');
  await selectSection(fixture, 'sec-a');
  expect(page.mode()).toBe('edit');
  expect(page.editorResourceId()).toBe('section:sec-a');
});
// @relation(GSSC-MLLR-588, scope=range_end, role=Test)

// @relation(GSSC-MLLR-589, scope=range_start, role=Test)
test('GSSC-MLLR-589 Create Section', async () => {
  const creates: SectionCreateBody[] = [];
  const { fixture, page, root } = await setup({
    create: async (body) => {
      creates.push(body);
      return {
        ok: true,
        detail: {
          cuid: 'sec-new',
          header: body.header ?? null,
          body: body.body,
          resources: body.resources ?? [],
          tags: body.tags ?? ['home'],
          index: 2,
          imageFile: null,
          imagePosition: 'none',
        },
      };
    },
    list: async () => [
      ...sampleList,
      {
        cuid: 'sec-new',
        header: 'Created header',
        body: 'Created body',
        tags: ['home'],
        index: 2,
      },
    ],
  });
  page.startCreate();
  page.templateId.set('tmpl-1');
  page.editorHeader.set('Created header');
  page.editorBody.set('Created body');
  page.editorTagsText.set('home');
  fixture.detectChanges();
  await page.onEditorSaved();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(creates.length).toBe(1);
  expect(creates[0]!.templateId).toBe('tmpl-1');
  expect(creates[0]!.body).toBe('Created body');
  expect(creates[0]!.tags).toEqual(['home']);
  expect(page.mode()).toBe('edit');
  expect(page.selectedCuid()).toBe('sec-new');
  expect(page.statusMessage()).toContain('created');
  expect(textContent(root, '[data-slot="editor-status"]')).toContain('created');
});
// @relation(GSSC-MLLR-589, scope=range_end, role=Test)

// @relation(GSSC-MLLR-590, scope=range_start, role=Test)
test('GSSC-MLLR-590 Persistence Feedback', async () => {
  const { fixture, page } = await setup({
    create: async () => ({ ok: false, forbidden: true }),
  });
  page.startCreate();
  page.templateId.set('tmpl-1');
  page.editorBody.set('Nope');
  page.editorTagsText.set('home');
  await page.onEditorSaved();
  fixture.detectChanges();
  expect(page.permitted()).toBe(false);
  expect(page.statusMessage()).toContain('permission');
});
// @relation(GSSC-MLLR-590, scope=range_end, role=Test)

// @relation(GSSC-MLLR-591, scope=range_start, role=Test)
test('GSSC-MLLR-591 Members Nav Omits Announcements And Events', async () => {
  const { PAGE_DATA_KIND_PATHS } = await import('../page-data-editor/page-data-editor');
  expect(PAGE_DATA_KIND_PATHS.sections).toBe('/page-sections');
  expect(PAGE_DATA_KIND_PATHS.announcements).toBe('/announcements');
  expect(PAGE_DATA_KIND_PATHS.events).toBe('/events');
  const membersSeedTopLevelPaths = [
    '/directory',
    '/account',
    '/page-sections',
    '/newsletters',
    '/publications',
    '/research-tools',
  ];
  expect(membersSeedTopLevelPaths).toContain(PAGE_DATA_KIND_PATHS.sections);
  expect(membersSeedTopLevelPaths).not.toContain(PAGE_DATA_KIND_PATHS.announcements);
  expect(membersSeedTopLevelPaths).not.toContain(PAGE_DATA_KIND_PATHS.events);
});
// @relation(GSSC-MLLR-591, scope=range_end, role=Test)

// @relation(GSSC-MLLR-681, scope=range_start, role=Test)
test('GSSC-MLLR-681 Unified Catalog Semantic', async () => {
  const { root } = await setup();
  expect(textContent(root, '.gssc-page-section-editor__section-list-title')).toBe('Catalog');
  expect(root.querySelector('[data-slot="section-create"]')).toBeTruthy();
  expect(root.querySelectorAll('.gssc-page-section-editor__section-item').length).toBe(2);
});
// @relation(GSSC-MLLR-681, scope=range_end, role=Test)

// @relation(GSSC-MLLR-682, scope=range_start, role=Test)
test('GSSC-MLLR-682 Unified Catalog Syntactic', async () => {
  const { root } = await setup();
  const catalog = root.querySelector('.gssc-section-catalog')!;
  expect(catalog.className).toContain('w-full');
  expect(catalog.className).toContain('flex-col');
  const list = catalog.querySelector('.gssc-page-section-editor__section-list-items')!;
  expect(list.className).toContain('max-h-40');
  expect(list.className).toContain('overflow-y-auto');
});
// @relation(GSSC-MLLR-682, scope=range_end, role=Test)

// @relation(GSSC-MLLR-683, scope=range_start, role=Test)
test('GSSC-MLLR-683 Unified Catalog Lexical', async () => {
  const { root, fixture } = await setup();
  const catalog = root.querySelector('.gssc-section-catalog')!;
  expect(catalog.className).toContain('border-gssc-gray');
  expect(catalog.className).toContain('font-sans');
  await selectSection(fixture, 'sec-a');
  const selected = root.querySelector('.gssc-page-section-editor__section-item[data-cuid="sec-a"]')!;
  expect(selected.className).toContain('bg-gssc-light-green');
});
// @relation(GSSC-MLLR-683, scope=range_end, role=Test)

// @relation(GSSC-MLLR-684, scope=range_start, role=Test)
test('GSSC-MLLR-684 Unified Form Fields Semantic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('.gssc-section-fields')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-tags')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-header')).toBeTruthy();
});
// @relation(GSSC-MLLR-684, scope=range_end, role=Test)

// @relation(GSSC-MLLR-685, scope=range_start, role=Test)
test('GSSC-MLLR-685 Unified Form Fields Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const fields = root.querySelector('.gssc-section-fields')!;
  expect(fields.className).toContain('flex');
  expect(fields.className).toContain('flex-col');
  expect(fields.className).toContain('w-full');
  expect(fields.className).toContain('gap-2');
});
// @relation(GSSC-MLLR-685, scope=range_end, role=Test)

// @relation(GSSC-MLLR-686, scope=range_start, role=Test)
test('GSSC-MLLR-686 Unified Form Fields Lexical', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const tagField = root.querySelector('#page-section-editor-tags')!.closest('.gssc-form-text-field')!;
  expect(tagField.className).toContain('border-gssc-dark-green');
  expect(tagField.className).toContain('bg-gssc-white');
  expect(tagField.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-686, scope=range_end, role=Test)

// @relation(GSSC-MLLR-687, scope=range_start, role=Test)
test('GSSC-MLLR-687 Kind Chrome Semantic', async () => {
  const { root } = await setup();
  expect(textContent(root, '.gssc-page-section-editor__title')).toContain('Page');
  expect(textContent(root, '.gssc-page-section-editor__lead')).toContain('Browse sections');
  expect(textContent(root, '[data-slot="editor-status"]')).toContain(
    'Select a section or create a new one',
  );
});
// @relation(GSSC-MLLR-687, scope=range_end, role=Test)

// @relation(GSSC-MLLR-688, scope=range_start, role=Test)
test('GSSC-MLLR-688 Kind Chrome Syntactic', async () => {
  const { root } = await setup();
  const page = root.querySelector('.gssc-page-section-editor')!;
  expect(page.className).toContain('max-w-3xl');
  expect(page.className).toContain('gap-5');
  expect(page.className).not.toContain('px-4');
  expect(page.className).not.toContain('py-5');
  const intro = root.querySelector('.gssc-page-section-editor__intro')!;
  const catalog = root.querySelector('.gssc-section-catalog')!;
  const status = root.querySelector('[data-slot="editor-status"]')!;
  expect(intro.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(catalog.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-688, scope=range_end, role=Test)

// @relation(GSSC-MLLR-689, scope=range_start, role=Test)
test('GSSC-MLLR-689 Kind Chrome Lexical', async () => {
  const { root } = await setup();
  const title = root.querySelector('.gssc-page-section-editor__title')!;
  const lead = root.querySelector('.gssc-page-section-editor__lead')!;
  const status = root.querySelector('[data-slot="editor-status"]')!;
  expect(title.className).toContain('text-[1.75em]');
  expect(title.className).toContain('font-semibold');
  expect(title.className).toContain('text-gssc-dark-green');
  expect(lead.className).toContain('text-sm');
  expect(lead.className).toContain('text-gssc-dark-brown');
  expect(status.className).toContain('text-sm');
  expect(status.className).toContain('text-gssc-dark-brown');
});
// @relation(GSSC-MLLR-689, scope=range_end, role=Test)

// @relation(GSSC-MLLR-690, scope=range_start, role=Test)
test('GSSC-MLLR-690 Idle Disclaimer Semantic', async () => {
  const { root } = await setup();
  expect(textContent(root, '[data-slot="editor-status"]')).toBe(
    'Select a section or create a new one.',
  );
});
// @relation(GSSC-MLLR-690, scope=range_end, role=Test)

// @relation(GSSC-MLLR-691, scope=range_start, role=Test)
test('GSSC-MLLR-691 Idle Disclaimer Syntactic', async () => {
  const { root } = await setup();
  const catalog = root.querySelector('.gssc-section-catalog')!;
  const status = root.querySelector('[data-slot="editor-status"]')!;
  expect(status.tagName).toBe('P');
  expect(catalog.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-691, scope=range_end, role=Test)

// @relation(GSSC-MLLR-692, scope=range_start, role=Test)
test('GSSC-MLLR-692 Idle Disclaimer Lexical', async () => {
  const { root } = await setup();
  const status = root.querySelector('[data-slot="editor-status"]')!;
  expect(status.className).toContain('font-sans');
  expect(status.className).toContain('text-sm');
  expect(status.className).toContain('text-gssc-dark-brown');
});
// @relation(GSSC-MLLR-692, scope=range_end, role=Test)

// @relation(GSSC-MLLR-741, scope=range_start, role=Test)
test('GSSC-MLLR-741 Semantic section delete removes via control', async () => {
  const { root, fixture, harness } = await setup();
  await selectSection(fixture, 'sec-a');
  await clickSectionDelete(fixture, root);
  expect(harness.deleted).toEqual(['sec-a']);
});
// @relation(GSSC-MLLR-741, scope=range_end, role=Test)

// @relation(GSSC-MLLR-742, scope=range_start, role=Test)
test('GSSC-MLLR-742 Syntactic section delete visibility', async () => {
  const { root, fixture } = await setup();
  expect(root.querySelector('[data-slot="section-delete"]')).toBeNull();
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('[data-slot="section-delete"]')).toBeTruthy();
  expect(root.querySelector('gssc-editor')).toBeTruthy();
  fixture.componentInstance.startCreate();
  fixture.detectChanges();
  expect(root.querySelector('[data-slot="section-delete"]')).toBeNull();
});
// @relation(GSSC-MLLR-742, scope=range_end, role=Test)

// @relation(GSSC-MLLR-743, scope=range_start, role=Test)
test('GSSC-MLLR-743 Lexical section delete chrome', async () => {
  const { root, fixture } = await setup();
  await selectSection(fixture, 'sec-a');
  const del = root.querySelector<HTMLButtonElement>('[data-slot="section-delete"]')!;
  expect(del.textContent?.trim()).toBe('Delete section');
  expect(del.className).toContain('text-gssc-dark-red');
  expect(del.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-743, scope=range_end, role=Test)

// @relation(GSSC-MLLR-744, scope=range_start, role=Test)
test('GSSC-MLLR-744 Section Delete Persists And Refreshes', async () => {
  const { root, fixture, page } = await setup();
  await selectSection(fixture, 'sec-a');
  await clickSectionDelete(fixture, root);
  expect(page.mode()).toBe('idle');
  expect(page.selectedCuid()).toBeNull();
  expect(page.sections().some((row) => row.cuid === 'sec-a')).toBe(false);
  expect(page.statusMessage()).toContain('deleted');
});
// @relation(GSSC-MLLR-744, scope=range_end, role=Test)
