import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import { MemberSession } from '../../services/member-session';
import {
  DASHBOARD_SECTION_LIST_BY_TAG,
  DASHBOARD_SECTION_PATCH,
  DASHBOARD_SECTIONS_TAG,
  HomePage,
  type DashboardSectionListEntry,
} from './home';

const unsetBounds = {
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
} as const;

const firstSection: BackendSectionData = {
  cuid: 'dashboard_cuid_1',
  header: 'Welcome',
  body: 'Dashboard welcome body from the backend.',
  resources: [],
  tags: [DASHBOARD_SECTIONS_TAG],
  index: 1,
  imagePosition: 'none',
  ...unsetBounds,
};

const secondSection: BackendSectionData = {
  cuid: 'dashboard_cuid_2',
  header: 'Notices',
  body: 'Dashboard notices body from the backend.',
  resources: ['/account'],
  tags: [DASHBOARD_SECTIONS_TAG],
  index: 2,
  imagePosition: 'left',
  ...unsetBounds,
};

const firstListEntry: DashboardSectionListEntry = {
  cuid: firstSection.cuid,
  header: firstSection.header,
  body: firstSection.body,
  tags: firstSection.tags,
  index: firstSection.index,
  ...unsetBounds,
};

const secondListEntry: DashboardSectionListEntry = {
  cuid: secondSection.cuid,
  header: secondSection.header,
  body: secondSection.body,
  tags: secondSection.tags,
  index: secondSection.index,
  ...unsetBounds,
};

const sectionsByCuid: Record<string, BackendSectionData> = {
  [firstSection.cuid]: firstSection,
  [secondSection.cuid]: secondSection,
};

function stubSession(isUserMod: boolean): Partial<MemberSession> {
  return {
    isUserMod: signal(isUserMod),
    loggedIn: signal(true),
    ready: signal(true),
  };
}

async function setupDashboardPage(options?: {
  listByTag?: (tag: string) => Promise<DashboardSectionListEntry[]>;
  backendGet?: (cuid: string) => Promise<BackendSectionData | null>;
  patch?: (
    cuid: string,
    body: {
      header: string | null;
      body: string;
      imagePosition: 'none' | 'left' | 'right' | null;
    },
  ) => Promise<boolean>;
  isUserMod?: boolean;
}) {
  const listByTag =
    options?.listByTag ??
    (async (tag: string) => {
      if (tag === DASHBOARD_SECTIONS_TAG) return [firstListEntry, secondListEntry];
      return [];
    });
  const backendGet =
    options?.backendGet ??
    (async (cuid: string) => sectionsByCuid[cuid] ?? null);
  const patch =
    options?.patch ??
    (async () => true);

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [
      { provide: DASHBOARD_SECTION_LIST_BY_TAG, useValue: listByTag },
      { provide: SECTION_BACKEND_GET, useValue: backendGet },
      { provide: DASHBOARD_SECTION_PATCH, useValue: patch },
      { provide: MemberSession, useValue: stubSession(options?.isUserMod ?? false) },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(HomePage);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), page: fixture.componentInstance };
}

// @relation(GSSC-MLLR-231, scope=range_start, role=Test)
test('GSSC-MLLR-231 Semantic', async () => {
  const { root, page } = await setupDashboardPage();
  expect(root.querySelector('.gssc-dashboard-page')).not.toBeNull();
  expect(page.sectionViews().map((view) => view.cuid)).toEqual([
    firstSection.cuid,
    secondSection.cuid,
  ]);
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
});
// @relation(GSSC-MLLR-231, scope=range_end, role=Test)

// @relation(GSSC-MLLR-232, scope=range_start, role=Test)
test('GSSC-MLLR-232 Syntactic', async () => {
  const { root } = await setupDashboardPage();
  const page = root.querySelector<HTMLElement>('.gssc-dashboard-page')!;
  expect(page.classList.contains('w-full')).toBe(true);
  expect(page.classList.contains('flex-col')).toBe(true);
  expect(root.querySelector('.gssc-dashboard-page__sections')).not.toBeNull();
});
// @relation(GSSC-MLLR-232, scope=range_end, role=Test)

// @relation(GSSC-MLLR-233, scope=range_start, role=Test)
test('GSSC-MLLR-233 Lexical', async () => {
  const { root } = await setupDashboardPage();
  const page = root.querySelector<HTMLElement>('.gssc-dashboard-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(page.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-233, scope=range_end, role=Test)

// @relation(GSSC-MLLR-234, scope=range_start, role=Test)
test('GSSC-MLLR-234 Semantic', async () => {
  const tags: string[] = [];
  const cuids: string[] = [];
  const { root, page } = await setupDashboardPage({
    listByTag: async (tag) => {
      tags.push(tag);
      if (tag === DASHBOARD_SECTIONS_TAG) return [firstListEntry, secondListEntry];
      return [];
    },
    backendGet: async (cuid) => {
      cuids.push(cuid);
      return sectionsByCuid[cuid] ?? null;
    },
  });

  expect(tags).toEqual([DASHBOARD_SECTIONS_TAG]);
  expect(page.sectionViews().map((view) => view.cuid)).toEqual([
    firstSection.cuid,
    secondSection.cuid,
  ]);
  expect(cuids).toEqual(
    expect.arrayContaining([firstSection.cuid, secondSection.cuid]),
  );
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(root.querySelectorAll('gssc-section').length).toBe(2);
});
// @relation(GSSC-MLLR-234, scope=range_end, role=Test)

// @relation(GSSC-MLLR-235, scope=range_start, role=Test)
test('GSSC-MLLR-235 Syntactic', async () => {
  const { root: full, page } = await setupDashboardPage();
  const sections = full.querySelector('.gssc-dashboard-page__sections');
  expect(sections).not.toBeNull();
  expect(full.querySelector('.gssc-dashboard-page')!.classList.contains('w-full')).toBe(
    true,
  );
  expect(page.sectionViews().map((view) => view.cuid)).toEqual([
    firstSection.cuid,
    secondSection.cuid,
  ]);

  const { root: empty } = await setupDashboardPage({
    listByTag: async () => [],
  });
  expect(empty.querySelector('.gssc-dashboard-page__sections')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();
});
// @relation(GSSC-MLLR-235, scope=range_end, role=Test)

// @relation(GSSC-MLLR-236, scope=range_start, role=Test)
test('GSSC-MLLR-236 Lexical', async () => {
  const { root } = await setupDashboardPage();
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(root.querySelectorAll('gssc-section').length).toBe(2);
  expect(textContent(root, 'gssc-section')).toContain('Welcome');
});
// @relation(GSSC-MLLR-236, scope=range_end, role=Test)

// @relation(GSSC-MLLR-237, scope=range_start, role=Test)
test('GSSC-MLLR-237 Semantic', async () => {
  const patches: Array<{ cuid: string; body: string }> = [];
  const { root, fixture, page } = await setupDashboardPage({
    isUserMod: true,
    patch: async (cuid, body) => {
      patches.push({ cuid, body: body.body });
      return true;
    },
  });

  expect(root.querySelectorAll('gssc-dashboard-section-editor').length).toBe(2);
  expect(root.querySelectorAll('gssc-editor').length).toBe(2);

  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();

  const bodyInput = root.querySelector<HTMLInputElement>(
    'gssc-dashboard-section-editor gssc-form-text-field input',
  );
  // Header is first field; body is second — use all inputs.
  const inputs = root.querySelectorAll<HTMLInputElement>(
    'gssc-dashboard-section-editor gssc-form-text-field input',
  );
  expect(inputs.length).toBeGreaterThanOrEqual(2);
  const bodyField = inputs[1]!;
  bodyField.value = 'Updated dashboard body';
  bodyField.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();

  const save = root.querySelector<HTMLButtonElement>('.gssc-editor__save')!;
  expect(save.disabled).toBe(false);
  save.click();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();

  expect(patches.length).toBe(1);
  expect(patches[0]!.cuid).toBe(firstSection.cuid);
  expect(patches[0]!.body).toBe('Updated dashboard body');
  expect(page.saveStatus()).toBe('Saved');
  expect(bodyInput).not.toBeNull();

  // Remounted editor after save — change then cancel restores baseline.
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
  const inputsAfter = root.querySelectorAll<HTMLInputElement>(
    'gssc-dashboard-section-editor gssc-form-text-field input',
  );
  const bodyAfter = inputsAfter[1]!;
  bodyAfter.value = 'Should discard';
  bodyAfter.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
  fixture.detectChanges();
  expect(page.saveStatus()).toBe('Discarded');
});
// @relation(GSSC-MLLR-237, scope=range_end, role=Test)

// @relation(GSSC-MLLR-238, scope=range_start, role=Test)
test('GSSC-MLLR-238 Syntactic', async () => {
  const { root: permitted } = await setupDashboardPage({ isUserMod: true });
  const section = permitted.querySelector('.gssc-dashboard-page__section')!;
  const editor = section.querySelector('gssc-dashboard-section-editor');
  expect(editor).not.toBeNull();
  expect(
    section.compareDocumentPosition(editor!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const { root: denied } = await setupDashboardPage({ isUserMod: false });
  expect(denied.querySelector('gssc-dashboard-section-editor')).toBeNull();
  expect(denied.querySelector('gssc-editor')).toBeNull();

  const { root: empty } = await setupDashboardPage({
    isUserMod: true,
    listByTag: async () => [],
  });
  expect(empty.querySelector('gssc-dashboard-section-editor')).toBeNull();
});
// @relation(GSSC-MLLR-238, scope=range_end, role=Test)

// @relation(GSSC-MLLR-239, scope=range_start, role=Test)
test('GSSC-MLLR-239 Lexical', async () => {
  const { root } = await setupDashboardPage({ isUserMod: true });
  expect(root.querySelector('gssc-editor')).not.toBeNull();
  expect(root.querySelector('gssc-form-text-field')).not.toBeNull();
  expect(root.querySelector('gssc-form-select-field')).not.toBeNull();
  expect(root.querySelector('.gssc-editor__save')).not.toBeNull();
  expect(root.querySelector('.gssc-editor__cancel')).not.toBeNull();
});
// @relation(GSSC-MLLR-239, scope=range_end, role=Test)
