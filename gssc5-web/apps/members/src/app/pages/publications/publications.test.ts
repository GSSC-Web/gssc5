import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import { MemberSession } from '../../services/member-session';
import {
  PublicationEntry,
  publicationsApi,
} from '../../services/publications-api';
import { PublicationsPage } from './publications';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleEntries: PublicationEntry[] = [
  {
    cuid: 'pub_1',
    title: 'Stanislaus Records',
    referenceLink: 'publications/pub_1',
    description: 'County records index',
  },
  {
    cuid: 'pub_2',
    title: 'Cemetery Index',
    referenceLink: 'publications/pub_2',
    description: null,
  },
];

async function setupPublications(options?: {
  permitted?: boolean;
  entries?: PublicationEntry[];
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<PublicationsPage>>>;
  root: HTMLElement;
  page: PublicationsPage;
  session: MemberSession;
  restore: () => void;
  createCalls: PublicationEntry[];
  updateCalls: Array<{ cuid: string; body: unknown }>;
  deleteCalls: string[];
  uploadCalls: Array<{ cuid: string; fileName: string }>;
  listCalls: number;
}> {
  const originals = {
    list: publicationsApi.list,
    create: publicationsApi.create,
    update: publicationsApi.update,
    remove: publicationsApi.remove,
    uploadFile: publicationsApi.uploadFile,
  };

  let listCalls = 0;
  const createCalls: PublicationEntry[] = [];
  const updateCalls: Array<{ cuid: string; body: unknown }> = [];
  const deleteCalls: string[] = [];
  const uploadCalls: Array<{ cuid: string; fileName: string }> = [];
  let store = [...(options?.entries ?? sampleEntries)];

  publicationsApi.list = (async () => {
    listCalls += 1;
    return okResponse([...store]);
  }) as typeof publicationsApi.list;

  publicationsApi.create = (async (body) => {
    const created: PublicationEntry = {
      cuid: `pub_new_${createCalls.length + 1}`,
      title: body.title,
      referenceLink: `publications/pub_new_${createCalls.length + 1}`,
      description: body.description ?? null,
    };
    createCalls.push(created);
    store = [...store, created];
    return okResponse(created);
  }) as typeof publicationsApi.create;

  publicationsApi.update = (async (cuid, body) => {
    updateCalls.push({ cuid, body });
    store = store.map((entry) =>
      entry.cuid === cuid
        ? {
            ...entry,
            title: typeof body.title === 'string' ? body.title : entry.title,
            description:
              body.description !== undefined ? body.description ?? null : entry.description,
          }
        : entry,
    );
    return okResponse(store.find((entry) => entry.cuid === cuid)!);
  }) as typeof publicationsApi.update;

  publicationsApi.remove = (async (cuid) => {
    deleteCalls.push(cuid);
    store = store.filter((entry) => entry.cuid !== cuid);
    return okResponse(null, 204);
  }) as typeof publicationsApi.remove;

  publicationsApi.uploadFile = (async (cuid, file) => {
    uploadCalls.push({ cuid, fileName: file.name });
    return { data: { cuid, path: `publications/${cuid}` }, error: null };
  }) as typeof publicationsApi.uploadFile;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(PublicationsPage, {
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
  session.isPublicationEditor.set(permitted);
  session.isToolEditor.set(false);

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
      publicationsApi.list = originals.list;
      publicationsApi.create = originals.create;
      publicationsApi.update = originals.update;
      publicationsApi.remove = originals.remove;
      publicationsApi.uploadFile = originals.uploadFile;
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

async function chooseFile(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  name = 'doc.pdf',
): Promise<void> {
  const input = root.querySelector<HTMLInputElement>('#gssc-publication-file');
  if (!input) throw new Error('missing file input');
  const file = new File(['bytes'], name, { type: 'application/pdf' });
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    },
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
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

// @relation(GSSC-MLLR-381, scope=range_start, role=Test)
test('GSSC-MLLR-381 Semantic', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    expect(root.querySelector('[data-slot="publications-page"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="publications-list"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="publications-create"]')).toBeTruthy();
    root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
    expect(root.querySelectorAll('.gssc-form-text-field').length).toBe(2);
    expect(root.querySelector('[data-slot="publications-file-field"]')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-381, scope=range_end, role=Test)

// @relation(GSSC-MLLR-382, scope=range_start, role=Test)
test('GSSC-MLLR-382 Syntactic', async () => {
  const { root, restore } = await setupPublications();
  try {
    const page = root.querySelector('[data-slot="publications-page"]')!;
    expect(page.className).toContain('flex-col');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-382, scope=range_end, role=Test)

// @relation(GSSC-MLLR-383, scope=range_start, role=Test)
test('GSSC-MLLR-383 Lexical', async () => {
  const { root, restore } = await setupPublications();
  try {
    const heading = root.querySelector('[data-slot="publications-heading"]')!;
    expect(heading.className).toContain('font-sans');
    expect(heading.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-383, scope=range_end, role=Test)

// @relation(GSSC-MLLR-384, scope=range_start, role=Test)
test('GSSC-MLLR-384 Semantic', async () => {
  const { root, fixture, page, restore } = await setupPublications();
  try {
    expect(root.textContent).toContain('Stanislaus Records');
    root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.title()).toBe('Stanislaus Records');
    expect(page.description()).toBe('County records index');
    expect(page.fileLabel()).toBe('Current file on file');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-384, scope=range_end, role=Test)

// @relation(GSSC-MLLR-385, scope=range_start, role=Test)
test('GSSC-MLLR-385 Syntactic', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const list = root.querySelector('[data-slot="publications-list"]')!;
    const editor = root.querySelector('gssc-editor')!;
    expect(
      Boolean(list.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-385, scope=range_end, role=Test)

// @relation(GSSC-MLLR-386, scope=range_start, role=Test)
test('GSSC-MLLR-386 Lexical', async () => {
  const { root, restore } = await setupPublications();
  try {
    const item = root.querySelector('.gssc-publications-page__list-item')!;
    expect(item.className).toContain('font-sans');
    expect(item.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-386, scope=range_end, role=Test)

// @relation(GSSC-MLLR-387, scope=range_start, role=Test)
test('GSSC-MLLR-387 Semantic', async () => {
  const { root, fixture, page, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.isCreating()).toBe(true);
    expect(page.title()).toBe('');
    expect(page.description()).toBe('');
    expect(page.fileLabel()).toBe('No file chosen');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-387, scope=range_end, role=Test)

// @relation(GSSC-MLLR-388, scope=range_start, role=Test)
test('GSSC-MLLR-388 Syntactic', async () => {
  const { root, restore } = await setupPublications();
  try {
    const create = root.querySelector('[data-slot="publications-create"]')!;
    const list = root.querySelector('[data-slot="publications-list"]')!;
    expect(create.closest('[data-slot="publications-catalog-block"]')).toBeTruthy();
    expect(list.closest('[data-slot="publications-catalog-block"]')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-388, scope=range_end, role=Test)

// @relation(GSSC-MLLR-389, scope=range_start, role=Test)
test('GSSC-MLLR-389 Lexical', async () => {
  const { root, restore } = await setupPublications();
  try {
    const create = root.querySelector('[data-slot="publications-create"]')!;
    expect(create.className).toContain('font-sans');
    expect(create.className).toContain('text-gssc-dark-green');
    expect(create.className).toContain('bg-gssc-light-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-389, scope=range_end, role=Test)

// @relation(GSSC-MLLR-390, scope=range_start, role=Test)
test('GSSC-MLLR-390 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await ctx.page.onDelete();
    await settle(ctx.fixture);
    expect(ctx.deleteCalls).toEqual(['pub_1']);
    expect(ctx.root.textContent).not.toContain('Stanislaus Records');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-390, scope=range_end, role=Test)

// @relation(GSSC-MLLR-391, scope=range_start, role=Test)
test('GSSC-MLLR-391 Syntactic', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[data-slot="publications-delete"]')).toBeTruthy();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-391, scope=range_end, role=Test)

// @relation(GSSC-MLLR-392, scope=range_start, role=Test)
test('GSSC-MLLR-392 Lexical', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const del = root.querySelector('[data-slot="publications-delete"]')!;
    expect(del.className).toContain('font-sans');
    expect(del.className).toContain('text-gssc-dark-red');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-392, scope=range_end, role=Test)

// @relation(GSSC-MLLR-393, scope=range_start, role=Test)
test('GSSC-MLLR-393 Semantic', async () => {
  const denied = await setupPublications({ permitted: false });
  try {
    expect(denied.root.querySelector('[data-slot="publications-create"]')).toBeNull();
    denied.root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    denied.fixture.detectChanges();
    await denied.fixture.whenStable();
    expect(denied.root.querySelector('[data-slot="publications-delete"]')).toBeNull();
    expect(denied.root.querySelector('.gssc-editor__save')).toBeNull();
  } finally {
    denied.restore();
  }
});
// @relation(GSSC-MLLR-393, scope=range_end, role=Test)

// @relation(GSSC-MLLR-394, scope=range_start, role=Test)
test('GSSC-MLLR-394 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    expect(ctx.listCalls).toBeGreaterThanOrEqual(1);
    expect(ctx.root.textContent).toContain('Cemetery Index');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-394, scope=range_end, role=Test)

// @relation(GSSC-MLLR-395, scope=range_start, role=Test)
test('GSSC-MLLR-395 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'New Title');
    await chooseFile(ctx.fixture, ctx.root, 'new.pdf');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.createCalls.length).toBe(1);
    expect(ctx.createCalls[0].title).toBe('New Title');
    expect(ctx.uploadCalls.some((call) => call.fileName === 'new.pdf')).toBe(true);

    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="pub_2"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Cemetery Index Updated');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.updateCalls.some((call) => call.cuid === 'pub_2')).toBe(true);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-395, scope=range_end, role=Test)

// @relation(GSSC-MLLR-396, scope=range_start, role=Test)
test('GSSC-MLLR-396 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="pub_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Changed');
    expect(ctx.page.title()).toBe('Changed');
    ctx.root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    expect(ctx.page.title()).toBe('Stanislaus Records');
    expect(ctx.updateCalls.length).toBe(0);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-396, scope=range_end, role=Test)

// @relation(GSSC-MLLR-397, scope=range_start, role=Test)
test('GSSC-MLLR-397 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    const before = ctx.listCalls;
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Title', 'Refresh Me');
    await chooseFile(ctx.fixture, ctx.root, 'refresh.pdf');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.listCalls).toBeGreaterThan(before);
    expect(ctx.root.textContent).toContain('Refresh Me');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-397, scope=range_end, role=Test)

// @relation(GSSC-MLLR-700, scope=range_start, role=Test)
test('GSSC-MLLR-700 Semantic', async () => {
  const ctx = await setupPublications();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    expect(ctx.root.querySelector('[data-slot="publications-choose-file"]')).toBeTruthy();
    await chooseFile(ctx.fixture, ctx.root, 'picked.pdf');
    expect(ctx.page.fileLabel()).toBe('picked.pdf');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-700, scope=range_end, role=Test)

// @relation(GSSC-MLLR-701, scope=range_start, role=Test)
test('GSSC-MLLR-701 Syntactic', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const field = root.querySelector('[data-slot="publications-file-field"]')!;
    const title = root.querySelector('.gssc-form-text-field')!;
    expect(
      Boolean(title.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-701, scope=range_end, role=Test)

// @relation(GSSC-MLLR-702, scope=range_start, role=Test)
test('GSSC-MLLR-702 Lexical', async () => {
  const { root, fixture, restore } = await setupPublications();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="publications-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const choose = root.querySelector('[data-slot="publications-choose-file"]')!;
    expect(choose.className).toContain('font-sans');
    expect(choose.className).toContain('text-gssc-dark-green');
    expect(choose.className).toContain('bg-gssc-light-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-702, scope=range_end, role=Test)
