import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { accountApi } from '../../services/account-api';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { AccountPage } from './account';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleAccount = {
  cuid: 'user_1',
  firstName: 'Ada',
  middleName: '',
  lastName: 'Lovelace',
  username: 'ada',
  primaryEmail: 'ada@example.com',
  secondaryEmail: '',
  primaryPhone: '555-0100',
  secondaryPhone: '',
  preferredContactMethod: 'Email',
  secondaryEmailDisplay: false,
  secondaryPhoneDisplay: false,
  homeLine1: '1 Analytical Engine Way',
  homeLine2: '',
  homeLine3: '',
  homeCity: 'London',
  homeState: 'EN',
  homeZip: '12345',
  homeZipExtension: '',
  homeAddressDisplay: 'redacted',
  mailingLine1: '1 Analytical Engine Way',
  mailingLine2: '',
  mailingLine3: '',
  mailingCity: 'London',
  mailingState: 'EN',
  mailingZip: '12345',
  mailingZipExtension: '',
  membershipStatus: 'Active',
  position: '',
  accountPhoto: '',
  isAdmin: false,
  isUserMod: false,
  isToolEditor: true,
  isPublicationEditor: false,
  isNewsletterEditor: false,
};

async function setupAccount(options?: {
  url?: string;
  viewer?: { cuid: string; isAdmin?: boolean; isUserMod?: boolean };
  account?: typeof sampleAccount | null;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<AccountPage>>>;
  root: HTMLElement;
  page: AccountPage;
  session: MemberSession;
  restore: () => void;
}> {
  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    login: memberSessionApi.login,
    logout: memberSessionApi.logout,
    accountGet: accountApi.getUser,
    accountUpdate: accountApi.updateUser,
    changePassword: accountApi.changePassword,
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
  memberSessionApi.login = (async () => okResponse({ status: 'ok' })) as typeof memberSessionApi.login;
  memberSessionApi.logout = (async () => okResponse(null, 204)) as typeof memberSessionApi.logout;

  const account = options?.account === null ? null : (options?.account ?? sampleAccount);
  accountApi.getUser = (async () =>
    account
      ? okResponse(account)
      : {
          data: null,
          error: { status: 404, value: 'Not Found' },
          response: new Response(null, { status: 404 }),
          status: 404,
          headers: new Headers(),
        }) as typeof accountApi.getUser;
  accountApi.updateUser = (async () =>
    okResponse(null, 204)) as typeof accountApi.updateUser;
  accountApi.changePassword = (async () =>
    okResponse(null, 204)) as typeof accountApi.changePassword;

  const url = options?.url ?? '/account';
  const cuidParam = url.startsWith('/accounts/')
    ? url.slice('/accounts/'.length).split('?')[0]
    : null;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(AccountPage, {
    providers: [
      provideRouter(routes),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(cuidParam ? { cuid: cuidParam } : {}),
          },
        },
      },
    ],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set(viewer.cuid);
  session.isAdmin.set(viewer.isAdmin === true);
  session.isUserMod.set(viewer.isAdmin === true || viewer.isUserMod === true);
  session.displayName.set('Ada Lovelace');
  session.ready.set(true);

  fixture.detectChanges();
  await fixture.whenStable();
  // Re-run after session signals are set for the intended viewer.
  await fixture.componentInstance.bootstrap();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      memberSessionApi.login = originals.login;
      memberSessionApi.logout = originals.logout;
      accountApi.getUser = originals.accountGet;
      accountApi.updateUser = originals.accountUpdate;
      accountApi.changePassword = originals.changePassword;
    },
  };
}

// @relation(GSSC-MLLR-125, scope=range_start, role=Test)
test('GSSC-MLLR-125 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-member-info')).not.toBeNull();
    expect(root.querySelector('.gssc-account-account-info')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-125, scope=range_end, role=Test)

// @relation(GSSC-MLLR-126, scope=range_start, role=Test)
test('GSSC-MLLR-126 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const page = root.querySelector<HTMLElement>('.gssc-account-page')!;
    expect(page.classList.contains('flex-col')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-126, scope=range_end, role=Test)

// @relation(GSSC-MLLR-127, scope=range_start, role=Test)
test('GSSC-MLLR-127 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const page = root.querySelector<HTMLElement>('.gssc-account-page')!;
    expect(page.classList.contains('font-sans')).toBe(true);
    const heading = root.querySelector<HTMLElement>('.gssc-account-member-info__heading')!;
    expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-127, scope=range_end, role=Test)

// @relation(GSSC-MLLR-128, scope=range_start, role=Test)
test('GSSC-MLLR-128 Semantic', async () => {
  const own = await setupAccount({ url: '/account' });
  try {
    expect(own.root.querySelector('.gssc-account-page__unavailable')).toBeNull();
    expect(own.page.isOwnAccount()).toBe(true);
  } finally {
    own.restore();
  }

  const managed = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2', username: 'other' },
  });
  try {
    expect(managed.root.querySelector('.gssc-account-page__unavailable')).toBeNull();
    expect(managed.page.isOwnAccount()).toBe(false);
  } finally {
    managed.restore();
  }
});
// @relation(GSSC-MLLR-128, scope=range_end, role=Test)

// @relation(GSSC-MLLR-129, scope=range_start, role=Test)
test('GSSC-MLLR-129 Semantic', async () => {
  const { root, restore } = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'user_1', isAdmin: false, isUserMod: false },
  });
  try {
    expect(root.querySelector('.gssc-account-page__unavailable')).not.toBeNull();
    expect(root.querySelector('.gssc-account-member-info')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-129, scope=range_end, role=Test)

// @relation(GSSC-MLLR-130, scope=range_start, role=Test)
test('GSSC-MLLR-130 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-name-contact__first-name')).not.toBeNull();
    expect(root.querySelector('.gssc-account-addresses__home-line1')).not.toBeNull();
    expect(root.querySelector('.gssc-account-member-info__reset')).not.toBeNull();
    expect(root.querySelector('.gssc-account-member-info__submit')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-130, scope=range_end, role=Test)

// @relation(GSSC-MLLR-131, scope=range_start, role=Test)
test('GSSC-MLLR-131 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const columns = root.querySelector<HTMLElement>('.gssc-account-member-info__columns')!;
    expect(columns.classList.contains('md:grid-cols-2')).toBe(true);
    expect(root.querySelector('.gssc-account-name-contact')).not.toBeNull();
    expect(root.querySelector('.gssc-account-addresses')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-131, scope=range_end, role=Test)

// @relation(GSSC-MLLR-132, scope=range_start, role=Test)
test('GSSC-MLLR-132 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const section = root.querySelector<HTMLElement>('.gssc-account-member-info')!;
    expect(section.classList.contains('font-sans')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-132, scope=range_end, role=Test)

// @relation(GSSC-MLLR-133, scope=range_start, role=Test)
test('GSSC-MLLR-133 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    page.memberInfo.firstName = 'Changed';
    page.resetMemberInfo();
    expect(page.memberInfo.firstName).toBe('Ada');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-133, scope=range_end, role=Test)

// @relation(GSSC-MLLR-134, scope=range_start, role=Test)
test('GSSC-MLLR-134 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    let body: unknown;
    accountApi.updateUser = (async (_cuid, payload) => {
      body = payload;
      return okResponse(null, 204) as never;
    }) as typeof accountApi.updateUser;
    page.memberInfo.firstName = 'Augusta';
    await page.submitMemberInfo();
    expect((body as { firstName: string }).firstName).toBe('Augusta');
    expect(page.memberMessage()).toContain('saved');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-134, scope=range_end, role=Test)

// @relation(GSSC-MLLR-135, scope=range_start, role=Test)
test('GSSC-MLLR-135 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-name-contact__first-name')).not.toBeNull();
    expect(root.querySelector('.gssc-account-name-contact__primary-email')).not.toBeNull();
    expect(root.querySelector('.gssc-account-name-contact__preferred-contact')).not.toBeNull();
    expect(root.querySelector('.gssc-account-name-contact__secondary-email-display')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-135, scope=range_end, role=Test)

// @relation(GSSC-MLLR-136, scope=range_start, role=Test)
test('GSSC-MLLR-136 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const col = root.querySelector<HTMLElement>('.gssc-account-name-contact')!;
    expect(col.classList.contains('flex-col')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-136, scope=range_end, role=Test)

// @relation(GSSC-MLLR-137, scope=range_start, role=Test)
test('GSSC-MLLR-137 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const col = root.querySelector<HTMLElement>('.gssc-account-name-contact')!;
    expect(col.classList.contains('font-sans')).toBe(true);
    expect(col.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-137, scope=range_end, role=Test)

// @relation(GSSC-MLLR-138, scope=range_start, role=Test)
test('GSSC-MLLR-138 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-addresses__home-line1')).not.toBeNull();
    expect(root.querySelector('.gssc-account-addresses__home-display')).not.toBeNull();
    expect(root.querySelector('.gssc-account-addresses__mail-line1')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-138, scope=range_end, role=Test)

// @relation(GSSC-MLLR-139, scope=range_start, role=Test)
test('GSSC-MLLR-139 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const col = root.querySelector<HTMLElement>('.gssc-account-addresses')!;
    expect(col.classList.contains('flex-col')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-139, scope=range_end, role=Test)

// @relation(GSSC-MLLR-140, scope=range_start, role=Test)
test('GSSC-MLLR-140 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const col = root.querySelector<HTMLElement>('.gssc-account-addresses')!;
    expect(col.classList.contains('font-sans')).toBe(true);
    expect(col.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-140, scope=range_end, role=Test)

// @relation(GSSC-MLLR-141, scope=range_start, role=Test)
test('GSSC-MLLR-141 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-photo-username__photo')).not.toBeNull();
    expect(root.querySelector('.gssc-account-photo-username__username')).not.toBeNull();
    expect(root.querySelector('.gssc-account-account-info__submit')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-141, scope=range_end, role=Test)

// @relation(GSSC-MLLR-142, scope=range_start, role=Test)
test('GSSC-MLLR-142 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const columns = root.querySelector<HTMLElement>('.gssc-account-account-info__columns')!;
    expect(columns.classList.contains('md:grid-cols-2')).toBe(true);
    expect(root.querySelector('.gssc-account-privileges')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-142, scope=range_end, role=Test)

// @relation(GSSC-MLLR-143, scope=range_start, role=Test)
test('GSSC-MLLR-143 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const membership = root.querySelector<HTMLElement>('.gssc-account-account-info__membership')!;
    expect(membership.classList.contains('bg-gssc-gray')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-143, scope=range_end, role=Test)

// @relation(GSSC-MLLR-144, scope=range_start, role=Test)
test('GSSC-MLLR-144 Semantic', async () => {
  const plain = await setupAccount();
  try {
    expect(plain.page.canEditMembership()).toBe(false);
    expect(
      plain.root.querySelector<HTMLInputElement>('.gssc-account-account-info__membership-control')!
        .disabled,
    ).toBe(true);
  } finally {
    plain.restore();
  }

  const mod = await setupAccount({
    viewer: { cuid: 'mod_1', isUserMod: true },
  });
  try {
    expect(mod.page.canEditMembership()).toBe(true);
    expect(
      mod.root.querySelector<HTMLInputElement>('.gssc-account-account-info__membership-control')!
        .disabled,
    ).toBe(false);
  } finally {
    mod.restore();
  }
});
// @relation(GSSC-MLLR-144, scope=range_end, role=Test)

// @relation(GSSC-MLLR-145, scope=range_start, role=Test)
test('GSSC-MLLR-145 Semantic', async () => {
  const plain = await setupAccount();
  try {
    expect(plain.root.querySelector('.gssc-account-privileges__switches')).toBeNull();
    expect(plain.root.querySelector('.gssc-account-privileges__active-list')).not.toBeNull();
    expect(plain.root.textContent).toContain('Tool editor');
    expect(plain.root.textContent).not.toContain('Administrator');
  } finally {
    plain.restore();
  }

  const admin = await setupAccount({
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
  });
  try {
    expect(admin.root.querySelector('.gssc-account-privileges__switches')).not.toBeNull();
    expect(admin.root.querySelectorAll('.gssc-account-privileges__switch').length).toBe(5);
  } finally {
    admin.restore();
  }
});
// @relation(GSSC-MLLR-145, scope=range_end, role=Test)

// @relation(GSSC-MLLR-146, scope=range_start, role=Test)
test('GSSC-MLLR-146 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-photo-username__photo')).not.toBeNull();
    expect(root.querySelector('.gssc-account-photo-username__username')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-146, scope=range_end, role=Test)

// @relation(GSSC-MLLR-147, scope=range_start, role=Test)
test('GSSC-MLLR-147 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const left = root.querySelector('.gssc-account-account-info__left')!;
    const photoBlock = left.querySelector('.gssc-account-photo-username');
    const membership = left.querySelector('.gssc-account-account-info__membership');
    expect(photoBlock).not.toBeNull();
    expect(membership).not.toBeNull();
    expect(
      photoBlock!.compareDocumentPosition(membership!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-147, scope=range_end, role=Test)

// @relation(GSSC-MLLR-148, scope=range_start, role=Test)
test('GSSC-MLLR-148 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const block = root.querySelector<HTMLElement>('.gssc-account-photo-username')!;
    expect(block.classList.contains('font-sans') || block.parentElement?.classList.contains('font-sans')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-148, scope=range_end, role=Test)

// @relation(GSSC-MLLR-149, scope=range_start, role=Test)
test('GSSC-MLLR-149 Semantic', async () => {
  const { root, page, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-password-fields')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password-criteria')).not.toBeNull();
    expect(page.canChangePassword()).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-149, scope=range_end, role=Test)

// @relation(GSSC-MLLR-150, scope=range_start, role=Test)
test('GSSC-MLLR-150 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const columns = root.querySelector<HTMLElement>('.gssc-account-password__columns')!;
    expect(columns.classList.contains('md:grid-cols-2')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-150, scope=range_end, role=Test)

// @relation(GSSC-MLLR-151, scope=range_start, role=Test)
test('GSSC-MLLR-151 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const section = root.querySelector<HTMLElement>('.gssc-account-password')!;
    expect(section.classList.contains('font-sans')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-151, scope=range_end, role=Test)

// @relation(GSSC-MLLR-152, scope=range_start, role=Test)
test('GSSC-MLLR-152 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('.gssc-account-password-fields__current')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password-fields__new')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password-fields__confirm')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-152, scope=range_end, role=Test)

// @relation(GSSC-MLLR-153, scope=range_start, role=Test)
test('GSSC-MLLR-153 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const fields = root.querySelector<HTMLElement>('.gssc-account-password-fields')!;
    expect(fields.classList.contains('flex-col')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-153, scope=range_end, role=Test)

// @relation(GSSC-MLLR-154, scope=range_start, role=Test)
test('GSSC-MLLR-154 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const fields = root.querySelector<HTMLElement>('.gssc-account-password-fields')!;
    expect(fields.classList.contains('font-sans')).toBe(true);
    expect(fields.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-154, scope=range_end, role=Test)

// @relation(GSSC-MLLR-155, scope=range_start, role=Test)
test('GSSC-MLLR-155 Semantic', async () => {
  const { page, fixture, root, restore } = await setupAccount();
  try {
    page.onNewPasswordInput('Abcdef1!');
    page.onConfirmPasswordInput('Abcdef1!');
    fixture.detectChanges();
    const criteria = page.passwordCriteria();
    expect(criteria.match).toBe(true);
    expect(criteria.length).toBe(true);
    expect(criteria.lower).toBe(true);
    expect(criteria.upper).toBe(true);
    expect(criteria.number).toBe(true);
    expect(criteria.special).toBe(true);
    expect(root.querySelector('.gssc-account-password-criteria__match')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-155, scope=range_end, role=Test)

// @relation(GSSC-MLLR-156, scope=range_start, role=Test)
test('GSSC-MLLR-156 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const list = root.querySelector<HTMLElement>('.gssc-account-password-criteria')!;
    expect(list.classList.contains('flex-col')).toBe(true);
    expect(list.querySelectorAll('li').length).toBe(6);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-156, scope=range_end, role=Test)

// @relation(GSSC-MLLR-157, scope=range_start, role=Test)
test('GSSC-MLLR-157 Lexical', async () => {
  const { page, fixture, root, restore } = await setupAccount();
  try {
    page.onNewPasswordInput('');
    page.onConfirmPasswordInput('');
    fixture.detectChanges();
    const match = root.querySelector<HTMLElement>('.gssc-account-password-criteria__match')!;
    expect(match.classList.contains('text-gssc-dark-red')).toBe(true);

    page.onNewPasswordInput('Abcdef1!');
    page.onConfirmPasswordInput('Abcdef1!');
    fixture.detectChanges();
    expect(match.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-157, scope=range_end, role=Test)

// @relation(GSSC-MLLR-158, scope=range_start, role=Test)
test('GSSC-MLLR-158 Semantic', async () => {
  const { root, page, restore } = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2' },
  });
  try {
    expect(root.querySelector('.gssc-account-password')).not.toBeNull();
    expect(page.canChangePassword()).toBe(false);
    expect(
      root.querySelector<HTMLButtonElement>('.gssc-account-password__submit')!.disabled,
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-158, scope=range_end, role=Test)
