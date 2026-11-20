import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import { MemberSession } from '../../services/member-session';
import { KeyValueEntry, kvsApi } from '../../services/kvs-api';
import { KvsEditorPage } from './kvs-editor';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleEntries: KeyValueEntry[] = [
  { key: 'society.organizationName', value: 'GSSC' },
  { key: 'society.phoneNumber', value: '(209) 555-0100' },
];

async function setupKvs(options?: {
  permitted?: boolean;
  entries?: KeyValueEntry[];
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<KvsEditorPage>>>;
  root: HTMLElement;
  page: KvsEditorPage;
  restore: () => void;
  upsertCalls: Array<{ key: string; value: string }>;
  deleteCalls: string[];
  listCalls: number;
}> {
  const originals = {
    list: kvsApi.list,
    get: kvsApi.get,
    upsert: kvsApi.upsert,
    remove: kvsApi.remove,
  };

  let listCalls = 0;
  const upsertCalls: Array<{ key: string; value: string }> = [];
  const deleteCalls: string[] = [];
  let store = [...(options?.entries ?? sampleEntries)];

  kvsApi.list = (async () => {
    listCalls += 1;
    return okResponse([...store]);
  }) as typeof kvsApi.list;

  kvsApi.get = (async (key) => {
    const found = store.find((entry) => entry.key === key);
    if (!found) {
      return {
        data: null,
        error: { status: 404, value: 'Not Found' },
        response: new Response(null, { status: 404 }),
        status: 404,
        headers: new Headers(),
      };
    }
    return okResponse({ ...found });
  }) as typeof kvsApi.get;

  kvsApi.upsert = (async (key, value) => {
    upsertCalls.push({ key, value });
    const index = store.findIndex((entry) => entry.key === key);
    if (index >= 0) {
      store[index] = { key, value };
    } else {
      store = [...store, { key, value }];
    }
    return okResponse(undefined, 204);
  }) as typeof kvsApi.upsert;

  kvsApi.remove = (async (key) => {
    deleteCalls.push(key);
    store = store.filter((entry) => entry.key !== key);
    return okResponse(undefined, 204);
  }) as typeof kvsApi.remove;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(KvsEditorPage, {
    providers: [provideRouter([]), EditorSession],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set('user_1');
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);
  session.isAdmin.set(options?.permitted !== false);

  fixture.detectChanges();
  await fixture.whenStable();
  await fixture.componentInstance.refreshList();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    upsertCalls,
    deleteCalls,
    get listCalls() {
      return listCalls;
    },
    restore: () => {
      kvsApi.list = originals.list;
      kvsApi.get = originals.get;
      kvsApi.upsert = originals.upsert;
      kvsApi.remove = originals.remove;
    },
  };
}

function textContent(root: HTMLElement, selector: string): string {
  return (root.querySelector(selector)?.textContent ?? '').trim();
}

function hasClass(el: Element | null, token: string): boolean {
  return !!el?.classList.contains(token);
}

// @relation(GSSC-MLLR-708, scope=range_start, role=Test)
test('GSSC-MLLR-708 Semantic page hosts catalog and editor', async () => {
  const ctx = await setupKvs();
  expect(ctx.root.querySelector('[data-slot="kvs-editor-page"]')).toBeTruthy();
  expect(ctx.root.querySelector('[data-slot="kvs-list"]')).toBeTruthy();
  expect(ctx.root.querySelector('[data-slot="kvs-create"]')).toBeTruthy();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  expect(ctx.root.querySelector('gssc-editor')).toBeTruthy();
  ctx.restore();
});
// @relation(GSSC-MLLR-708, scope=range_end, role=Test)

// @relation(GSSC-MLLR-709, scope=range_start, role=Test)
test('GSSC-MLLR-709 Syntactic page stacks catalog above editor', async () => {
  const ctx = await setupKvs();
  const page = ctx.root.querySelector('[data-slot="kvs-editor-page"]')!;
  expect(hasClass(page, 'flex')).toBe(true);
  expect(hasClass(page, 'flex-col')).toBe(true);
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  const catalog = ctx.root.querySelector('[data-slot="kvs-catalog-block"]')!;
  const editor = ctx.root.querySelector('gssc-editor')!;
  expect(
    Boolean(
      catalog.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-709, scope=range_end, role=Test)

// @relation(GSSC-MLLR-710, scope=range_start, role=Test)
test('GSSC-MLLR-710 Lexical page heading uses brand type and color', async () => {
  const ctx = await setupKvs();
  const heading = ctx.root.querySelector('[data-slot="kvs-editor-heading"]')!;
  expect(textContent(ctx.root, '[data-slot="kvs-editor-heading"]')).toBe(
    'Key-Value Store',
  );
  expect(hasClass(heading, 'font-sans')).toBe(true);
  expect(hasClass(heading, 'text-gssc-dark-green')).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-710, scope=range_end, role=Test)

// @relation(GSSC-MLLR-711, scope=range_start, role=Test)
test('GSSC-MLLR-711 Semantic catalog lists keys and selects into editor', async () => {
  const ctx = await setupKvs();
  const items = [
    ...ctx.root.querySelectorAll('[data-slot="kvs-list"] [data-key]'),
  ];
  expect(items.map((el) => el.getAttribute('data-key'))).toEqual([
    'society.organizationName',
    'society.phoneNumber',
  ]);
  (items[1] as HTMLButtonElement).click();
  ctx.fixture.detectChanges();
  expect(ctx.page.selectedKey()).toBe('society.phoneNumber');
  expect(ctx.page.value()).toBe('(209) 555-0100');
  ctx.restore();
});
// @relation(GSSC-MLLR-711, scope=range_end, role=Test)

// @relation(GSSC-MLLR-712, scope=range_start, role=Test)
test('GSSC-MLLR-712 Syntactic catalog is a vertical list above the editor', async () => {
  const ctx = await setupKvs();
  const list = ctx.root.querySelector('[data-slot="kvs-list"]')!;
  expect(hasClass(list, 'flex-col')).toBe(true);
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  expect(
    Boolean(
      list.compareDocumentPosition(ctx.root.querySelector('gssc-editor')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-712, scope=range_end, role=Test)

// @relation(GSSC-MLLR-713, scope=range_start, role=Test)
test('GSSC-MLLR-713 Lexical catalog entries use sans dark-green', async () => {
  const ctx = await setupKvs();
  const item = ctx.root.querySelector('[data-slot="kvs-list"] [data-key]')!;
  expect(hasClass(item, 'font-sans')).toBe(true);
  expect(hasClass(item, 'text-gssc-dark-green')).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-713, scope=range_end, role=Test)

// @relation(GSSC-MLLR-714, scope=range_start, role=Test)
test('GSSC-MLLR-714 Semantic create starts blank entry', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  expect(ctx.page.isCreating()).toBe(true);
  expect(ctx.page.key()).toBe('');
  expect(ctx.page.value()).toBe('');
  ctx.restore();
});
// @relation(GSSC-MLLR-714, scope=range_end, role=Test)

// @relation(GSSC-MLLR-715, scope=range_start, role=Test)
test('GSSC-MLLR-715 Syntactic create appears with the catalog', async () => {
  const ctx = await setupKvs();
  const create = ctx.root.querySelector('[data-slot="kvs-create"]')!;
  const catalog = ctx.root.querySelector('[data-slot="kvs-catalog-block"]')!;
  expect(catalog.contains(create)).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-715, scope=range_end, role=Test)

// @relation(GSSC-MLLR-716, scope=range_start, role=Test)
test('GSSC-MLLR-716 Lexical create uses light-green chrome', async () => {
  const ctx = await setupKvs();
  const create = ctx.root.querySelector('[data-slot="kvs-create"]')!;
  expect(hasClass(create, 'font-sans')).toBe(true);
  expect(hasClass(create, 'text-gssc-dark-green')).toBe(true);
  expect(hasClass(create, 'bg-gssc-light-green')).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-716, scope=range_end, role=Test)

// @relation(GSSC-MLLR-717, scope=range_start, role=Test)
test('GSSC-MLLR-717 Semantic delete removes selected entry', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  await ctx.page.onDelete();
  expect(ctx.deleteCalls).toEqual(['society.organizationName']);
  expect(ctx.page.selectedKey()).toBeNull();
  ctx.restore();
});
// @relation(GSSC-MLLR-717, scope=range_end, role=Test)

// @relation(GSSC-MLLR-718, scope=range_start, role=Test)
test('GSSC-MLLR-718 Syntactic delete sits below the editor', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  const del = ctx.root.querySelector('[data-slot="kvs-delete"]')!;
  const editor = ctx.root.querySelector('gssc-editor')!;
  expect(
    Boolean(
      editor.compareDocumentPosition(del) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-718, scope=range_end, role=Test)

// @relation(GSSC-MLLR-719, scope=range_start, role=Test)
test('GSSC-MLLR-719 Lexical delete uses dark-red chrome', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  const del = ctx.root.querySelector('[data-slot="kvs-delete"]')!;
  expect(hasClass(del, 'text-gssc-dark-red')).toBe(true);
  expect(hasClass(del, 'border-gssc-dark-red')).toBe(true);
  ctx.restore();
});
// @relation(GSSC-MLLR-719, scope=range_end, role=Test)

// @relation(GSSC-MLLR-720, scope=range_start, role=Test)
test('GSSC-MLLR-720 Semantic key field is create-time editable', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  expect(ctx.page.keyEditable()).toBe(true);
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  expect(ctx.page.keyEditable()).toBe(false);
  expect(ctx.page.key()).toBe('society.organizationName');
  ctx.restore();
});
// @relation(GSSC-MLLR-720, scope=range_end, role=Test)

// @relation(GSSC-MLLR-721, scope=range_start, role=Test)
test('GSSC-MLLR-721 Syntactic key field is in the editor field area', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  const editor = ctx.root.querySelector('gssc-editor')!;
  expect(editor.querySelector('gssc-form-text-field')).toBeTruthy();
  ctx.restore();
});
// @relation(GSSC-MLLR-721, scope=range_end, role=Test)

// @relation(GSSC-MLLR-722, scope=range_start, role=Test)
test('GSSC-MLLR-722 Lexical key field uses shared form-text chrome', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  expect(ctx.root.querySelector('gssc-form-text-field')).toBeTruthy();
  ctx.restore();
});
// @relation(GSSC-MLLR-722, scope=range_end, role=Test)

// @relation(GSSC-MLLR-723, scope=range_start, role=Test)
test('GSSC-MLLR-723 Semantic value field holds the entry value', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[1]!);
  ctx.fixture.detectChanges();
  expect(ctx.page.value()).toBe('(209) 555-0100');
  ctx.page.value.set('updated');
  expect(ctx.page.value()).toBe('updated');
  ctx.restore();
});
// @relation(GSSC-MLLR-723, scope=range_end, role=Test)

// @relation(GSSC-MLLR-724, scope=range_start, role=Test)
test('GSSC-MLLR-724 Syntactic value field follows the key field', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.fixture.detectChanges();
  const fields = [
    ...ctx.root.querySelectorAll('gssc-editor gssc-form-text-field'),
  ];
  expect(fields.length).toBeGreaterThanOrEqual(2);
  ctx.restore();
});
// @relation(GSSC-MLLR-724, scope=range_end, role=Test)

// @relation(GSSC-MLLR-725, scope=range_start, role=Test)
test('GSSC-MLLR-725 Lexical value field uses shared form-text chrome', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  expect(
    ctx.root.querySelectorAll('gssc-editor gssc-form-text-field').length,
  ).toBeGreaterThanOrEqual(2);
  ctx.restore();
});
// @relation(GSSC-MLLR-725, scope=range_end, role=Test)

// @relation(GSSC-MLLR-726, scope=range_start, role=Test)
test('GSSC-MLLR-726 Semantic modification is administrator-only', async () => {
  const allowed = await setupKvs({ permitted: true });
  expect(allowed.page.permitted()).toBe(true);
  expect(allowed.root.querySelector('[data-slot="kvs-create"]')).toBeTruthy();
  allowed.restore();

  const denied = await setupKvs({ permitted: false });
  expect(denied.page.permitted()).toBe(false);
  expect(denied.root.querySelector('[data-slot="kvs-create"]')).toBeNull();
  denied.page.selectEntry(sampleEntries[0]!);
  denied.fixture.detectChanges();
  expect(denied.root.querySelector('[data-slot="kvs-delete"]')).toBeNull();
  denied.restore();
});
// @relation(GSSC-MLLR-726, scope=range_end, role=Test)

// @relation(GSSC-MLLR-727, scope=range_start, role=Test)
test('GSSC-MLLR-727 Semantic save upserts and refreshes catalog', async () => {
  const ctx = await setupKvs();
  ctx.page.startCreate();
  ctx.page.key.set('branding.favicon');
  ctx.page.value.set('/favicon.ico');
  await ctx.page.onSaved();
  expect(ctx.upsertCalls).toEqual([
    { key: 'branding.favicon', value: '/favicon.ico' },
  ]);
  expect(ctx.page.selectedKey()).toBe('branding.favicon');
  expect(ctx.listCalls).toBeGreaterThan(1);
  ctx.restore();
});
// @relation(GSSC-MLLR-727, scope=range_end, role=Test)

// @relation(GSSC-MLLR-728, scope=range_start, role=Test)
test('GSSC-MLLR-728 Semantic cancel restores baseline without writing', async () => {
  const ctx = await setupKvs();
  ctx.page.selectEntry(sampleEntries[0]!);
  ctx.fixture.detectChanges();
  ctx.page.value.set('changed');
  ctx.page.onCancelled();
  expect(ctx.page.value()).toBe('GSSC');
  expect(ctx.upsertCalls).toEqual([]);
  expect(ctx.page.statusMessage()).toBe('Discarded.');
  ctx.restore();
});
// @relation(GSSC-MLLR-728, scope=range_end, role=Test)

// @relation(GSSC-MLLR-729, scope=range_start, role=Test)
test('GSSC-MLLR-729 Semantic route mounts editor behind auth', async () => {
  const { routes } = await import('../../app.routes');
  const route = routes.find((entry) => entry.path === 'kvs');
  expect(route?.component).toBe(KvsEditorPage);
  expect(route?.canActivate?.length).toBeGreaterThan(0);
});
// @relation(GSSC-MLLR-729, scope=range_end, role=Test)
