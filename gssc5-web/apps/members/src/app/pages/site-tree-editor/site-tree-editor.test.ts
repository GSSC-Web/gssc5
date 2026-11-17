import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { routes } from '../../app.routes';
import { MemberSession } from '../../services/member-session';
import {
  siteTreesApi,
  type NestedSiteTree,
  type SiteTreeFrontend,
  type SiteTreeNode,
  type SiteTreeNodeEntry,
} from '../../services/site-trees-api';
import { SiteTreeEditorPage } from './site-tree-editor';

function cloneTree(tree: NestedSiteTree): NestedSiteTree {
  return structuredClone(tree);
}

function sampleTree(frontend: SiteTreeFrontend = 'members'): NestedSiteTree {
  return {
    frontend,
    root: {
      cuid: 'root_1',
      label: frontend === 'public' ? 'Home' : 'Dashboard',
      path: '/',
      sortOrder: 0,
      sectionTag: null,
      children: [
        {
          cuid: 'node_dir',
          label: 'Directory',
          path: '/directory',
          sortOrder: 0,
          sectionTag: null,
          children: [],
        },
        {
          cuid: 'node_acct',
          label: 'Account',
          path: '/account',
          sortOrder: 1,
          sectionTag: 'account',
          children: [
            {
              cuid: 'node_pwd',
              label: 'Password',
              path: '/account',
              sortOrder: 0,
              sectionTag: null,
              children: [],
            },
          ],
        },
      ],
    },
  };
}

function entryFrom(
  node: SiteTreeNode,
  parentId: string | null,
  treeId = 'tree_1',
): SiteTreeNodeEntry {
  return {
    cuid: node.cuid,
    treeId,
    parentId,
    label: node.label,
    path: node.path,
    sortOrder: node.sortOrder,
    sectionTag: node.sectionTag,
  };
}

async function setupEditor(options?: {
  admin?: boolean;
  initial?: NestedSiteTree | null;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<SiteTreeEditorPage>>>;
  root: HTMLElement;
  page: SiteTreeEditorPage;
  session: MemberSession;
  restore: () => void;
  getCalls: SiteTreeFrontend[];
  createCalls: Array<{ frontend: SiteTreeFrontend; body: unknown }>;
  updateCalls: Array<{ frontend: SiteTreeFrontend; nodeId: string; body: unknown }>;
  deleteCalls: Array<{ frontend: SiteTreeFrontend; nodeId: string }>;
}> {
  const originals = {
    get: siteTreesApi.get,
    create: siteTreesApi.create,
    update: siteTreesApi.update,
    remove: siteTreesApi.remove,
  };

  let store = options?.initial === null ? null : cloneTree(options?.initial ?? sampleTree());
  const getCalls: SiteTreeFrontend[] = [];
  const createCalls: Array<{ frontend: SiteTreeFrontend; body: unknown }> = [];
  const updateCalls: Array<{ frontend: SiteTreeFrontend; nodeId: string; body: unknown }> = [];
  const deleteCalls: Array<{ frontend: SiteTreeFrontend; nodeId: string }> = [];

  siteTreesApi.get = async (frontend) => {
    getCalls.push(frontend);
    if (!store) return null;
    return cloneTree({ ...store, frontend });
  };

  siteTreesApi.create = async (frontend, body) => {
    createCalls.push({ frontend, body });
    if (!store) return null;
    const parentId = body.parentId ?? store.root.cuid;
    const created: SiteTreeNode = {
      cuid: `node_new_${createCalls.length}`,
      label: body.label,
      path: body.path,
      sortOrder: body.sortOrder,
      sectionTag: body.sectionTag ?? null,
      children: [],
    };
    const attach = (node: SiteTreeNode): boolean => {
      if (node.cuid === parentId) {
        node.children = [...node.children, created];
        return true;
      }
      return node.children.some(attach);
    };
    attach(store.root);
    return entryFrom(created, parentId);
  };

  siteTreesApi.update = async (frontend, nodeId, body) => {
    updateCalls.push({ frontend, nodeId, body });
    if (!store) return null;
    let found: SiteTreeNode | null = null;
    let parentId: string | null = null;
    const walk = (node: SiteTreeNode, parent: string | null) => {
      if (node.cuid === nodeId) {
        found = node;
        parentId = parent;
        return;
      }
      for (const child of node.children) walk(child, node.cuid);
    };
    walk(store.root, null);
    if (!found) return null;
    const target = found as SiteTreeNode;
    if (typeof body.label === 'string') target.label = body.label;
    if (typeof body.path === 'string') target.path = body.path;
    if (body.sortOrder !== undefined) target.sortOrder = body.sortOrder;
    if (body.sectionTag !== undefined) target.sectionTag = body.sectionTag;
    return entryFrom(target, parentId);
  };

  siteTreesApi.remove = async (frontend, nodeId) => {
    deleteCalls.push({ frontend, nodeId });
    if (!store) return false;
    const prune = (node: SiteTreeNode): boolean => {
      const next = node.children.filter((child) => child.cuid !== nodeId);
      if (next.length !== node.children.length) {
        node.children = next;
        return true;
      }
      return node.children.some(prune);
    };
    return prune(store.root);
  };

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(SiteTreeEditorPage, {
    providers: [provideRouter([])],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set('user_1');
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);
  session.isAdmin.set(options?.admin !== false);
  session.isUserMod.set(options?.admin !== false);
  session.isNewsletterEditor.set(false);
  session.isPublicationEditor.set(false);
  session.isToolEditor.set(false);

  fixture.detectChanges();
  await fixture.whenStable();
  await fixture.componentInstance.ngOnInit();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    getCalls,
    createCalls,
    updateCalls,
    deleteCalls,
    restore: () => {
      siteTreesApi.get = originals.get;
      siteTreesApi.create = originals.create;
      siteTreesApi.update = originals.update;
      siteTreesApi.remove = originals.remove;
    },
  };
}

function clickNode(root: HTMLElement, cuid: string): void {
  const button = root.querySelector<HTMLButtonElement>(
    `.gssc-site-tree-outline__node[data-cuid="${cuid}"]`,
  );
  expect(button).toBeTruthy();
  button!.click();
}

// @relation(GSSC-MLLR-521, scope=range_start, role=Test)
test('GSSC-MLLR-521 Semantic', async () => {
  const admin = await setupEditor({ admin: true });
  expect(admin.getCalls).toContain('members');
  expect(admin.page.tree()?.root.label).toBe('Dashboard');
  clickNode(admin.root, 'node_dir');
  admin.fixture.detectChanges();
  expect(admin.root.querySelector('[data-slot="site-tree-create"]')).toBeTruthy();
  expect(
    admin.root.querySelector<HTMLButtonElement>('[data-slot="site-tree-save"]')?.disabled,
  ).toBe(false);
  admin.restore();

  const guest = await setupEditor({ admin: false });
  expect(guest.page.permitted()).toBe(false);
  expect(textContent(guest.root, '[data-slot="site-tree-status"]')).toContain(
    'Administrator permission is required',
  );
  clickNode(guest.root, 'node_dir');
  guest.fixture.detectChanges();
  expect(
    guest.root.querySelector<HTMLButtonElement>('[data-slot="site-tree-save"]')?.disabled,
  ).toBe(true);
  guest.restore();
});
// @relation(GSSC-MLLR-521, scope=range_end, role=Test)

// @relation(GSSC-MLLR-522, scope=range_start, role=Test)
test('GSSC-MLLR-522 Syntactic', async () => {
  const { root, restore } = await setupEditor();
  expect(root.querySelector('[data-slot="site-tree-editor-page"]')?.className).toContain(
    'w-full',
  );
  expect(root.querySelector('[data-slot="site-tree-editor-heading"]')).toBeTruthy();
  expect(root.querySelector('[data-slot="site-tree-frontend-selector"]')).toBeTruthy();
  expect(root.querySelector('[data-slot="site-tree-outline-region"]')).toBeTruthy();
  expect(root.querySelector('[data-slot="site-tree-editor-layout"]')?.className).toContain(
    'lg:flex-row',
  );
  restore();
});
// @relation(GSSC-MLLR-522, scope=range_end, role=Test)

// @relation(GSSC-MLLR-523, scope=range_start, role=Test)
test('GSSC-MLLR-523 Lexical', async () => {
  const { root, restore } = await setupEditor();
  const page = root.querySelector('[data-slot="site-tree-editor-page"]')!;
  expect(page.className).toContain('bg-gssc-white');
  expect(page.className).toContain('font-sans');
  const heading = root.querySelector('[data-slot="site-tree-editor-heading"]')!;
  expect(heading.className).toContain('text-gssc-dark-green');
  restore();
});
// @relation(GSSC-MLLR-523, scope=range_end, role=Test)

// @relation(GSSC-MLLR-524, scope=range_start, role=Test)
test('GSSC-MLLR-524 Semantic', async () => {
  const { root, page, fixture, getCalls, restore } = await setupEditor();
  const select = root.querySelector<HTMLSelectElement>(
    '[data-slot="site-tree-frontend-selector"] .gssc-form-select-field__control',
  )!;
  expect(page.frontend()).toBe('members');
  expect(getCalls[0]).toBe('members');
  expect(select.value).toBe('members');
  expect(
    [...select.options].find((option) => option.selected)?.value,
  ).toBe('members');
  expect(page.tree()?.root.label).toBe('Dashboard');

  const before = getCalls.length;
  await page.onFrontendChange('public');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.frontend()).toBe('public');
  expect(page.selectedCuid()).toBeNull();
  expect(getCalls.length).toBeGreaterThan(before);
  expect(getCalls.at(-1)).toBe('public');
  expect(select.value).toBe('public');
  restore();
});
// @relation(GSSC-MLLR-524, scope=range_end, role=Test)

// @relation(GSSC-MLLR-525, scope=range_start, role=Test)
test('GSSC-MLLR-525 Syntactic', async () => {
  const { root, restore } = await setupEditor();
  const selector = root.querySelector('[data-slot="site-tree-frontend-selector"]')!;
  const heading = root.querySelector('[data-slot="site-tree-editor-heading"]')!;
  const outline = root.querySelector('[data-slot="site-tree-outline-region"]')!;
  expect(
    heading.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    selector.compareDocumentPosition(outline) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  restore();
});
// @relation(GSSC-MLLR-525, scope=range_end, role=Test)

// @relation(GSSC-MLLR-526, scope=range_start, role=Test)
test('GSSC-MLLR-526 Lexical', async () => {
  const { root, restore } = await setupEditor();
  const label = root.querySelector(
    '[data-slot="site-tree-frontend-selector"] .gssc-form-select-field__label',
  )!;
  expect(label.className).toContain('font-sans');
  expect(label.className).toContain('text-gssc-dark-green');
  restore();
});
// @relation(GSSC-MLLR-526, scope=range_end, role=Test)

// @relation(GSSC-MLLR-527, scope=range_start, role=Test)
test('GSSC-MLLR-527 Semantic', async () => {
  const { root, page, fixture, restore } = await setupEditor();
  const labels = [
    ...root.querySelectorAll('.gssc-site-tree-outline__node'),
  ].map((el) => el.textContent?.trim());
  expect(labels).toEqual(['Dashboard', 'Directory', 'Account', 'Password']);
  clickNode(root, 'node_acct');
  fixture.detectChanges();
  expect(page.selectedCuid()).toBe('node_acct');
  expect(page.label()).toBe('Account');
  expect(page.path()).toBe('/account');
  restore();
});
// @relation(GSSC-MLLR-527, scope=range_end, role=Test)

// @relation(GSSC-MLLR-528, scope=range_start, role=Test)
test('GSSC-MLLR-528 Syntactic', async () => {
  const { root, fixture, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  const selected = root.querySelector('.gssc-site-tree-outline__node[data-cuid="node_dir"]')!;
  expect(selected.className).toContain('border-gssc-dark-green');
  const nested = root.querySelector(
    '.gssc-site-tree-outline__item .gssc-site-tree-outline',
  );
  expect(nested).toBeTruthy();
  restore();
});
// @relation(GSSC-MLLR-528, scope=range_end, role=Test)

// @relation(GSSC-MLLR-529, scope=range_start, role=Test)
test('GSSC-MLLR-529 Lexical', async () => {
  const { root, fixture, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  const selected = root.querySelector('.gssc-site-tree-outline__node[data-cuid="node_dir"]')!;
  expect(selected.className).toContain('font-sans');
  expect(selected.className).toContain('text-gssc-dark-green');
  expect(selected.className).toContain('bg-gssc-light-green');
  expect(selected.className).toContain('hover:bg-gssc-gray');
  const idle = root.querySelector('.gssc-site-tree-outline__node[data-cuid="node_acct"]')!;
  expect(idle.className).toContain('hover:bg-gssc-gray');
  restore();
});
// @relation(GSSC-MLLR-529, scope=range_end, role=Test)

// @relation(GSSC-MLLR-530, scope=range_start, role=Test)
test('GSSC-MLLR-530 Semantic', async () => {
  const { root, page, fixture, restore } = await setupEditor();
  clickNode(root, 'node_acct');
  fixture.detectChanges();
  expect(page.label()).toBe('Account');
  expect(page.path()).toBe('/account');
  expect(page.sectionTag()).toBe('account');
  expect(page.sortOrder()).toBe('1');
  restore();
});
// @relation(GSSC-MLLR-530, scope=range_end, role=Test)

// @relation(GSSC-MLLR-531, scope=range_start, role=Test)
test('GSSC-MLLR-531 Syntactic', async () => {
  const { root, fixture, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  const panel = root.querySelector('[data-slot="site-tree-node-editor"]')!;
  expect(panel.className).toContain('flex-col');
  expect(panel.querySelector('[data-slot="site-tree-actions"]')).toBeTruthy();
  restore();
});
// @relation(GSSC-MLLR-531, scope=range_end, role=Test)

// @relation(GSSC-MLLR-532, scope=range_start, role=Test)
test('GSSC-MLLR-532 Lexical', async () => {
  const { root, fixture, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  const panel = root.querySelector('[data-slot="site-tree-node-editor"]')!;
  expect(panel.className).toContain('bg-gssc-white');
  const label = panel.querySelector('.gssc-form-text-field__label')!;
  expect(label.className).toContain('font-sans');
  expect(label.className).toContain('text-gssc-dark-green');
  restore();
});
// @relation(GSSC-MLLR-532, scope=range_end, role=Test)

// @relation(GSSC-MLLR-533, scope=range_start, role=Test)
test('GSSC-MLLR-533 Semantic', async () => {
  const { root, page, fixture, createCalls, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  page.label.set('New Child');
  page.path.set('/directory/new');
  page.sectionTag.set('');
  page.sortOrder.set('2');
  await page.onCreateChild();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(createCalls).toHaveLength(1);
  expect(createCalls[0]?.body).toMatchObject({
    label: 'New Child',
    path: '/directory/new',
    parentId: 'node_dir',
    sortOrder: 2,
  });
  expect(page.selectedCuid()).toMatch(/^node_new_/);
  expect(page.statusMessage()).toBe('Created.');
  restore();
});
// @relation(GSSC-MLLR-533, scope=range_end, role=Test)

// @relation(GSSC-MLLR-534, scope=range_start, role=Test)
test('GSSC-MLLR-534 Semantic', async () => {
  const { root, page, fixture, updateCalls, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  page.label.set('Members Directory');
  page.path.set('/directory');
  page.sortOrder.set('0');
  await page.onSave();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(updateCalls.some((call) => call.nodeId === 'node_dir')).toBe(true);
  expect(page.statusMessage()).toBe('Saved.');
  expect(page.selectedCuid()).toBe('node_dir');
  restore();
});
// @relation(GSSC-MLLR-534, scope=range_end, role=Test)

// @relation(GSSC-MLLR-535, scope=range_start, role=Test)
test('GSSC-MLLR-535 Semantic', async () => {
  const { root, page, fixture, deleteCalls, restore } = await setupEditor();
  clickNode(root, 'root_1');
  fixture.detectChanges();
  expect(
    root.querySelector<HTMLButtonElement>('[data-slot="site-tree-delete"]')?.disabled,
  ).toBe(true);

  clickNode(root, 'node_pwd');
  fixture.detectChanges();
  await page.onDelete();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(deleteCalls).toEqual([{ frontend: 'members', nodeId: 'node_pwd' }]);
  expect(page.selectedCuid()).toBeNull();
  expect(page.statusMessage()).toBe('Deleted.');
  restore();
});
// @relation(GSSC-MLLR-535, scope=range_end, role=Test)

// @relation(GSSC-MLLR-536, scope=range_start, role=Test)
test('GSSC-MLLR-536 Semantic', async () => {
  const { root, page, fixture, updateCalls, restore } = await setupEditor();
  clickNode(root, 'node_acct');
  fixture.detectChanges();
  await page.onMove(-1);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(updateCalls.length).toBeGreaterThanOrEqual(2);
  expect(page.statusMessage()).toBe('Moved up.');
  expect(page.selectedCuid()).toBe('node_acct');
  restore();
});
// @relation(GSSC-MLLR-536, scope=range_end, role=Test)

// @relation(GSSC-MLLR-537, scope=range_start, role=Test)
test('GSSC-MLLR-537 Semantic', async () => {
  const { root, fixture, restore } = await setupEditor({ admin: false });
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  for (const slot of [
    'site-tree-create',
    'site-tree-save',
    'site-tree-delete',
    'site-tree-move-up',
    'site-tree-move-down',
  ]) {
    expect(root.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)?.disabled).toBe(
      true,
    );
  }
  restore();
});
// @relation(GSSC-MLLR-537, scope=range_end, role=Test)

// @relation(GSSC-MLLR-538, scope=range_start, role=Test)
test('GSSC-MLLR-538 Semantic', async () => {
  const { root, page, fixture, restore } = await setupEditor();
  clickNode(root, 'node_dir');
  fixture.detectChanges();
  page.label.set('Scratch');
  page.onDiscard();
  fixture.detectChanges();
  expect(page.label()).toBe('Directory');
  expect(page.statusMessage()).toBe('Discarded.');
  restore();
});
// @relation(GSSC-MLLR-538, scope=range_end, role=Test)

// @relation(GSSC-MLLR-539, scope=range_start, role=Test)
test('GSSC-MLLR-539 Semantic', async () => {
  const denied = await setupEditor({ admin: false });
  expect(textContent(denied.root, '[data-slot="site-tree-status"]')).toContain(
    'Administrator permission is required',
  );
  denied.restore();

  const missing = await setupEditor({ initial: null });
  expect(textContent(missing.root, '[data-slot="site-tree-status"]')).toContain(
    'Site tree unavailable',
  );
  missing.restore();
});
// @relation(GSSC-MLLR-539, scope=range_end, role=Test)

// @relation(GSSC-MLLR-540, scope=range_start, role=Test)
test('GSSC-MLLR-540 Semantic', async () => {
  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(SiteTreeEditorPage, {
    providers: [provideRouter(routes)],
  });
  const router = TestBed.inject(Router);
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.ready.set(true);
  session.isAdmin.set(true);
  const originals = {
    get: siteTreesApi.get,
  };
  siteTreesApi.get = async () => sampleTree();
  await router.navigateByUrl('/site-trees');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/site-trees');
  siteTreesApi.get = originals.get;
});
// @relation(GSSC-MLLR-540, scope=range_end, role=Test)

// @relation(GSSC-MLLR-562, scope=range_start, role=Test)
test('GSSC-MLLR-562 Semantic', async () => {
  const treeWithNewsletter = sampleTree('members');
  treeWithNewsletter.root.children.push({
    cuid: 'node_news',
    label: 'Newsletters',
    path: '/newsletters',
    sortOrder: 2,
    sectionTag: null,
    children: [],
  });

  const denied = await setupEditor({
    admin: false,
    initial: treeWithNewsletter,
  });
  denied.fixture.detectChanges();
  const deniedLabels = [
    ...denied.root.querySelectorAll('.gssc-site-tree-outline__node'),
  ].map((el) => el.textContent?.trim());
  expect(deniedLabels).toEqual(['Dashboard', 'Directory', 'Account', 'Password']);
  expect(deniedLabels).not.toContain('Newsletters');
  denied.restore();

  const allowed = await setupEditor({
    admin: false,
    initial: cloneTree(treeWithNewsletter),
  });
  allowed.session.isNewsletterEditor.set(true);
  allowed.fixture.detectChanges();
  await allowed.fixture.whenStable();
  // Recompute outline after flag change by reloading.
  await allowed.page.onFrontendChange('members');
  allowed.fixture.detectChanges();
  await allowed.fixture.whenStable();
  const allowedLabels = [
    ...allowed.root.querySelectorAll('.gssc-site-tree-outline__node'),
  ].map((el) => el.textContent?.trim());
  expect(allowedLabels).toContain('Newsletters');
  allowed.restore();

  const admin = await setupEditor({
    admin: true,
    initial: cloneTree(treeWithNewsletter),
  });
  const adminLabels = [
    ...admin.root.querySelectorAll('.gssc-site-tree-outline__node'),
  ].map((el) => el.textContent?.trim());
  expect(adminLabels).toContain('Newsletters');
  admin.restore();
});
// @relation(GSSC-MLLR-562, scope=range_end, role=Test)
