import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { requireAuthGuard } from '../../services/auth-guards';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { directoryApi } from '../../services/directory-api';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { DirectoryPage } from './directory';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const fellowMember = {
  cuid: 'user_2',
  firstName: 'Grace',
  middleName: '',
  lastName: 'Hopper',
  homeCity: 'Arlington',
  homeState: 'VA',
  primaryEmail: 'grace@example.com',
  primaryPhone: '555-0200',
};

const mutedMember = {
  cuid: 'user_3',
  firstName: 'Alan',
  middleName: '',
  lastName: 'Turing',
  homeCity: 'Cambridge',
  homeState: 'EN',
};

async function setupDirectory(options?: {
  viewer?: { cuid: string; isAdmin?: boolean; isUserMod?: boolean };
  list?: unknown;
  listError?: boolean;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<DirectoryPage>>>;
  root: HTMLElement;
  page: DirectoryPage;
  session: MemberSession;
  router: Router;
  listCalls: Array<Record<string, string>>;
  restore: () => void;
}> {
  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    listUsers: directoryApi.listUsers,
  };

  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  const viewer = options?.viewer ?? { cuid: 'user_1', isAdmin: false, isUserMod: false };
  memberSessionApi.challenge = (async () =>
    okResponse({ status: 'valid', cuid: viewer.cuid })) as typeof memberSessionApi.challenge;
  memberSessionApi.getUser = (async () =>
    okResponse({
      cuid: viewer.cuid,
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      isAdmin: viewer.isAdmin === true,
      isUserMod: viewer.isUserMod === true,
    })) as typeof memberSessionApi.getUser;

  const listCalls: Array<Record<string, string>> = [];
  directoryApi.listUsers = (async (query: Record<string, string> = {}) => {
    listCalls.push({ ...query });
    if (options?.listError) {
      return {
        data: null,
        error: { status: 403, value: 'Forbidden' },
        response: new Response(null, { status: 403 }),
        status: 403,
        headers: new Headers(),
      };
    }
    return okResponse(options?.list ?? [fellowMember, mutedMember]);
  }) as typeof directoryApi.listUsers;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(DirectoryPage);
  const session = TestBed.inject(MemberSession);
  const router = TestBed.inject(Router);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set(viewer.cuid);
  session.isAdmin.set(viewer.isAdmin === true);
  session.isUserMod.set(viewer.isAdmin === true || viewer.isUserMod === true);
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    router,
    listCalls,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      directoryApi.listUsers = originals.listUsers;
    },
  };
}

// @relation(GSSC-MLLR-202, scope=range_start, role=Test)
test('GSSC-MLLR-202 Semantic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    expect(root.querySelector('.gssc-directory-page')).not.toBeNull();
    expect(root.querySelector('.gssc-directory-search')).not.toBeNull();
    expect(root.querySelector('.gssc-directory-results')).not.toBeNull();
    expect(root.querySelectorAll('gssc-contact-row').length).toBe(2);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-202, scope=range_end, role=Test)

// @relation(GSSC-MLLR-203, scope=range_start, role=Test)
test('GSSC-MLLR-203 Syntactic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const page = root.querySelector<HTMLElement>('.gssc-directory-page')!;
    const body = root.querySelector<HTMLElement>('.gssc-directory-page__body')!;
    const header = root.querySelector('.gssc-directory-page__header')!;
    const search = root.querySelector('.gssc-directory-search')!;
    const results = root.querySelector('.gssc-directory-results')!;
    expect(page.classList.contains('flex-col')).toBe(true);
    expect(body.classList.contains('md:flex-row')).toBe(true);
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-203, scope=range_end, role=Test)

// @relation(GSSC-MLLR-204, scope=range_start, role=Test)
test('GSSC-MLLR-204 Lexical', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const page = root.querySelector<HTMLElement>('.gssc-directory-page')!;
    const title = root.querySelector<HTMLElement>('.gssc-directory-page__title')!;
    expect(page.classList.contains('font-sans')).toBe(true);
    expect(page.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(title.classList.contains('font-sans')).toBe(true);
    expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-204, scope=range_end, role=Test)

async function settleFilters(
  fixture: Awaited<ReturnType<typeof setupMembersComponent<DirectoryPage>>>,
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
}

// @relation(GSSC-MLLR-205, scope=range_start, role=Test)
test('GSSC-MLLR-205 Semantic', async () => {
  const { root, page, listCalls, fixture, restore } = await setupDirectory();
  try {
    expect(root.querySelector('#gssc-directory-first-name')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-last-name')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-email')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-phone')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-city')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-state')).not.toBeNull();
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();

    listCalls.length = 0;
    page.firstName.set('Grace');
    page.lastName.set('Hopper');
    page.email.set('grace@example.com');
    page.phone.set('555');
    page.homeCity.set('Arlington');
    page.homeState.set('VA');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      phone: '555',
      homeCity: 'Arlington',
      homeState: 'VA',
    });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-205, scope=range_end, role=Test)

// @relation(GSSC-MLLR-206, scope=range_start, role=Test)
test('GSSC-MLLR-206 Syntactic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const search = root.querySelector<HTMLElement>('.gssc-directory-search')!;
    const fields = root.querySelector<HTMLElement>('.gssc-directory-search__fields')!;
    const actions = root.querySelector<HTMLElement>('.gssc-directory-search__actions')!;
    expect(search.tagName).toBe('ASIDE');
    expect(search.classList.contains('sticky')).toBe(true);
    expect(fields.classList.contains('flex-col')).toBe(true);
    expect(fields.classList.contains('sm:grid-cols-2')).toBe(false);
    expect(fields.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();
    expect(root.querySelector('.gssc-directory-search__clear')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-206, scope=range_end, role=Test)

// @relation(GSSC-MLLR-207, scope=range_start, role=Test)
test('GSSC-MLLR-207 Lexical', async () => {
  const { root, restore } = await setupDirectory();
  try {
    expect(root.querySelectorAll('gssc-form-text-field').length).toBe(6);
    const clear = root.querySelector<HTMLElement>('.gssc-directory-search__clear')!;
    expect(clear.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-207, scope=range_end, role=Test)

// @relation(GSSC-MLLR-208, scope=range_start, role=Test)
test('GSSC-MLLR-208 Semantic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const rows = root.querySelectorAll('gssc-contact-row');
    expect(rows.length).toBe(2);
    expect(textContent(root, '.gssc-contact-row__name')).toContain('Grace Hopper');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-208, scope=range_end, role=Test)

// @relation(GSSC-MLLR-209, scope=range_start, role=Test)
test('GSSC-MLLR-209 Syntactic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const results = root.querySelector<HTMLElement>('.gssc-directory-results')!;
    const list = root.querySelector<HTMLElement>('.gssc-directory-results__list')!;
    expect(results.classList.contains('flex-1')).toBe(true);
    expect(list.classList.contains('flex-col')).toBe(true);
    expect(list.classList.contains('flex')).toBe(true);
    expect(list.querySelectorAll('.gssc-directory-results__item').length).toBe(2);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-209, scope=range_end, role=Test)

// @relation(GSSC-MLLR-210, scope=range_start, role=Test)
test('GSSC-MLLR-210 Lexical', async () => {
  const emptySetup = await setupDirectory({ list: [] });
  try {
    const empty = emptySetup.root.querySelector<HTMLElement>('.gssc-directory-results__empty')!;
    expect(empty.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    emptySetup.restore();
  }

  const filled = await setupDirectory();
  try {
    const item = filled.root.querySelector<HTMLElement>('.gssc-directory-results__item')!;
    expect(item.classList.contains('border-gssc-gray')).toBe(true);
  } finally {
    filled.restore();
  }
});
// @relation(GSSC-MLLR-210, scope=range_end, role=Test)

// @relation(GSSC-MLLR-211, scope=range_start, role=Test)
test('GSSC-MLLR-211 Directory Authentication', async () => {
  const route = routes.find((entry) => entry.path === 'directory');
  expect(route).toBeDefined();
  expect(route?.component).toBe(DirectoryPage);
  expect(route?.canActivate).toEqual([requireAuthGuard]);
});
// @relation(GSSC-MLLR-211, scope=range_end, role=Test)

// @relation(GSSC-MLLR-212, scope=range_start, role=Test)
test('GSSC-MLLR-212 Directory Load And Filter', async () => {
  const { listCalls, page, fixture, restore } = await setupDirectory();
  try {
    expect(listCalls[0]).toEqual({});
    listCalls.length = 0;
    page.firstName.set('Grace');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ firstName: 'Grace' });

    listCalls.length = 0;
    await page.clearSearch();
    await settleFilters(fixture);
    expect(page.firstName()).toBe('');
    expect(listCalls.at(-1)).toEqual({});
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-212, scope=range_end, role=Test)

// @relation(GSSC-MLLR-213, scope=range_start, role=Test)
test('GSSC-MLLR-213 Directory Available Contact Methods', async () => {
  const { root, restore } = await setupDirectory({
    list: [fellowMember, mutedMember],
  });
  try {
    const rows = [...root.querySelectorAll('.gssc-contact-row')];
    expect(rows[0].querySelector('.gssc-contact-row__method-link')?.getAttribute('href')).toBe(
      'mailto:grace@example.com',
    );
    expect(rows[0].textContent).toContain('555-0200');
    expect(rows[1].querySelector('.gssc-contact-row__method-link')).toBeNull();
    expect(rows[1].textContent).toContain('Cambridge, EN');
    expect(rows[1].textContent).not.toContain('@');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-213, scope=range_end, role=Test)

// @relation(GSSC-MLLR-214, scope=range_start, role=Test)
test('GSSC-MLLR-214 Administrator Registered Members View', async () => {
  const { root, page, listCalls, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    expect(textContent(root, '.gssc-directory-page__title')).toBe('Registered Members');
    expect(textContent(root, '.gssc-directory-page__lede')).toContain('registered membership');
    listCalls.length = 0;
    page.lastName.set('Hopper');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ lastName: 'Hopper' });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-214, scope=range_end, role=Test)
