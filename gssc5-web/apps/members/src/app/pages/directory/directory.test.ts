import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
  accountPhoto: 'photo_grace',
};

const mutedMember = {
  cuid: 'user_3',
  firstName: 'Alan',
  middleName: '',
  lastName: 'Turing',
  homeCity: 'Cambridge',
  homeState: 'EN',
  accountPhoto: '',
};

const deletedMember = {
  cuid: 'user_4',
  firstName: 'Deleted',
  lastName: 'Member',
  deletedAt: '2026-11-15T00:00:00.000Z',
  accountPhoto: null,
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
  softDeleteCalls: string[];
  undeleteCalls: string[];
  inviteCalls: unknown[];
  createCalls: unknown[];
  restore: () => void;
}> {
  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    listUsers: directoryApi.listUsers,
    softDeleteUser: directoryApi.softDeleteUser,
    undeleteUser: directoryApi.undeleteUser,
    inviteUser: directoryApi.inviteUser,
    createUser: directoryApi.createUser,
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
  const softDeleteCalls: string[] = [];
  const undeleteCalls: string[] = [];
  const inviteCalls: unknown[] = [];
  const createCalls: unknown[] = [];
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

  directoryApi.softDeleteUser = (async (cuid: string) => {
    softDeleteCalls.push(cuid);
    return okResponse(null, 204);
  }) as typeof directoryApi.softDeleteUser;

  directoryApi.undeleteUser = (async (cuid: string) => {
    undeleteCalls.push(cuid);
    return okResponse(null, 204);
  }) as typeof directoryApi.undeleteUser;

  directoryApi.inviteUser = (async (body) => {
    inviteCalls.push(body);
    return okResponse({ cuid: 'invited_1' }, 201);
  }) as typeof directoryApi.inviteUser;

  directoryApi.createUser = (async (body) => {
    createCalls.push(body);
    return okResponse({ cuid: 'created_1' }, 201);
  }) as typeof directoryApi.createUser;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(DirectoryPage, {
    providers: [provideRouter(routes)],
  });
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
    softDeleteCalls,
    undeleteCalls,
    inviteCalls,
    createCalls,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      directoryApi.listUsers = originals.listUsers;
      directoryApi.softDeleteUser = originals.softDeleteUser;
      directoryApi.undeleteUser = originals.undeleteUser;
      directoryApi.inviteUser = originals.inviteUser;
      directoryApi.createUser = originals.createUser;
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
    expect(root.querySelector('#gssc-directory-name')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-email')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-phone')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-address')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-first-name')).toBeNull();
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();

    listCalls.length = 0;
    page.name.set('Grace');
    page.email.set('grace@example.com');
    page.phone.set('555');
    page.address.set('Arlington');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({
      name: 'Grace',
      email: 'grace@example.com',
      phone: '555',
      address: 'Arlington',
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
    const results = root.querySelector<HTMLElement>('.gssc-directory-results')!;
    expect(search.tagName).toBe('ASIDE');
    expect(search.classList.contains('sticky')).toBe(true);
    expect(fields.classList.contains('flex-col')).toBe(true);
    expect(fields.classList.contains('sm:grid-cols-2')).toBe(false);
    expect(fields.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();
    expect(root.querySelector('.gssc-directory-search__clear')).not.toBeNull();
    const body = root.querySelector<HTMLElement>('.gssc-directory-page__body')!;
    expect(search.classList.contains('bg-gssc-white')).toBe(true);
    expect(search.classList.contains('md:border-r-2')).toBe(true);
    expect(search.classList.contains('md:border-gssc-light-brown')).toBe(true);
    expect(search.classList.contains('md:min-h-full')).toBe(true);
    expect(body.classList.contains('md:min-h-[calc(100dvh-8rem)]')).toBe(true);
    expect(body.classList.contains('md:items-stretch')).toBe(true);
    expect(results.classList.contains('bg-gssc-white')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-206, scope=range_end, role=Test)

// @relation(GSSC-MLLR-207, scope=range_start, role=Test)
test('GSSC-MLLR-207 Lexical', async () => {
  const { root, restore } = await setupDirectory();
  try {
    expect(root.querySelectorAll('gssc-form-text-field').length).toBe(4);
    const clear = root.querySelector<HTMLElement>('.gssc-directory-search__clear')!;
    expect(clear.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(root.querySelector('.gssc-directory-search__submit')).toBeNull();
    const search = root.querySelector('.gssc-directory-search')!;
    expect(search.classList.contains('bg-gssc-white')).toBe(true);
    expect(search.classList.contains('md:border-gssc-light-brown')).toBe(true);
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
    expect(root.querySelector('.gssc-contact-row__photo')).not.toBeNull();
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
    page.name.set('Grace');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ name: 'Grace' });

    listCalls.length = 0;
    await page.clearSearch();
    await settleFilters(fixture);
    expect(page.name()).toBe('');
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
    page.name.set('Hopper');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ name: 'Hopper' });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-214, scope=range_end, role=Test)

// @relation(GSSC-MLLR-215, scope=range_start, role=Test)
test('GSSC-MLLR-215 Semantic', async () => {
  const { root, restore } = await setupDirectory({
    list: [fellowMember, mutedMember],
  });
  try {
    const photos = [...root.querySelectorAll('.gssc-contact-row__photo')];
    expect(photos.length).toBe(2);
    expect(photos[0].querySelector('.gssc-contact-row__photo-img')?.getAttribute('src')).toContain(
      'photo_grace',
    );
    expect(photos[1].querySelector('.gssc-contact-row__photo-silhouette')).not.toBeNull();
    expect(photos[1].querySelector('.gssc-contact-row__photo-img')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-215, scope=range_end, role=Test)

// @relation(GSSC-MLLR-216, scope=range_start, role=Test)
test('GSSC-MLLR-216 Syntactic', async () => {
  const { root, restore } = await setupDirectory();
  try {
    const row = root.querySelector('.gssc-contact-row')!;
    const photo = root.querySelector('.gssc-contact-row__photo')!;
    expect(row.classList.contains('flex-row')).toBe(true);
    expect(photo.classList.contains('size-16')).toBe(true);
    expect(photo.classList.contains('shrink-0')).toBe(true);
    expect(
      photo.compareDocumentPosition(root.querySelector('.gssc-contact-row__body')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-216, scope=range_end, role=Test)

// @relation(GSSC-MLLR-217, scope=range_start, role=Test)
test('GSSC-MLLR-217 Lexical', async () => {
  const { root, restore } = await setupDirectory({ list: [mutedMember] });
  try {
    const img = root.querySelector('.gssc-contact-row__photo-img');
    const silhouette = root.querySelector('.gssc-contact-row__photo-silhouette');
    expect(img).toBeNull();
    expect(silhouette).not.toBeNull();
    expect(root.querySelector('.gssc-contact-row__photo')!.classList.contains('overflow-hidden')).toBe(
      true,
    );
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-217, scope=range_end, role=Test)

// @relation(GSSC-MLLR-218, scope=range_start, role=Test)
test('GSSC-MLLR-218 Semantic', async () => {
  const member = await setupDirectory({ viewer: { cuid: 'user_1', isUserMod: true } });
  try {
    const edit = member.root.querySelector<HTMLAnchorElement>('.gssc-contact-row__edit')!;
    expect(edit).not.toBeNull();
    expect(edit.getAttribute('href')).toBe('/accounts/user_2');
    expect(edit.getAttribute('aria-label')).toBe('Edit');
    expect(edit.querySelector('.nf-md-pencil')).not.toBeNull();
  } finally {
    member.restore();
  }

  const plain = await setupDirectory({ viewer: { cuid: 'user_1', isUserMod: false } });
  try {
    expect(plain.root.querySelector('.gssc-contact-row__edit')).toBeNull();
  } finally {
    plain.restore();
  }

  const admin = await setupDirectory({ viewer: { cuid: 'admin_1', isAdmin: true } });
  try {
    expect(admin.root.querySelector('.gssc-contact-row__edit')?.getAttribute('href')).toBe(
      '/accounts/user_2',
    );
  } finally {
    admin.restore();
  }
});
// @relation(GSSC-MLLR-218, scope=range_end, role=Test)

// @relation(GSSC-MLLR-219, scope=range_start, role=Test)
test('GSSC-MLLR-219 Syntactic', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    const row = root.querySelector('.gssc-contact-row')!;
    const body = root.querySelector('.gssc-contact-row__body')!;
    const actions = root.querySelector('.gssc-contact-row__actions')!;
    expect(actions.classList.contains('items-end')).toBe(true);
    expect(body.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.lastElementChild).toBe(actions);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-219, scope=range_end, role=Test)

// @relation(GSSC-MLLR-220, scope=range_start, role=Test)
test('GSSC-MLLR-220 Lexical', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    const edit = root.querySelector<HTMLElement>('.gssc-contact-row__edit')!;
    expect(edit.classList.contains('size-8')).toBe(true);
    expect(edit.classList.contains('rounded-md')).toBe(true);
    expect(edit.classList.contains('bg-gssc-light-green')).toBe(true);
    expect(edit.classList.contains('hover:bg-gssc-gray')).toBe(true);
    expect(edit.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(edit.getAttribute('aria-label')).toBe('Edit');
    const icon = edit.querySelector('.nf-md-pencil')!;
    expect(icon).not.toBeNull();
    expect(icon.classList.contains('text-base')).toBe(true);
    expect(edit.textContent?.replace(/\s/g, '')).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-220, scope=range_end, role=Test)

// @relation(GSSC-MLLR-221, scope=range_start, role=Test)
test('GSSC-MLLR-221 Semantic', async () => {
  const admin = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
    list: [fellowMember, deletedMember],
  });
  try {
    const buttons = [...admin.root.querySelectorAll('.gssc-contact-row__soft-delete')];
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('aria-label')).toBe('Soft-delete');
    expect(buttons[0].querySelector('.nf-md-delete')).not.toBeNull();
    expect(buttons[1].getAttribute('aria-label')).toBe('Undelete');
    expect(buttons[1].querySelector('.nf-md-delete_restore')).not.toBeNull();
  } finally {
    admin.restore();
  }

  const plain = await setupDirectory({ viewer: { cuid: 'user_1', isUserMod: true } });
  try {
    expect(plain.root.querySelector('.gssc-contact-row__soft-delete')).toBeNull();
  } finally {
    plain.restore();
  }
});
// @relation(GSSC-MLLR-221, scope=range_end, role=Test)

// @relation(GSSC-MLLR-222, scope=range_start, role=Test)
test('GSSC-MLLR-222 Syntactic', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    const actions = root.querySelector('.gssc-contact-row__actions')!;
    const edit = root.querySelector('.gssc-contact-row__edit')!;
    const soft = root.querySelector('.gssc-contact-row__soft-delete')!;
    expect(actions.classList.contains('flex-col')).toBe(true);
    expect(edit.compareDocumentPosition(soft) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-222, scope=range_end, role=Test)

// @relation(GSSC-MLLR-223, scope=range_start, role=Test)
test('GSSC-MLLR-223 Lexical', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
    list: [fellowMember, deletedMember],
  });
  try {
    const soft = root.querySelectorAll('.gssc-contact-row__soft-delete');
    expect(soft[0].classList.contains('size-8')).toBe(true);
    expect(soft[0].classList.contains('rounded-md')).toBe(true);
    expect(soft[0].classList.contains('bg-gssc-light-green')).toBe(true);
    expect(soft[0].classList.contains('hover:bg-gssc-gray')).toBe(true);
    expect(soft[0].classList.contains('text-gssc-dark-green')).toBe(true);
    expect(soft[0].getAttribute('aria-label')).toBe('Soft-delete');
    expect(soft[0].querySelector('.nf-md-delete')!.classList.contains('text-base')).toBe(true);
    expect(soft[0].textContent?.replace(/\s/g, '')).toBe('');
    expect(soft[1].getAttribute('aria-label')).toBe('Undelete');
    expect(soft[1].querySelector('.nf-md-delete_restore')!.classList.contains('text-base')).toBe(
      true,
    );
    expect(soft[1].textContent?.replace(/\s/g, '')).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-223, scope=range_end, role=Test)

// @relation(GSSC-MLLR-224, scope=range_start, role=Test)
test('GSSC-MLLR-224 Soft-Delete Persists And Refreshes', async () => {
  const { root, listCalls, softDeleteCalls, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    listCalls.length = 0;
    root.querySelector<HTMLButtonElement>('.gssc-contact-row__soft-delete')!.click();
    await settleFilters(fixture);
    expect(softDeleteCalls).toEqual(['user_2']);
    expect(listCalls.length).toBeGreaterThan(0);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-224, scope=range_end, role=Test)

// @relation(GSSC-MLLR-225, scope=range_start, role=Test)
test('GSSC-MLLR-225 Undelete Persists And Refreshes', async () => {
  const { root, listCalls, undeleteCalls, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
    list: [deletedMember],
  });
  try {
    listCalls.length = 0;
    root.querySelector<HTMLButtonElement>('.gssc-contact-row__soft-delete')!.click();
    await settleFilters(fixture);
    expect(undeleteCalls).toEqual(['user_4']);
    expect(listCalls.length).toBeGreaterThan(0);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-225, scope=range_end, role=Test)

// @relation(GSSC-MLLR-226, scope=range_start, role=Test)
test('GSSC-MLLR-226 Name Criterion Backend Filter', async () => {
  const { page, listCalls, fixture, restore } = await setupDirectory();
  try {
    listCalls.length = 0;
    page.name.set('Hopper');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ name: 'Hopper' });
    expect(listCalls.at(-1)).not.toHaveProperty('firstName');
    expect(listCalls.at(-1)).not.toHaveProperty('lastName');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-226, scope=range_end, role=Test)

// @relation(GSSC-MLLR-227, scope=range_start, role=Test)
test('GSSC-MLLR-227 Address Criterion Backend Filter', async () => {
  const { page, listCalls, fixture, restore } = await setupDirectory();
  try {
    listCalls.length = 0;
    page.address.set('Arlington VA');
    await settleFilters(fixture);
    expect(listCalls.at(-1)).toEqual({ address: 'Arlington VA' });
    expect(listCalls.at(-1)).not.toHaveProperty('homeCity');
    expect(listCalls.at(-1)).not.toHaveProperty('homeState');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-227, scope=range_end, role=Test)

// @relation(GSSC-MLLR-228, scope=range_start, role=Test)
test('GSSC-MLLR-228 Semantic', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    const row = root.querySelector('.gssc-contact-row')!;
    expect(row.querySelector('.gssc-contact-row__photo')).not.toBeNull();
    expect(row.querySelector('.gssc-contact-row__body')).not.toBeNull();
    expect(row.querySelector('.gssc-contact-row__edit')).not.toBeNull();
    expect(row.querySelector('.gssc-contact-row__soft-delete')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-228, scope=range_end, role=Test)

// @relation(GSSC-MLLR-229, scope=range_start, role=Test)
test('GSSC-MLLR-229 Syntactic', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    const row = root.querySelector<HTMLElement>('.gssc-contact-row')!;
    expect(row.classList.contains('flex-row')).toBe(true);
    expect(row.classList.contains('w-full')).toBe(true);
    expect(row.classList.contains('items-start')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-229, scope=range_end, role=Test)

// @relation(GSSC-MLLR-230, scope=range_start, role=Test)
test('GSSC-MLLR-230 Lexical', async () => {
  const { root, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
    list: [fellowMember, deletedMember],
  });
  try {
    const names = [...root.querySelectorAll<HTMLElement>('.gssc-contact-row__name')];
    const methods = root.querySelector<HTMLElement>('.gssc-contact-row__methods')!;
    expect(names[0].classList.contains('font-sans')).toBe(true);
    expect(names[0].classList.contains('text-gssc-dark-green')).toBe(true);
    expect(names[0].classList.contains('line-through')).toBe(false);
    expect(names[1].classList.contains('line-through')).toBe(true);
    expect(methods.classList.contains('font-sans')).toBe(true);
    expect(methods.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-230, scope=range_end, role=Test)

// @relation(GSSC-MLLR-581, scope=range_start, role=Test)
test('GSSC-MLLR-581 Semantic', async () => {
  const mod = await setupDirectory({ viewer: { cuid: 'mod_1', isUserMod: true } });
  try {
    const invite = mod.root.querySelector<HTMLButtonElement>('[data-slot="directory-invite"]')!;
    expect(invite).not.toBeNull();
    expect(invite.textContent?.trim()).toBe('Invite Member');
    invite.click();
    mod.fixture.detectChanges();
    expect(mod.root.querySelector('[data-slot="directory-invite-form"]')).not.toBeNull();
  } finally {
    mod.restore();
  }
});
// @relation(GSSC-MLLR-581, scope=range_end, role=Test)

// @relation(GSSC-MLLR-582, scope=range_start, role=Test)
test('GSSC-MLLR-582 Syntactic', async () => {
  const { root, restore } = await setupDirectory({ viewer: { cuid: 'mod_1', isUserMod: true } });
  try {
    const header = root.querySelector('.gssc-directory-page__header')!;
    const actions = root.querySelector('.gssc-directory-page__header-actions')!;
    const invite = root.querySelector('[data-slot="directory-invite"]')!;
    const title = root.querySelector('.gssc-directory-page__title')!;
    expect(header.contains(actions)).toBe(true);
    expect(actions.contains(invite)).toBe(true);
    expect(title.compareDocumentPosition(invite) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector('.gssc-contact-row [data-slot="directory-invite"]')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-582, scope=range_end, role=Test)

// @relation(GSSC-MLLR-583, scope=range_start, role=Test)
test('GSSC-MLLR-583 Lexical', async () => {
  const { root, restore } = await setupDirectory({ viewer: { cuid: 'mod_1', isUserMod: true } });
  try {
    const invite = root.querySelector<HTMLElement>('[data-slot="directory-invite"]')!;
    expect(invite.classList.contains('font-sans')).toBe(true);
    expect(invite.classList.contains('bg-gssc-light-green')).toBe(true);
    expect(invite.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(invite.textContent?.trim()).toBe('Invite Member');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-583, scope=range_end, role=Test)

// @relation(GSSC-MLLR-584, scope=range_start, role=Test)
test('GSSC-MLLR-584 Semantic', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    page.openInviteForm();
    fixture.detectChanges();
    expect(root.querySelector('#gssc-directory-invite-primary-email')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-invite-username')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-invite-first-name')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-invite-last-name')).not.toBeNull();
    expect(
      root.querySelector('#gssc-directory-invite-primary-email')?.hasAttribute('required'),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-584, scope=range_end, role=Test)

// @relation(GSSC-MLLR-585, scope=range_start, role=Test)
test('GSSC-MLLR-585 Syntactic', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    page.openInviteForm();
    fixture.detectChanges();
    const header = root.querySelector('.gssc-directory-page__header')!;
    const form = root.querySelector<HTMLElement>('[data-slot="directory-invite-form"]')!;
    const submit = root.querySelector('[data-slot="directory-invite-submit"]')!;
    expect(header.contains(form)).toBe(true);
    expect(form.classList.contains('flex-col')).toBe(true);
    expect(form.lastElementChild).toBe(submit);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-585, scope=range_end, role=Test)

// @relation(GSSC-MLLR-586, scope=range_start, role=Test)
test('GSSC-MLLR-586 Lexical', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    page.openInviteForm();
    fixture.detectChanges();
    const form = root.querySelector<HTMLElement>('[data-slot="directory-invite-form"]')!;
    const label = form.querySelector('.gssc-form-text-field__label')!;
    const submit = root.querySelector<HTMLElement>('[data-slot="directory-invite-submit"]')!;
    expect(form.querySelector('gssc-form-text-field')).not.toBeNull();
    expect(label.classList.contains('font-sans')).toBe(true);
    expect(label.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(submit.classList.contains('font-sans')).toBe(true);
    expect(submit.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-586, scope=range_end, role=Test)

// @relation(GSSC-MLLR-587, scope=range_start, role=Test)
test('GSSC-MLLR-587 Invite Persists And Refreshes', async () => {
  const { root, page, fixture, listCalls, inviteCalls, restore } = await setupDirectory({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    page.openInviteForm();
    fixture.detectChanges();
    page.invitePrimaryEmail.set('new@example.com');
    page.inviteUsername.set('newbie');
    page.inviteFirstName.set('New');
    page.inviteLastName.set('Member');
    listCalls.length = 0;
    await page.submitInvite();
    await settleFilters(fixture);
    expect(inviteCalls).toEqual([
      {
        primaryEmail: 'new@example.com',
        username: 'newbie',
        firstName: 'New',
        lastName: 'Member',
      },
    ]);
    expect(listCalls.length).toBeGreaterThan(0);
    expect(page.inviteFormOpen()).toBe(false);
    expect(root.querySelector('[data-slot="directory-invite-form"]')).toBeNull();
    expect(page.invitePrimaryEmail()).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-587, scope=range_end, role=Test)

// @relation(GSSC-MLLR-588, scope=range_start, role=Test)
test('GSSC-MLLR-588 Invite Hidden Without User Moderator', async () => {
  const plain = await setupDirectory({ viewer: { cuid: 'user_1', isUserMod: false } });
  try {
    expect(plain.root.querySelector('[data-slot="directory-invite"]')).toBeNull();
    expect(plain.root.querySelector('[data-slot="directory-invite-form"]')).toBeNull();
    expect(plain.root.querySelector('[data-slot="directory-create"]')).toBeNull();
  } finally {
    plain.restore();
  }

  const mod = await setupDirectory({ viewer: { cuid: 'mod_1', isUserMod: true } });
  try {
    expect(mod.root.querySelector('[data-slot="directory-invite"]')).not.toBeNull();
    expect(mod.root.querySelector('[data-slot="directory-create"]')).toBeNull();
  } finally {
    mod.restore();
  }
});
// @relation(GSSC-MLLR-588, scope=range_end, role=Test)

// @relation(GSSC-MLLR-611, scope=range_start, role=Test)
test('GSSC-MLLR-611 Semantic', async () => {
  const admin = await setupDirectory({ viewer: { cuid: 'admin_1', isAdmin: true } });
  try {
    const create = admin.root.querySelector<HTMLButtonElement>('[data-slot="directory-create"]')!;
    expect(create).not.toBeNull();
    expect(create.textContent?.trim()).toBe('Create Member');
    expect(admin.root.querySelector('[data-slot="directory-invite"]')).not.toBeNull();
    create.click();
    admin.fixture.detectChanges();
    expect(admin.root.querySelector('[data-slot="directory-create-form"]')).not.toBeNull();
  } finally {
    admin.restore();
  }
});
// @relation(GSSC-MLLR-611, scope=range_end, role=Test)

// @relation(GSSC-MLLR-612, scope=range_start, role=Test)
test('GSSC-MLLR-612 Syntactic', async () => {
  const { root, restore } = await setupDirectory({ viewer: { cuid: 'admin_1', isAdmin: true } });
  try {
    const header = root.querySelector('.gssc-directory-page__header')!;
    const actions = root.querySelector('.gssc-directory-page__header-actions')!;
    const create = root.querySelector('[data-slot="directory-create"]')!;
    const title = root.querySelector('.gssc-directory-page__title')!;
    expect(header.contains(actions)).toBe(true);
    expect(actions.contains(create)).toBe(true);
    expect(title.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector('.gssc-contact-row [data-slot="directory-create"]')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-612, scope=range_end, role=Test)

// @relation(GSSC-MLLR-613, scope=range_start, role=Test)
test('GSSC-MLLR-613 Lexical', async () => {
  const { root, restore } = await setupDirectory({ viewer: { cuid: 'admin_1', isAdmin: true } });
  try {
    const create = root.querySelector<HTMLElement>('[data-slot="directory-create"]')!;
    expect(create.classList.contains('font-sans')).toBe(true);
    expect(create.classList.contains('bg-gssc-light-green')).toBe(true);
    expect(create.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(create.textContent?.trim()).toBe('Create Member');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-613, scope=range_end, role=Test)

// @relation(GSSC-MLLR-614, scope=range_start, role=Test)
test('GSSC-MLLR-614 Semantic', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    page.openCreateForm();
    fixture.detectChanges();
    expect(root.querySelector('#gssc-directory-create-username')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-create-primary-email')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-create-password')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-create-first-name')).not.toBeNull();
    expect(root.querySelector('#gssc-directory-create-last-name')).not.toBeNull();
    expect(
      root.querySelector<HTMLInputElement>('#gssc-directory-create-password')!.type,
    ).toBe('password');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-614, scope=range_end, role=Test)

// @relation(GSSC-MLLR-615, scope=range_start, role=Test)
test('GSSC-MLLR-615 Syntactic', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    page.openCreateForm();
    fixture.detectChanges();
    const header = root.querySelector('.gssc-directory-page__header')!;
    const form = root.querySelector<HTMLElement>('[data-slot="directory-create-form"]')!;
    const submit = root.querySelector('[data-slot="directory-create-submit"]')!;
    expect(header.contains(form)).toBe(true);
    expect(form.classList.contains('flex-col')).toBe(true);
    expect(form.lastElementChild).toBe(submit);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-615, scope=range_end, role=Test)

// @relation(GSSC-MLLR-616, scope=range_start, role=Test)
test('GSSC-MLLR-616 Lexical', async () => {
  const { root, page, fixture, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    page.openCreateForm();
    fixture.detectChanges();
    const form = root.querySelector<HTMLElement>('[data-slot="directory-create-form"]')!;
    const label = form.querySelector('.gssc-form-text-field__label')!;
    const submit = root.querySelector<HTMLElement>('[data-slot="directory-create-submit"]')!;
    expect(form.querySelector('gssc-form-text-field')).not.toBeNull();
    expect(label.classList.contains('font-sans')).toBe(true);
    expect(label.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(submit.classList.contains('font-sans')).toBe(true);
    expect(submit.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-616, scope=range_end, role=Test)

// @relation(GSSC-MLLR-617, scope=range_start, role=Test)
test('GSSC-MLLR-617 Create Persists And Refreshes', async () => {
  const { root, page, fixture, listCalls, createCalls, restore } = await setupDirectory({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    page.openCreateForm();
    fixture.detectChanges();
    page.createUsername.set('brandnew');
    page.createPrimaryEmail.set('brand@example.com');
    page.createPassword.set('Secret1!');
    page.createFirstName.set('Brand');
    page.createLastName.set('New');
    listCalls.length = 0;
    await page.submitCreate();
    await settleFilters(fixture);
    expect(createCalls).toEqual([
      {
        username: 'brandnew',
        primaryEmail: 'brand@example.com',
        password: 'Secret1!',
        firstName: 'Brand',
        lastName: 'New',
      },
    ]);
    expect(listCalls.length).toBeGreaterThan(0);
    expect(page.createFormOpen()).toBe(false);
    expect(root.querySelector('[data-slot="directory-create-form"]')).toBeNull();
    expect(page.createUsername()).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-617, scope=range_end, role=Test)

// @relation(GSSC-MLLR-618, scope=range_start, role=Test)
test('GSSC-MLLR-618 Create Hidden Without Administrator', async () => {
  const mod = await setupDirectory({ viewer: { cuid: 'mod_1', isUserMod: true } });
  try {
    expect(mod.root.querySelector('[data-slot="directory-create"]')).toBeNull();
    expect(mod.root.querySelector('[data-slot="directory-create-form"]')).toBeNull();
    expect(mod.root.querySelector('[data-slot="directory-invite"]')).not.toBeNull();
  } finally {
    mod.restore();
  }

  const plain = await setupDirectory({ viewer: { cuid: 'user_1', isUserMod: false } });
  try {
    expect(plain.root.querySelector('[data-slot="directory-create"]')).toBeNull();
    expect(plain.root.querySelector('[data-slot="directory-invite"]')).toBeNull();
  } finally {
    plain.restore();
  }
});
// @relation(GSSC-MLLR-618, scope=range_end, role=Test)
