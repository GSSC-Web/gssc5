import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import { MemberSession } from '../../services/member-session';
import {
  ContentTemplateDetail,
  ContentTemplateListEntry,
  templatesApi,
} from '../../services/templates-api';
import { TemplatesPage } from './templates';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleDetails: ContentTemplateDetail[] = [
  {
    cuid: 'tpl_1',
    name: 'Section Default',
    isPublic: true,
    tags: ['section'],
    createPerm: 1,
    modifyPerm: 2,
    deletePerm: 3,
  },
  {
    cuid: 'tpl_2',
    name: 'Announcement Default',
    isPublic: false,
    tags: ['announcement'],
    createPerm: 0,
    modifyPerm: 0,
    deletePerm: 0,
  },
];

function toList(entries: ContentTemplateDetail[]): ContentTemplateListEntry[] {
  return entries.map(({ cuid, name }) => ({ cuid, name }));
}

async function setupTemplates(options?: {
  permitted?: boolean;
  details?: ContentTemplateDetail[];
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<TemplatesPage>>>;
  root: HTMLElement;
  page: TemplatesPage;
  session: MemberSession;
  restore: () => void;
  createCalls: ContentTemplateDetail[];
  updateCalls: Array<{ cuid: string; body: unknown }>;
  deleteCalls: string[];
  getCalls: string[];
  listCalls: number;
}> {
  const originals = {
    list: templatesApi.list,
    get: templatesApi.get,
    create: templatesApi.create,
    update: templatesApi.update,
    remove: templatesApi.remove,
  };

  let listCalls = 0;
  const createCalls: ContentTemplateDetail[] = [];
  const updateCalls: Array<{ cuid: string; body: unknown }> = [];
  const deleteCalls: string[] = [];
  const getCalls: string[] = [];
  let store = [...(options?.details ?? sampleDetails)];

  templatesApi.list = (async () => {
    listCalls += 1;
    return okResponse(toList(store));
  }) as typeof templatesApi.list;

  templatesApi.get = (async (cuid) => {
    getCalls.push(cuid);
    const found = store.find((entry) => entry.cuid === cuid);
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
  }) as typeof templatesApi.get;

  templatesApi.create = (async (body) => {
    const created: ContentTemplateDetail = {
      cuid: `tpl_new_${createCalls.length + 1}`,
      name: body.name,
      isPublic: body.isPublic,
      tags: body.tags ?? [],
      createPerm: body.createPerm ?? 0,
      modifyPerm: body.modifyPerm ?? 0,
      deletePerm: body.deletePerm ?? 0,
    };
    createCalls.push(created);
    store = [...store, created];
    return okResponse(created, 201);
  }) as typeof templatesApi.create;

  templatesApi.update = (async (cuid, body) => {
    updateCalls.push({ cuid, body });
    store = store.map((entry) =>
      entry.cuid === cuid
        ? {
            ...entry,
            isPublic:
              body.isPublic !== undefined ? body.isPublic : entry.isPublic,
            createPerm:
              body.createPerm !== undefined ? body.createPerm : entry.createPerm,
            modifyPerm:
              body.modifyPerm !== undefined ? body.modifyPerm : entry.modifyPerm,
            deletePerm:
              body.deletePerm !== undefined ? body.deletePerm : entry.deletePerm,
          }
        : entry,
    );
    return okResponse(store.find((entry) => entry.cuid === cuid)!);
  }) as typeof templatesApi.update;

  templatesApi.remove = (async (cuid) => {
    deleteCalls.push(cuid);
    store = store.filter((entry) => entry.cuid !== cuid);
    return okResponse(null, 204);
  }) as typeof templatesApi.remove;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(TemplatesPage, {
    providers: [provideRouter([]), EditorSession],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set('user_1');
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);
  const permitted = options?.permitted !== false;
  session.isAdmin.set(permitted);
  session.isPublicationEditor.set(false);
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
    getCalls,
    get listCalls() {
      return listCalls;
    },
    restore: () => {
      templatesApi.list = originals.list;
      templatesApi.get = originals.get;
      templatesApi.create = originals.create;
      templatesApi.update = originals.update;
      templatesApi.remove = originals.remove;
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

async function chooseSelect(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  label: string,
  value: string,
): Promise<void> {
  const fields = Array.from(
    root.querySelectorAll<HTMLElement>('.gssc-form-select-field'),
  );
  const field = fields.find((el) =>
    el.querySelector('label')?.textContent?.includes(label),
  );
  const select = field?.querySelector<HTMLSelectElement>('select');
  if (!select) throw new Error(`missing select ${label}`);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
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

// @relation(GSSC-MLLR-541, scope=range_start, role=Test)
test('GSSC-MLLR-541 Semantic', async () => {
  const { root, fixture, restore } = await setupTemplates();
  try {
    expect(root.querySelector('[data-slot="templates-page"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="templates-list"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="templates-create"]')).toBeTruthy();
    root.querySelector<HTMLButtonElement>('[data-slot="templates-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
    expect(root.querySelectorAll('.gssc-form-text-field').length).toBe(5);
    expect(root.querySelectorAll('.gssc-form-select-field').length).toBe(1);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-541, scope=range_end, role=Test)

// @relation(GSSC-MLLR-542, scope=range_start, role=Test)
test('GSSC-MLLR-542 Syntactic', async () => {
  const { root, restore } = await setupTemplates();
  try {
    const page = root.querySelector('[data-slot="templates-page"]')!;
    expect(page.className).toContain('flex-col');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-542, scope=range_end, role=Test)

// @relation(GSSC-MLLR-543, scope=range_start, role=Test)
test('GSSC-MLLR-543 Lexical', async () => {
  const { root, restore } = await setupTemplates();
  try {
    const heading = root.querySelector('[data-slot="templates-heading"]')!;
    expect(heading.className).toContain('font-sans');
    expect(heading.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-543, scope=range_end, role=Test)

// @relation(GSSC-MLLR-544, scope=range_start, role=Test)
test('GSSC-MLLR-544 Semantic', async () => {
  const { root, fixture, page, getCalls, restore } = await setupTemplates();
  try {
    expect(root.textContent).toContain('Section Default');
    root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle(fixture);
    expect(getCalls).toContain('tpl_1');
    expect(page.name()).toBe('Section Default');
    expect(page.visibility()).toBe('true');
    expect(page.tagsText()).toBe('section');
    expect(page.createPerm()).toBe('1');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-544, scope=range_end, role=Test)

// @relation(GSSC-MLLR-545, scope=range_start, role=Test)
test('GSSC-MLLR-545 Syntactic', async () => {
  const { root, fixture, restore } = await setupTemplates();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle(fixture);
    const list = root.querySelector('[data-slot="templates-list"]')!;
    const editor = root.querySelector('gssc-editor')!;
    expect(
      Boolean(list.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-545, scope=range_end, role=Test)

// @relation(GSSC-MLLR-546, scope=range_start, role=Test)
test('GSSC-MLLR-546 Lexical', async () => {
  const { root, restore } = await setupTemplates();
  try {
    const item = root.querySelector('.gssc-templates-page__list-item')!;
    expect(item.className).toContain('font-sans');
    expect(item.className).toContain('text-gssc-dark-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-546, scope=range_end, role=Test)

// @relation(GSSC-MLLR-547, scope=range_start, role=Test)
test('GSSC-MLLR-547 Semantic', async () => {
  const { root, fixture, page, restore } = await setupTemplates();
  try {
    root.querySelector<HTMLButtonElement>('[data-slot="templates-create"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.isCreating()).toBe(true);
    expect(page.name()).toBe('');
    expect(page.visibility()).toBe('false');
    expect(page.tagsText()).toBe('');
    expect(page.createPerm()).toBe('0');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-547, scope=range_end, role=Test)

// @relation(GSSC-MLLR-548, scope=range_start, role=Test)
test('GSSC-MLLR-548 Syntactic', async () => {
  const { root, restore } = await setupTemplates();
  try {
    const create = root.querySelector('[data-slot="templates-create"]')!;
    const list = root.querySelector('[data-slot="templates-list"]')!;
    expect(create.closest('[data-slot="templates-catalog-block"]')).toBeTruthy();
    expect(list.closest('[data-slot="templates-catalog-block"]')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-548, scope=range_end, role=Test)

// @relation(GSSC-MLLR-549, scope=range_start, role=Test)
test('GSSC-MLLR-549 Lexical', async () => {
  const { root, restore } = await setupTemplates();
  try {
    const create = root.querySelector('[data-slot="templates-create"]')!;
    expect(create.className).toContain('font-sans');
    expect(create.className).toContain('text-gssc-dark-green');
    expect(create.className).toContain('bg-gssc-light-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-549, scope=range_end, role=Test)

// @relation(GSSC-MLLR-550, scope=range_start, role=Test)
test('GSSC-MLLR-550 Semantic', async () => {
  const ctx = await setupTemplates();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await settle(ctx.fixture);
    await ctx.page.onDelete();
    await settle(ctx.fixture);
    expect(ctx.deleteCalls).toEqual(['tpl_1']);
    expect(ctx.root.textContent).not.toContain('Section Default');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-550, scope=range_end, role=Test)

// @relation(GSSC-MLLR-551, scope=range_start, role=Test)
test('GSSC-MLLR-551 Syntactic', async () => {
  const { root, fixture, restore } = await setupTemplates();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle(fixture);
    expect(root.querySelector('[data-slot="templates-delete"]')).toBeTruthy();
    expect(root.querySelector('gssc-editor')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-551, scope=range_end, role=Test)

// @relation(GSSC-MLLR-552, scope=range_start, role=Test)
test('GSSC-MLLR-552 Lexical', async () => {
  const { root, fixture, restore } = await setupTemplates();
  try {
    root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle(fixture);
    const del = root.querySelector('[data-slot="templates-delete"]')!;
    expect(del.className).toContain('font-sans');
    expect(del.className).toContain('text-gssc-dark-red');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-552, scope=range_end, role=Test)

// @relation(GSSC-MLLR-553, scope=range_start, role=Test)
test('GSSC-MLLR-553 Semantic', async () => {
  const denied = await setupTemplates({ permitted: false });
  try {
    expect(denied.root.querySelector('[data-slot="templates-create"]')).toBeNull();
    denied.root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    denied.fixture.detectChanges();
    await denied.fixture.whenStable();
    await settle(denied.fixture);
    expect(denied.root.querySelector('[data-slot="templates-delete"]')).toBeNull();
    expect(denied.root.querySelector('.gssc-editor__save')).toBeNull();
  } finally {
    denied.restore();
  }
});
// @relation(GSSC-MLLR-553, scope=range_end, role=Test)

// @relation(GSSC-MLLR-554, scope=range_start, role=Test)
test('GSSC-MLLR-554 Semantic', async () => {
  const ctx = await setupTemplates();
  try {
    expect(ctx.listCalls).toBeGreaterThanOrEqual(1);
    expect(ctx.root.textContent).toContain('Announcement Default');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-554, scope=range_end, role=Test)

// @relation(GSSC-MLLR-555, scope=range_start, role=Test)
test('GSSC-MLLR-555 Semantic', async () => {
  const ctx = await setupTemplates();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="templates-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Name', 'New Template');
    await chooseSelect(ctx.fixture, ctx.root, 'Visibility', 'true');
    await typeField(ctx.fixture, ctx.root, 'Tags', 'alpha, beta');
    await typeField(ctx.fixture, ctx.root, 'Create Permission', '4');
    await typeField(ctx.fixture, ctx.root, 'Modify Permission', '5');
    await typeField(ctx.fixture, ctx.root, 'Delete Permission', '6');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.createCalls.length).toBe(1);
    expect(ctx.createCalls[0]).toMatchObject({
      name: 'New Template',
      isPublic: true,
      tags: ['alpha', 'beta'],
      createPerm: 4,
      modifyPerm: 5,
      deletePerm: 6,
    });

    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tpl_2"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await settle(ctx.fixture);
    await chooseSelect(ctx.fixture, ctx.root, 'Visibility', 'true');
    await typeField(ctx.fixture, ctx.root, 'Create Permission', '9');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.updateCalls.some((call) => call.cuid === 'tpl_2')).toBe(true);
    expect(ctx.updateCalls.find((call) => call.cuid === 'tpl_2')?.body).toMatchObject({
      isPublic: true,
      createPerm: 9,
    });
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-555, scope=range_end, role=Test)

// @relation(GSSC-MLLR-556, scope=range_start, role=Test)
test('GSSC-MLLR-556 Semantic', async () => {
  const ctx = await setupTemplates();
  try {
    ctx.root.querySelector<HTMLButtonElement>('[data-cuid="tpl_1"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await settle(ctx.fixture);
    await chooseSelect(ctx.fixture, ctx.root, 'Visibility', 'false');
    expect(ctx.page.visibility()).toBe('false');
    ctx.root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    expect(ctx.page.visibility()).toBe('true');
    expect(ctx.updateCalls.length).toBe(0);
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-556, scope=range_end, role=Test)

// @relation(GSSC-MLLR-557, scope=range_start, role=Test)
test('GSSC-MLLR-557 Semantic', async () => {
  const ctx = await setupTemplates();
  try {
    const before = ctx.listCalls;
    ctx.root.querySelector<HTMLButtonElement>('[data-slot="templates-create"]')!.click();
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    await typeField(ctx.fixture, ctx.root, 'Name', 'Refresh Me');
    await ctx.page.onSaved();
    await settle(ctx.fixture);
    expect(ctx.listCalls).toBeGreaterThan(before);
    expect(ctx.root.textContent).toContain('Refresh Me');
  } finally {
    ctx.restore();
  }
});
// @relation(GSSC-MLLR-557, scope=range_end, role=Test)

// @relation(GSSC-MLLR-558, scope=range_start, role=Test)
test('GSSC-MLLR-558 Semantic', async () => {
  const { routes } = await import('../../app.routes');
  const match = routes.find((route) => route.path === 'templates');
  expect(match).toBeTruthy();
  expect(match?.pathMatch).toBe('full');
  expect(match?.component).toBe(TemplatesPage);
  expect(Array.isArray(match?.canActivate)).toBe(true);
});
// @relation(GSSC-MLLR-558, scope=range_end, role=Test)
