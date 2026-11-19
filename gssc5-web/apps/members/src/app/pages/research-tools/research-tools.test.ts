import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import { MemberSession } from '../../services/member-session';
import {
  ResearchToolEntry,
  researchToolsApi,
} from '../../services/research-tools-api';
import { ResearchToolsPage } from './research-tools';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleEntries: ResearchToolEntry[] = [
  {
    cuid: 'tool_1',
    title: 'FamilySearch',
    referenceLink: 'https://www.familysearch.org',
    hasFile: false,
  },
  {
    cuid: 'tool_2',
    title: 'Ancestry Library',
    referenceLink: 'https://www.ancestry.com',
    hasFile: false,
  },
];

async function setupResearchTools(options?: {
  permitted?: boolean;
  entries?: ResearchToolEntry[];
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<ResearchToolsPage>>>;
  root: HTMLElement;
  page: ResearchToolsPage;
  session: MemberSession;
  restore: () => void;
  createCalls: ResearchToolEntry[];
  updateCalls: Array<{ cuid: string; body: unknown }>;
  deleteCalls: string[];
  uploadCalls: Array<{ cuid: string; fileName: string }>;
  listCalls: number;
}> {
  const originals = {
    list: researchToolsApi.list,
    create: researchToolsApi.create,
    update: researchToolsApi.update,
    remove: researchToolsApi.remove,
    uploadFile: researchToolsApi.uploadFile,
    get: researchToolsApi.get,
  };

  let listCalls = 0;
  const createCalls: ResearchToolEntry[] = [];
  const updateCalls: Array<{ cuid: string; body: unknown }> = [];
  const deleteCalls: string[] = [];
  const uploadCalls: Array<{ cuid: string; fileName: string }> = [];
  let store = [...(options?.entries ?? sampleEntries)];

  researchToolsApi.list = (async () => {
    listCalls += 1;
    return okResponse([...store]);
  }) as typeof researchToolsApi.list;

  researchToolsApi.get = (async (cuid) => {
    const entry = store.find((item) => item.cuid === cuid);
    return entry ? okResponse(entry) : okResponse(null, 404);
  }) as typeof researchToolsApi.get;

  researchToolsApi.create = (async (body) => {
    const created: ResearchToolEntry = {
      cuid: `tool_new_${createCalls.length + 1}`,
      title: body.title,
      referenceLink: body.referenceLink ?? '',
      hasFile: false,
    };
    createCalls.push(created);
    store = [...store, created];
    return okResponse(created);
  }) as typeof researchToolsApi.create;

  researchToolsApi.update = (async (cuid, body) => {
    updateCalls.push({ cuid, body });
    store = store.map((entry) =>
      entry.cuid === cuid
        ? {
            ...entry,
            title: typeof body.title === 'string' ? body.title : entry.title,
            referenceLink:
              typeof body.referenceLink === 'string'
                ? body.referenceLink
                : entry.referenceLink,
            hasFile:
              typeof body.referenceLink === 'string' && body.referenceLink.length > 0
                ? false
                : entry.hasFile,
          }
        : entry,
    );
    return okResponse(store.find((entry) => entry.cuid === cuid)!);
  }) as typeof researchToolsApi.update;

  researchToolsApi.uploadFile = (async (cuid, file) => {
    uploadCalls.push({ cuid, fileName: file.name });
    store = store.map((entry) =>
      entry.cuid === cuid
        ? { ...entry, hasFile: true, referenceLink: '' }
        : entry,
    );
    return { data: { cuid, path: `research-tools/${cuid}` }, error: null };
  }) as typeof researchToolsApi.uploadFile;

  researchToolsApi.remove = (async (cuid) => {
    deleteCalls.push(cuid);
    store = store.filter((entry) => entry.cuid !== cuid);
    return okResponse(null, 204);
  }) as typeof researchToolsApi.remove;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(ResearchToolsPage, {
    providers: [provideRouter([]), EditorSession],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set('user_1');
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);
  const permitted = options?.permitted !== false;
  session.isAdmin.set(false);
  session.isToolEditor.set(permitted);
  session.isPublicationEditor.set(false);

  fixture.detectChanges();
  await fixture.whenStable();
  await fixture.componentInstance.refreshList();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    createCalls,
    updateCalls,
    deleteCalls,
    uploadCalls,
    get listCalls() {
      return listCalls;
    },
    restore: () => {
      researchToolsApi.list = originals.list;
      researchToolsApi.create = originals.create;
      researchToolsApi.update = originals.update;
      researchToolsApi.remove = originals.remove;
      researchToolsApi.uploadFile = originals.uploadFile;
      researchToolsApi.get = originals.get;
    },
  };
}

async function typeField(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  label: string,
  value: string,
): Promise<void> {
  const fields = Array.from(
    root.querySelectorAll<HTMLElement>('.gssc-form-text-field'),
  );
  const field = fields.find((el) =>
    el.querySelector('label')?.textContent?.includes(label),
  );
  const input = field?.querySelector<HTMLInputElement>('.gssc-form-text-field__control');
  if (!input) throw new Error(`missing field ${label}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

async function settle(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
}

// @relation(GSSC-MLLR-398, scope=range_start, role=Test)
test('GSSC-MLLR-398 Semantic', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    expect(root.querySelector('[data-slot="research-tools-page"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="research-tools-list"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="research-tools-create"]')).toBeTruthy();
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
    expect(root.querySelector('[data-slot="research-tools-reference-kind"]')).toBeTruthy();
    expect(page.referenceMode()).toBe('url');
    expect(root.querySelectorAll('.gssc-form-text-field').length).toBe(2);
    expect(root.querySelector('[data-slot="research-tools-file-upload"]')).toBeNull();
    page.setReferenceMode('file');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[data-slot="research-tools-file-upload"]')).toBeTruthy();
    expect(
      Array.from(root.querySelectorAll('.gssc-form-text-field')).some((el) =>
        el.querySelector('label')?.textContent?.includes('Reference Link'),
      ),
    ).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-398, scope=range_end, role=Test)

// @relation(GSSC-MLLR-399, scope=range_start, role=Test)
test('GSSC-MLLR-399 Syntactic', async () => {
  const { root, restore } = await setupResearchTools();
  try {
    const page = root.querySelector('[data-slot="research-tools-page"]')!;
    expect(page.className).toContain('flex-col');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-399, scope=range_end, role=Test)

// @relation(GSSC-MLLR-400, scope=range_start, role=Test)
test('GSSC-MLLR-400 Lexical', async () => {
  const { root, restore } = await setupResearchTools();
  try {
    const heading = root.querySelector('[data-slot="research-tools-heading"]')!;
    expect(heading.className).toContain('font-sans');
    expect(heading.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-400, scope=range_end, role=Test)

// @relation(GSSC-MLLR-401, scope=range_start, role=Test)
test('GSSC-MLLR-401 Semantic', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    expect(root.textContent).toContain('FamilySearch');
    root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.title()).toBe('FamilySearch');
    expect(page.referenceLink()).toBe('https://www.familysearch.org');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-401, scope=range_end, role=Test)

// @relation(GSSC-MLLR-402, scope=range_start, role=Test)
test('GSSC-MLLR-402 Syntactic', async () => {
  const { root, fixture, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const list = root.querySelector('[data-slot="research-tools-list"]')!;
    const editor = root.querySelector('gssc-editor')!;
    expect(
      Boolean(list.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-402, scope=range_end, role=Test)

// @relation(GSSC-MLLR-403, scope=range_start, role=Test)
test('GSSC-MLLR-403 Lexical', async () => {
  const { root, restore } = await setupResearchTools();
  try {
    const item = root.querySelector('.gssc-research-tools-page__list-item')!;
    expect(item.className).toContain('font-sans');
    expect(item.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-403, scope=range_end, role=Test)

// @relation(GSSC-MLLR-404, scope=range_start, role=Test)
test('GSSC-MLLR-404 Semantic', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.isCreating()).toBe(true);
    expect(page.title()).toBe('');
    expect(page.referenceLink()).toBe('');
    expect(page.selectedFileName()).toBe('');
    expect(page.hasFile()).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-404, scope=range_end, role=Test)

// @relation(GSSC-MLLR-405, scope=range_start, role=Test)
test('GSSC-MLLR-405 Syntactic', async () => {
  const { root, restore } = await setupResearchTools();
  try {
    const create = root.querySelector('[data-slot="research-tools-create"]')!;
    const list = root.querySelector('[data-slot="research-tools-list"]')!;
    expect(create.closest('[data-slot="research-tools-catalog-block"]')).toBeTruthy();
    expect(list.closest('[data-slot="research-tools-catalog-block"]')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-405, scope=range_end, role=Test)

// @relation(GSSC-MLLR-406, scope=range_start, role=Test)
test('GSSC-MLLR-406 Lexical', async () => {
  const { root, restore } = await setupResearchTools();
  try {
    const create = root.querySelector('[data-slot="research-tools-create"]')!;
    expect(create.className).toContain('font-sans');
    expect(create.className).toContain('text-gssc-dark-green');
    expect(create.className).toContain('bg-gssc-light-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-406, scope=range_end, role=Test)

// @relation(GSSC-MLLR-407, scope=range_start, role=Test)
test('GSSC-MLLR-407 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await ctx.page.onDelete();
    await settle(ctx.fixture);
    expect(ctx.deleteCalls).toEqual(['tool_1']);
    expect(ctx.root.textContent).not.toContain('FamilySearch');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-407, scope=range_end, role=Test)

// @relation(GSSC-MLLR-408, scope=range_start, role=Test)
test('GSSC-MLLR-408 Syntactic', async () => {
  const { root, fixture, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[data-slot="research-tools-delete"]')).toBeTruthy();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-408, scope=range_end, role=Test)

// @relation(GSSC-MLLR-409, scope=range_start, role=Test)
test('GSSC-MLLR-409 Lexical', async () => {
  const { root, fixture, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const del = root.querySelector('[data-slot="research-tools-delete"]')!;
    expect(del.className).toContain('font-sans');
    expect(del.className).toContain('text-gssc-dark-red');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-409, scope=range_end, role=Test)

// @relation(GSSC-MLLR-410, scope=range_start, role=Test)
test('GSSC-MLLR-410 Semantic', async () => {
  const denied = await setupResearchTools({ permitted: false });
  try {
    expect(denied.root.querySelector('[data-slot="research-tools-create"]')).toBeNull();
    denied.root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    denied.fixture.detectChanges();
    await denied.fixture.whenStable();
    expect(denied.root.querySelector('[data-slot="research-tools-delete"]')).toBeNull();
    expect(denied.root.querySelector('.gssc-editor__save')).toBeNull();
  } finally {
    denied.restore();
  }
});
// @relation(GSSC-MLLR-410, scope=range_end, role=Test)

// @relation(GSSC-MLLR-411, scope=range_start, role=Test)
test('GSSC-MLLR-411 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    expect(ctx.listCalls).toBeGreaterThanOrEqual(1);
    expect(ctx.root.textContent).toContain('Ancestry Library');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-411, scope=range_end, role=Test)

// @relation(GSSC-MLLR-412, scope=range_start, role=Test)
test('GSSC-MLLR-412 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'New Tool');
    await typeField(ctx.fixture, ctx.root, 'Reference Link', 'https://example.com/tool');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.createCalls.length).toBe(1);
    expect(ctx.createCalls[0].title).toBe('New Tool');

    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tool_2"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Ancestry Updated');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.updateCalls.some((call) => call.cuid === 'tool_2')).toBe(true);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-412, scope=range_end, role=Test)

// @relation(GSSC-MLLR-413, scope=range_start, role=Test)
test('GSSC-MLLR-413 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tool_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Changed');
    expect(ctx.page.title()).toBe('Changed');
    ctx.root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    expect(ctx.page.title()).toBe('FamilySearch');
    expect(ctx.updateCalls.length).toBe(0);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-413, scope=range_end, role=Test)

// @relation(GSSC-MLLR-414, scope=range_start, role=Test)
test('GSSC-MLLR-414 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    const before = ctx.listCalls;
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Refresh Tool');
    await typeField(ctx.fixture, ctx.root, 'Reference Link', 'https://example.com/refresh-tool');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.listCalls).toBeGreaterThan(before);
    expect(ctx.root.textContent).toContain('Refresh Tool');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-414, scope=range_end, role=Test)

// @relation(GSSC-MLLR-697, scope=range_start, role=Test)
test('GSSC-MLLR-697 Semantic', async () => {
  const ctx = await setupResearchTools();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'File Tool');
    ctx.page.setReferenceMode('file');
    ctx.fixture.detectChanges();
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.createCalls.length).toBe(0);
    expect(ctx.page.statusMessage()).toContain('reference link or choose a file');

    const file = new File(['pdf-bytes'], 'guide.pdf', { type: 'application/pdf' });
    ctx.page.onFileSelected({
      target: { files: [file] },
    } as unknown as Event);
    ctx.fixture.detectChanges();
    expect(ctx.page.referenceMode()).toBe('file');
    expect(ctx.page.referenceLink()).toBe('');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.createCalls.length).toBe(1);
    expect(ctx.createCalls[0]?.referenceLink).toBe('');
    expect(ctx.uploadCalls).toEqual([{ cuid: 'tool_new_1', fileName: 'guide.pdf' }]);
    expect(ctx.page.hasFile()).toBe(true);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-697, scope=range_end, role=Test)

// @relation(GSSC-MLLR-698, scope=range_start, role=Test)
test('GSSC-MLLR-698 Syntactic', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    page.setReferenceMode('file');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[data-slot="research-tools-file-upload"]')).toBeTruthy();
    expect(
      Array.from(root.querySelectorAll('.gssc-form-text-field')).some((el) =>
        el.querySelector('label')?.textContent?.includes('Reference Link'),
      ),
    ).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-698, scope=range_end, role=Test)

// @relation(GSSC-MLLR-699, scope=range_start, role=Test)
test('GSSC-MLLR-699 Lexical', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    page.setReferenceMode('file');
    fixture.detectChanges();
    await fixture.whenStable();
    const fileUpload = root.querySelector('[data-slot="research-tools-file-upload"]')!;
    expect(fileUpload.className).toContain('font-sans');
    expect(fileUpload.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-699, scope=range_end, role=Test)

// @relation(GSSC-MLLR-703, scope=range_start, role=Test)
test('GSSC-MLLR-703 Semantic', async () => {
  const { root, fixture, page, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await typeField(fixture, root, 'Reference Link', 'https://example.com/xor');
    page.setReferenceMode('file');
    fixture.detectChanges();
    expect(page.referenceLink()).toBe('');
    expect(root.querySelector('[data-slot="research-tools-file-upload"]')).toBeTruthy();
    page.setReferenceMode('url');
    fixture.detectChanges();
    expect(root.querySelector('[data-slot="research-tools-file-upload"]')).toBeNull();
    expect(
      Array.from(root.querySelectorAll('.gssc-form-text-field')).some((el) =>
        el.querySelector('label')?.textContent?.includes('Reference Link'),
      ),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-703, scope=range_end, role=Test)

// @relation(GSSC-MLLR-704, scope=range_start, role=Test)
test('GSSC-MLLR-704 Syntactic', async () => {
  const { root, fixture, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const kind = root.querySelector('[data-slot="research-tools-reference-kind"]')!;
    const urlBtn = root.querySelector('[data-slot="research-tools-kind-url"]')!;
    const fileBtn = root.querySelector('[data-slot="research-tools-kind-file"]')!;
    const linkField = Array.from(
      root.querySelectorAll<HTMLElement>('.gssc-form-text-field'),
    ).find((el) => el.querySelector('label')?.textContent?.includes('Reference Link'))!;
    expect(kind.contains(urlBtn)).toBe(true);
    expect(kind.contains(fileBtn)).toBe(true);
    expect(
      Boolean(kind.compareDocumentPosition(linkField) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-704, scope=range_end, role=Test)

// @relation(GSSC-MLLR-705, scope=range_start, role=Test)
test('GSSC-MLLR-705 Lexical', async () => {
  const { root, fixture, restore } = await setupResearchTools();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="research-tools-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const kind = root.querySelector('[data-slot="research-tools-reference-kind"]')!;
    expect(kind.className).toContain('font-sans');
    expect(kind.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-705, scope=range_end, role=Test)
