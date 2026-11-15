import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import {
  SECTION_GET_BY_CUID,
  SECTION_PATCH_BY_CUID,
  SECTIONS_LIST_BY_TAG,
  type SectionDetail,
  type SectionListEntry,
  type SectionPatchBody,
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

type Harness = {
  listByTag: (tag: string) => Promise<SectionListEntry[]>;
  getByCuid: (cuid: string) => Promise<SectionDetail | null>;
  patchByCuid: (
    cuid: string,
    body: SectionPatchBody,
  ) => Promise<{ ok: true; detail: SectionDetail } | { ok: false; forbidden: boolean }>;
};

function defaultHarness(overrides?: Partial<Harness>): Harness {
  return {
    listByTag: async (tag: string) => (tag === 'home' ? sampleList : []),
    getByCuid: async (cuid: string) => {
      if (cuid === 'sec-a') return sampleDetailA;
      if (cuid === 'sec-b') return sampleDetailB;
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
        tags: sampleDetailA.tags,
        index: sampleDetailA.index,
      },
    }),
    ...overrides,
  };
}

async function setup(overrides?: Partial<Harness>) {
  const harness = defaultHarness(overrides);
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [PageSectionEditorPage],
    providers: [
      EditorSession,
      { provide: SECTIONS_LIST_BY_TAG, useValue: harness.listByTag },
      { provide: SECTION_GET_BY_CUID, useValue: harness.getByCuid },
      { provide: SECTION_PATCH_BY_CUID, useValue: harness.patchByCuid },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PageSectionEditorPage);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, page: fixture.componentInstance, root: nativeElement(fixture), harness };
}

async function selectPage(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown>; componentInstance: PageSectionEditorPage },
  tag: string,
): Promise<void> {
  fixture.componentInstance.onPageTagChange(tag);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
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

// @relation(GSSC-MLLR-261, scope=range_start, role=Test)
test('GSSC-MLLR-261 Semantic', async () => {
  const { root, fixture } = await setup();
  expect(root.querySelector('[data-slot="page-section-editor"]')).toBeTruthy();
  expect(textContent(root, '.gssc-page-section-editor__title')).toContain('Page');
  await selectPage(fixture, 'home');
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
  expect(page.className).toContain('max-w-4xl');
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
  expect(root.querySelector('.gssc-page-section-editor__page-selector')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-page')).toBeTruthy();
  await selectPage(fixture, 'home');
  expect(page.selectedPageTag()).toBe('home');
});
// @relation(GSSC-MLLR-264, scope=range_end, role=Test)

// @relation(GSSC-MLLR-265, scope=range_start, role=Test)
test('GSSC-MLLR-265 Syntactic', async () => {
  const { root } = await setup();
  const selector = root.querySelector('.gssc-page-section-editor__page-selector')!;
  expect(selector.className).toContain('flex');
  expect(selector.className).toContain('w-full');
  expect(selector.className).toContain('flex-col');
});
// @relation(GSSC-MLLR-265, scope=range_end, role=Test)

// @relation(GSSC-MLLR-266, scope=range_start, role=Test)
test('GSSC-MLLR-266 Lexical', async () => {
  const { root } = await setup();
  const field = root.querySelector('.gssc-page-section-editor__page-selector .gssc-form-select-field')!;
  expect(field.className).toContain('border-gssc-dark-green');
  expect(field.className).toContain('bg-gssc-white');
  expect(field.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-266, scope=range_end, role=Test)

// @relation(GSSC-MLLR-267, scope=range_start, role=Test)
test('GSSC-MLLR-267 Semantic', async () => {
  const { root, fixture } = await setup();
  expect(root.querySelector('[data-slot="section-list"]')).toBeNull();
  await selectPage(fixture, 'home');
  const list = root.querySelector('[data-slot="section-list"]')!;
  expect(list).toBeTruthy();
  expect(list.querySelectorAll('.gssc-page-section-editor__section-item').length).toBe(2);
  expect(textContent(list, '.gssc-page-section-editor__section-item')).toContain('Alpha');
});
// @relation(GSSC-MLLR-267, scope=range_end, role=Test)

// @relation(GSSC-MLLR-268, scope=range_start, role=Test)
test('GSSC-MLLR-268 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  const list = root.querySelector('.gssc-page-section-editor__section-list')!;
  expect(list.className).toContain('flex');
  expect(list.className).toContain('flex-col');
  expect(list.className).toContain('w-full');
});
// @relation(GSSC-MLLR-268, scope=range_end, role=Test)

// @relation(GSSC-MLLR-269, scope=range_start, role=Test)
test('GSSC-MLLR-269 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  const list = root.querySelector('.gssc-page-section-editor__section-list')!;
  expect(list.className).toContain('border-gssc-gray');
  expect(list.className).toContain('bg-gssc-white');
  const title = root.querySelector('.gssc-page-section-editor__section-list-title')!;
  expect(title.className).toContain('text-gssc-dark-green');
  expect(title.className).toContain('font-semibold');
});
// @relation(GSSC-MLLR-269, scope=range_end, role=Test)

// @relation(GSSC-MLLR-270, scope=range_start, role=Test)
test('GSSC-MLLR-270 Semantic', async () => {
  const { root, fixture, page } = await setup();
  await selectPage(fixture, 'home');
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
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  const item = root.querySelector('.gssc-page-section-editor__section-item')!;
  expect(item.className).toContain('w-full');
  expect(item.className).toContain('text-left');
});
// @relation(GSSC-MLLR-271, scope=range_end, role=Test)

// @relation(GSSC-MLLR-272, scope=range_start, role=Test)
test('GSSC-MLLR-272 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  const item = root.querySelector('.gssc-page-section-editor__section-item')!;
  expect(item.className).toContain('font-sans');
  expect(item.className).toContain('text-gssc-dark-green');
  expect(item.className).toContain('text-sm');
});
// @relation(GSSC-MLLR-272, scope=range_end, role=Test)

// @relation(GSSC-MLLR-273, scope=range_start, role=Test)
test('GSSC-MLLR-273 Semantic', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  const editor = root.querySelector('gssc-editor .gssc-editor')!;
  expect(editor).toBeTruthy();
  expect(editor.getAttribute('data-resource-id')).toBe('section:sec-a');
  expect(root.querySelector('#page-section-editor-header')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-body')).toBeTruthy();
  expect(root.querySelector('#page-section-editor-image-position')).toBeTruthy();
});
// @relation(GSSC-MLLR-273, scope=range_end, role=Test)

// @relation(GSSC-MLLR-274, scope=range_start, role=Test)
test('GSSC-MLLR-274 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  const workspace = root.querySelector('.gssc-page-section-editor__workspace')!;
  expect(workspace.className).toContain('grid');
  expect(workspace.className).toContain('w-full');
  expect(root.querySelector('.gssc-page-section-editor__editor')).toBeTruthy();
});
// @relation(GSSC-MLLR-274, scope=range_end, role=Test)

// @relation(GSSC-MLLR-275, scope=range_start, role=Test)
test('GSSC-MLLR-275 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  const shell = root.querySelector('.gssc-editor')!;
  expect(shell.className).toContain('bg-gssc-white');
  expect(shell.className).toContain('border-gssc-gray');
  expect(shell.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-275, scope=range_end, role=Test)

// @relation(GSSC-MLLR-276, scope=range_start, role=Test)
test('GSSC-MLLR-276 Semantic', async () => {
  const { root, fixture, page } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  expect(root.querySelector('[data-slot="section-preview"]')).toBeTruthy();
  expect(root.querySelector('gssc-section')).toBeTruthy();
  page.editorHeader.set('Preview header');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(textContent(root, '.gssc-section__header')).toContain('Preview header');
});
// @relation(GSSC-MLLR-276, scope=range_end, role=Test)

// @relation(GSSC-MLLR-277, scope=range_start, role=Test)
test('GSSC-MLLR-277 Syntactic', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  const preview = root.querySelector('.gssc-page-section-editor__preview')!;
  expect(preview.className).toContain('flex');
  expect(preview.className).toContain('flex-col');
  expect(preview.className).toContain('w-full');
});
// @relation(GSSC-MLLR-277, scope=range_end, role=Test)

// @relation(GSSC-MLLR-278, scope=range_start, role=Test)
test('GSSC-MLLR-278 Lexical', async () => {
  const { root, fixture } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  const title = root.querySelector('.gssc-page-section-editor__preview-title')!;
  expect(title.className).toContain('text-gssc-dark-green');
  expect(title.className).toContain('font-semibold');
});
// @relation(GSSC-MLLR-278, scope=range_end, role=Test)

// @relation(GSSC-MLLR-279, scope=range_start, role=Test)
test('GSSC-MLLR-279 Semantic', async () => {
  const tags = signal<string[]>([]);
  const { fixture, page } = await setup({
    listByTag: async (tag: string) => {
      tags.update((t) => [...t, tag]);
      return tag === 'home' ? sampleList : [];
    },
  });
  await selectPage(fixture, 'home');
  expect(tags()).toContain('home');
  expect(page.sections().map((s) => s.cuid)).toEqual(['sec-a', 'sec-b']);
  await selectPage(fixture, 'membership-info');
  expect(page.sections()).toEqual([]);
});
// @relation(GSSC-MLLR-279, scope=range_end, role=Test)

// @relation(GSSC-MLLR-280, scope=range_start, role=Test)
test('GSSC-MLLR-280 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  expect(page.editorHeader()).toBe('Alpha header');
  expect(page.editorBody()).toBe('Alpha body');
  expect(page.editorResourcesText()).toBe('https://example.com/a');
  await selectSection(fixture, 'sec-b');
  expect(page.editorHeader()).toBe('Bravo header');
  expect(page.editorImagePosition()).toBe('left');
});
// @relation(GSSC-MLLR-280, scope=range_end, role=Test)

// @relation(GSSC-MLLR-281, scope=range_start, role=Test)
test('GSSC-MLLR-281 Semantic', async () => {
  const patches: Array<{ cuid: string; body: SectionPatchBody }> = [];
  const { fixture, page, root } = await setup({
    patchByCuid: async (cuid, body) => {
      patches.push({ cuid, body });
      return {
        ok: true,
        detail: {
          ...sampleDetailA,
          cuid,
          header: body.header ?? null,
          body: body.body ?? sampleDetailA.body,
          resources: body.resources ?? [],
        },
      };
    },
  });
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  page.editorHeader.set('Updated');
  page.editorBody.set('Updated body');
  fixture.detectChanges();
  await fixture.whenStable();
  await page.onEditorSaved();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(patches.length).toBe(1);
  expect(patches[0]!.cuid).toBe('sec-a');
  expect(patches[0]!.body.header).toBe('Updated');
  expect(patches[0]!.body.body).toBe('Updated body');
  expect(page.statusMessage()).toContain('Saved');
  expect(textContent(root, '[data-slot="editor-status"]')).toContain('Saved');
});
// @relation(GSSC-MLLR-281, scope=range_end, role=Test)

// @relation(GSSC-MLLR-282, scope=range_start, role=Test)
test('GSSC-MLLR-282 Semantic', async () => {
  const { fixture, page, root } = await setup();
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  page.editorHeader.set('Dirty');
  fixture.detectChanges();
  const input = root.querySelector<HTMLInputElement>('#page-section-editor-header')!;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.editorHeader()).toBe('Alpha header');
  expect(textContent(root, '[data-slot="editor-status"]')).toContain('Discarded');
});
// @relation(GSSC-MLLR-282, scope=range_end, role=Test)

// @relation(GSSC-MLLR-283, scope=range_start, role=Test)
test('GSSC-MLLR-283 Semantic', async () => {
  const { fixture, page, root } = await setup({
    patchByCuid: async () => ({ ok: false, forbidden: true }),
  });
  await selectPage(fixture, 'home');
  await selectSection(fixture, 'sec-a');
  page.editorHeader.set('Nope');
  fixture.detectChanges();
  await page.onEditorSaved();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.permitted()).toBe(false);
  expect(page.statusMessage()).toContain('permission');
  expect(textContent(root, '[data-slot="editor-status"]')).toContain('permission');
});
// @relation(GSSC-MLLR-283, scope=range_end, role=Test)

// @relation(GSSC-MLLR-284, scope=range_start, role=Test)
test('GSSC-MLLR-284 Semantic', async () => {
  const { fixture, page } = await setup();
  await selectPage(fixture, 'home');
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
  await selectPage(fixture, 'home');
  expect(page.selectedPageTag()).toBe('home');
  expect(page.sections().every((s) => s.tags.includes('home'))).toBe(true);
  await selectSection(fixture, 'sec-a');
  expect(page.hasSelection()).toBe(true);
});
// @relation(GSSC-MLLR-286, scope=range_end, role=Test)
