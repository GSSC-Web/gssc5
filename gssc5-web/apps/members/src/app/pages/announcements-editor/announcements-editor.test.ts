import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import type {
  AnnouncementListEntry,
  AnnouncementRecord,
  ContentTemplateDetail,
  ContentTemplateListEntry,
} from '../../services/announcements-api';
import {
  AnnouncementsApiToken,
  AnnouncementsEditorPage,
  type AnnouncementsApi,
} from './announcements-editor';

function sampleAnnouncement(
  overrides: Partial<AnnouncementRecord> & Pick<AnnouncementRecord, 'cuid' | 'body'> ,
): AnnouncementRecord {
  return {
    header: 'Header',
    resources: [],
    tags: [],
    index: 0,
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    imageFile: null,
    imagePosition: null,
    ...overrides,
  };
}

function createMockApi(seed: {
  list?: AnnouncementListEntry[];
  templates?: ContentTemplateListEntry[];
  templateDetail?: ContentTemplateDetail | null;
}): AnnouncementsApi & {
  createCalls: unknown[];
  updateCalls: Array<{ cuid: string; body: unknown }>;
  deleteCalls: string[];
  failCreate?: boolean;
  failUpdate?: boolean;
  failDelete?: boolean;
} {
  const list = signal(seed.list ?? []);
  const createCalls: unknown[] = [];
  const updateCalls: Array<{ cuid: string; body: unknown }> = [];
  const deleteCalls: string[] = [];
  const api = {
    createCalls,
    updateCalls,
    deleteCalls,
    failCreate: false,
    failUpdate: false,
    failDelete: false,
    list: async () => list(),
    get: async (cuid: string) => {
      const row = list().find((entry) => entry.cuid === cuid);
      return row ? sampleAnnouncement({ ...row, isPublic: true }) : null;
    },
    create: async (body: {
      body: string;
      templateId: string;
      header?: string | null;
    }) => {
      createCalls.push(body);
      if (api.failCreate) return { ok: false as const, status: 403 };
      const created = sampleAnnouncement({
        cuid: `created-${createCalls.length}`,
        body: body.body,
        header: body.header ?? null,
        isPublic: true,
      });
      list.set([...list(), created]);
      return { ok: true as const, data: created };
    },
    update: async (cuid: string, body: Record<string, unknown>) => {
      updateCalls.push({ cuid, body });
      if (api.failUpdate) return { ok: false as const, status: 403 };
      const current = list().find((entry) => entry.cuid === cuid);
      if (!current) return { ok: false as const, status: 404 };
      const next = sampleAnnouncement({
        ...current,
        header: (body['header'] as string | null | undefined) ?? current.header,
        body: (body['body'] as string | undefined) ?? current.body,
      });
      list.set(list().map((entry) => (entry.cuid === cuid ? next : entry)));
      return { ok: true as const, data: next };
    },
    remove: async (cuid: string) => {
      deleteCalls.push(cuid);
      if (api.failDelete) return { ok: false as const, status: 403 };
      list.set(list().filter((entry) => entry.cuid !== cuid));
      return { ok: true as const };
    },
    listTemplates: async () => seed.templates ?? [],
    getTemplate: async () => seed.templateDetail ?? null,
  };
  return api;
}

async function setupPage(api: AnnouncementsApi) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [AnnouncementsEditorPage],
    providers: [EditorSession, { provide: AnnouncementsApiToken, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(AnnouncementsEditorPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, root: nativeElement(fixture), page: fixture.componentInstance };
}

async function typeField(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  label: string,
  value: string,
): Promise<void> {
  const fields = Array.from(root.querySelectorAll('gssc-form-text-field'));
  const field = fields.find((node) =>
    node.querySelector('.gssc-form-text-field__label')?.textContent?.includes(label),
  );
  const input = field?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  expect(input).not.toBeNull();
  input!.value = value;
  input!.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

async function chooseSelect(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  label: string,
  value: string,
): Promise<void> {
  const fields = Array.from(root.querySelectorAll('gssc-form-select-field'));
  const field = fields.find((node) =>
    node.querySelector('.gssc-form-select-field__label')?.textContent?.includes(label),
  );
  const select = field?.querySelector<HTMLSelectElement>('.gssc-form-select-field__control');
  expect(select).not.toBeNull();
  select!.value = value;
  select!.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
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

async function clickSave(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
): Promise<void> {
  const save = root.querySelector<HTMLButtonElement>('.gssc-editor__save');
  expect(save).not.toBeNull();
  expect(save!.disabled).toBe(false);
  save!.click();
  await flushAsync(fixture);
}

// @relation(GSSC-MLLR-291, scope=range_start, role=Test)
test('GSSC-MLLR-291 Semantic', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  expect(root.querySelector('.gssc-announcement-catalog')).not.toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('gssc-editor')).not.toBeNull();
  expect(root.querySelector('gssc-form-text-field')).not.toBeNull();
  expect(root.querySelector('gssc-form-select-field')).not.toBeNull();
});
// @relation(GSSC-MLLR-291, scope=range_end, role=Test)

// @relation(GSSC-MLLR-292, scope=range_start, role=Test)
test('GSSC-MLLR-292 Syntactic', async () => {
  const { root } = await setupPage(createMockApi({}));
  const page = root.querySelector('.gssc-announcements-editor-page')!;
  expect(page.classList.contains('flex')).toBe(true);
  expect(page.classList.contains('w-full')).toBe(true);
  expect(page.classList.contains('flex-col')).toBe(true);
  expect(page.classList.contains('max-w-3xl')).toBe(true);
  expect(page.classList.contains('gap-5')).toBe(true);
});
// @relation(GSSC-MLLR-292, scope=range_end, role=Test)

// @relation(GSSC-MLLR-293, scope=range_start, role=Test)
test('GSSC-MLLR-293 Lexical', async () => {
  const { root } = await setupPage(createMockApi({}));
  const page = root.querySelector('.gssc-announcements-editor-page')!;
  const title = root.querySelector('.gssc-announcements-editor-page__title')!;
  expect(page.classList.contains('bg-gssc-white')).toBe(true);
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(title.classList.contains('font-sans') || page.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-MLLR-293, scope=range_end, role=Test)

// @relation(GSSC-MLLR-294, scope=range_start, role=Test)
test('GSSC-MLLR-294 Semantic', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  expect(textContent(root, '.gssc-announcement-catalog__item')).toBe('Alpha');
  expect(root.querySelector('.gssc-announcement-catalog__create')).not.toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(root, '.gssc-editor__title')).toBe('Edit announcement');
});
// @relation(GSSC-MLLR-294, scope=range_end, role=Test)

// @relation(GSSC-MLLR-295, scope=range_start, role=Test)
test('GSSC-MLLR-295 Syntactic', async () => {
  const { root } = await setupPage(createMockApi({}));
  const catalog = root.querySelector('.gssc-announcement-catalog')!;
  const list = root.querySelector('.gssc-announcement-catalog__list')!;
  expect(catalog.classList.contains('w-full')).toBe(true);
  expect(list.classList.contains('max-h-40')).toBe(true);
  expect(list.classList.contains('overflow-y-auto')).toBe(true);
  const catalogIndex = Array.from(root.children[0]?.children ?? []).indexOf(catalog);
  expect(catalogIndex).toBeGreaterThanOrEqual(0);
});
// @relation(GSSC-MLLR-295, scope=range_end, role=Test)

// @relation(GSSC-MLLR-296, scope=range_start, role=Test)
test('GSSC-MLLR-296 Lexical', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  const catalog = root.querySelector('.gssc-announcement-catalog')!;
  expect(catalog.classList.contains('font-sans')).toBe(true);
  expect(catalog.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(catalog.classList.contains('border-gssc-gray')).toBe(true);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(
    root.querySelector('.gssc-announcement-catalog__item')!.classList.contains('bg-gssc-light-green'),
  ).toBe(true);
});
// @relation(GSSC-MLLR-296, scope=range_end, role=Test)

// @relation(GSSC-MLLR-297, scope=range_start, role=Test)
test('GSSC-MLLR-297 Semantic', async () => {
  const api = createMockApi({
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const labels = Array.from(root.querySelectorAll('.gssc-form-text-field__label, .gssc-form-select-field__label')).map(
    (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
  );
  expect(labels.some((label) => label?.includes('Content Template'))).toBe(true);
  expect(labels.some((label) => label?.includes('Header'))).toBe(true);
  expect(labels.some((label) => label?.includes('Body'))).toBe(true);
  expect(labels.some((label) => label?.includes('Publication Target'))).toBe(true);
});
// @relation(GSSC-MLLR-297, scope=range_end, role=Test)

// @relation(GSSC-MLLR-298, scope=range_start, role=Test)
test('GSSC-MLLR-298 Syntactic', async () => {
  const { root, fixture } = await setupPage(createMockApi({ templates: [{ cuid: 't1', name: 'T' }] }));
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const page = root.querySelector('.gssc-announcements-editor-page')!;
  const catalog = page.querySelector('.gssc-announcement-catalog')!;
  const editor = page.querySelector('.gssc-announcement-editor')!;
  expect(editor.classList.contains('w-full')).toBe(true);
  expect(
    catalog.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-MLLR-298, scope=range_end, role=Test)

// @relation(GSSC-MLLR-299, scope=range_start, role=Test)
test('GSSC-MLLR-299 Lexical', async () => {
  const { root, fixture } = await setupPage(createMockApi({ templates: [{ cuid: 't1', name: 'T' }] }));
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-editor')).not.toBeNull();
  expect(root.querySelector('.gssc-form-text-field')).not.toBeNull();
  expect(root.querySelector('.gssc-form-select-field')).not.toBeNull();
});
// @relation(GSSC-MLLR-299, scope=range_end, role=Test)

// @relation(GSSC-MLLR-300, scope=range_start, role=Test)
test('GSSC-MLLR-300 Catalog Load', async () => {
  const api = createMockApi({
    list: [
      sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' }),
      sampleAnnouncement({ cuid: 'a2', body: 'Two', header: 'Bravo' }),
    ],
  });
  const { root } = await setupPage(api);
  const items = Array.from(root.querySelectorAll('.gssc-announcement-catalog__item')).map((node) =>
    node.textContent?.trim(),
  );
  expect(items).toEqual(['Alpha', 'Bravo']);
});
// @relation(GSSC-MLLR-300, scope=range_end, role=Test)

// @relation(GSSC-MLLR-301, scope=range_start, role=Test)
test('GSSC-MLLR-301 Create Announcement', async () => {
  const api = createMockApi({
    templates: [{ cuid: 't1', name: 'Public' }],
    templateDetail: {
      cuid: 't1',
      name: 'Public',
      isPublic: true,
      tags: [],
      createPerm: 1,
      modifyPerm: 1,
      deletePerm: 1,
    },
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await chooseSelect(fixture, root, 'Content Template', 't1');
  await typeField(fixture, root, 'Header', 'Created');
  await typeField(fixture, root, 'Body', 'New body');
  await clickSave(fixture, root);
  expect(api.createCalls.length).toBe(1);
  expect(api.createCalls[0]).toMatchObject({
    templateId: 't1',
    body: 'New body',
    header: 'Created',
  });
  expect(textContent(root, '.gssc-announcement-catalog__item')).toBe('Created');
});
// @relation(GSSC-MLLR-301, scope=range_end, role=Test)

// @relation(GSSC-MLLR-302, scope=range_start, role=Test)
test('GSSC-MLLR-302 Modify Announcement', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'Old', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await typeField(fixture, root, 'Header', 'Updated');
  await typeField(fixture, root, 'Body', 'New body');
  await clickSave(fixture, root);
  expect(api.updateCalls.length).toBe(1);
  expect(api.updateCalls[0]).toEqual({
    cuid: 'a1',
    body: { header: 'Updated', body: 'New body' },
  });
});
// @relation(GSSC-MLLR-302, scope=range_end, role=Test)

// @relation(GSSC-MLLR-303, scope=range_start, role=Test)
test('GSSC-MLLR-303 Publish Announcement', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'Body', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await chooseSelect(fixture, root, 'Publication Target', 'members');
  await typeField(fixture, root, 'Body', 'Body');
  await clickSave(fixture, root);
  expect(api.updateCalls[0]?.body).toMatchObject({ isPublic: false, body: 'Body' });

  await chooseSelect(fixture, root, 'Publication Target', 'both');
  await clickSave(fixture, root);
  expect(api.updateCalls.at(-1)?.body).toMatchObject({ isPublic: true });
});
// @relation(GSSC-MLLR-303, scope=range_end, role=Test)

// @relation(GSSC-MLLR-304, scope=range_start, role=Test)
test('GSSC-MLLR-304 Cancel Discard', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'Original', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await typeField(fixture, root, 'Header', 'Dirty');
  await typeField(fixture, root, 'Body', 'Changed');
  root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const headerInput = Array.from(root.querySelectorAll('gssc-form-text-field'))
    .find((node) => node.querySelector('.gssc-form-text-field__label')?.textContent?.includes('Header'))
    ?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  const bodyInput = Array.from(root.querySelectorAll('gssc-form-text-field'))
    .find((node) => node.querySelector('.gssc-form-text-field__label')?.textContent?.includes('Body'))
    ?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  expect(headerInput?.value).toBe('Alpha');
  expect(bodyInput?.value).toBe('Original');
  expect(api.updateCalls.length).toBe(0);
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toContain('Discarded');
});
// @relation(GSSC-MLLR-304, scope=range_end, role=Test)

// @relation(GSSC-MLLR-305, scope=range_start, role=Test)
test('GSSC-MLLR-305 Template Required For Create', async () => {
  const api = createMockApi({
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await typeField(fixture, root, 'Body', 'Needs template');
  await clickSave(fixture, root);
  expect(api.createCalls.length).toBe(0);
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toContain('Template');
  const templateSelect = Array.from(root.querySelectorAll('gssc-form-select-field'))
    .find((node) =>
      node.querySelector('.gssc-form-select-field__label')?.textContent?.includes('Content Template'),
    )
    ?.querySelector<HTMLSelectElement>('.gssc-form-select-field__control');
  expect(Array.from(templateSelect?.options ?? []).map((option) => option.value)).toContain('t1');
});
// @relation(GSSC-MLLR-305, scope=range_end, role=Test)

// @relation(GSSC-MLLR-306, scope=range_start, role=Test)
test('GSSC-MLLR-306 Editor Mode Selection', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-editor')!.getAttribute('data-resource-id')).toBe(
    'announcement:a1',
  );
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-editor')!.getAttribute('data-resource-id')).toBe(
    'announcement:new',
  );
  expect(textContent(root, '.gssc-editor__title')).toBe('New announcement');
});
// @relation(GSSC-MLLR-306, scope=range_end, role=Test)

// @relation(GSSC-MLLR-307, scope=range_start, role=Test)
test('GSSC-MLLR-307 Persistence Feedback', async () => {
  const api = createMockApi({
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  api.failCreate = true;
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__create')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await chooseSelect(fixture, root, 'Content Template', 't1');
  await typeField(fixture, root, 'Body', 'Blocked');
  await clickSave(fixture, root);
  expect(api.createCalls.length).toBe(1);
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toContain(
    'was not saved',
  );
  expect(root.querySelector('gssc-form-text-field')).not.toBeNull();
});
// @relation(GSSC-MLLR-307, scope=range_end, role=Test)

// @relation(GSSC-MLLR-687, GSSC-MLLR-690, scope=range_start, role=Test)
test('GSSC-MLLR-687/690 Announcements intro and idle disclaimer', async () => {
  const { root } = await setupPage(createMockApi({}));
  expect(textContent(root, '.gssc-announcements-editor-page__lead')).toContain(
    'Browse announcements',
  );
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toBe(
    'Select an announcement or create a new one.',
  );
  const title = root.querySelector('.gssc-announcements-editor-page__title')!;
  expect(title.className).toContain('text-[1.75em]');
  expect(title.className).toContain('font-semibold');
});
// @relation(GSSC-MLLR-687, GSSC-MLLR-690, scope=range_end, role=Test)

// @relation(GSSC-MLLR-745, GSSC-MLLR-746, GSSC-MLLR-747, scope=range_start, role=Test)
test('GSSC-MLLR-745/746/747 Announcement Delete Control', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
  });
  const { root, fixture } = await setupPage(api);
  expect(root.querySelector('[data-slot="announcement-delete"]')).toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const del = root.querySelector<HTMLButtonElement>('[data-slot="announcement-delete"]')!;
  expect(del).toBeTruthy();
  expect(del.textContent?.trim()).toBe('Delete announcement');
  expect(del.className).toContain('text-gssc-dark-red');
  expect(del.className).toContain('font-sans');
});
// @relation(GSSC-MLLR-745, GSSC-MLLR-746, GSSC-MLLR-747, scope=range_end, role=Test)

// @relation(GSSC-MLLR-748, scope=range_start, role=Test)
test('GSSC-MLLR-748 Announcement Delete Persists And Refreshes', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'One', header: 'Alpha' })],
  });
  const { root, fixture, page } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await (
    page as unknown as { onDelete: () => Promise<void> }
  ).onDelete();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(api.deleteCalls).toEqual(['a1']);
  expect(root.querySelector('.gssc-announcement-editor')).toBeNull();
  expect(root.querySelectorAll('.gssc-announcement-catalog__item').length).toBe(0);
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toContain('deleted');
});
// @relation(GSSC-MLLR-748, scope=range_end, role=Test)

// @relation(GSSC-MLLR-757, GSSC-MLLR-758, GSSC-MLLR-759, scope=range_start, role=Test)
test('GSSC-MLLR-757/758/759 Announcement Copy to New Control', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'Source body', header: 'Source' })],
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  const copy = root.querySelector<HTMLButtonElement>('[data-slot="announcement-copy"]')!;
  expect(copy).toBeTruthy();
  expect(copy.disabled).toBe(true);
  expect(copy.textContent?.trim()).toBe('Copy to New Announcement');
  expect(copy.className).toContain('text-gssc-dark-green');
  expect(copy.className).toContain('font-sans');
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(copy.disabled).toBe(false);
});
// @relation(GSSC-MLLR-757, GSSC-MLLR-758, GSSC-MLLR-759, scope=range_end, role=Test)

// @relation(GSSC-MLLR-760, scope=range_start, role=Test)
test('GSSC-MLLR-760 Announcement Copy Prefills Create Draft', async () => {
  const api = createMockApi({
    list: [sampleAnnouncement({ cuid: 'a1', body: 'Source body', header: 'Source', isPublic: false })],
    templates: [{ cuid: 't1', name: 'Public' }],
  });
  const { root, fixture } = await setupPage(api);
  root.querySelector<HTMLButtonElement>('.gssc-announcement-catalog__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('[data-slot="announcement-copy"]')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(root.querySelector('.gssc-editor')!.getAttribute('data-resource-id')).toBe(
    'announcement:new',
  );
  expect(textContent(root, '.gssc-editor__title')).toBe('New announcement');
  const headerInput = Array.from(root.querySelectorAll('gssc-form-text-field'))
    .find((node) =>
      node.querySelector('.gssc-form-text-field__label')?.textContent?.includes('Header'),
    )
    ?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  const bodyInput = Array.from(root.querySelectorAll('gssc-form-text-field'))
    .find((node) =>
      node.querySelector('.gssc-form-text-field__label')?.textContent?.includes('Body'),
    )
    ?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  expect(headerInput?.value).toBe('Source');
  expect(bodyInput?.value).toBe('Source body');
  expect(root.querySelector('gssc-form-select-field')).toBeTruthy();
  expect(textContent(root, '[data-slot="announcements-editor-status"]')).toContain('Copied');
});
// @relation(GSSC-MLLR-760, scope=range_end, role=Test)
