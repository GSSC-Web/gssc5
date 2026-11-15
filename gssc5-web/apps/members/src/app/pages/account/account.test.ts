import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { accountApi } from '../../services/account-api';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { AccountPage, accountInfoBody } from './account';

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
    clearPasswordHistory: accountApi.clearPasswordHistory,
    uploadAccountPhoto: accountApi.uploadAccountPhoto,
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
  accountApi.clearPasswordHistory = (async () =>
    okResponse(null, 204)) as typeof accountApi.clearPasswordHistory;
  accountApi.uploadAccountPhoto = (async () => ({
    data: { cuid: 'photo_1', path: 'account-photos/photo_1' },
    error: null,
  })) as typeof accountApi.uploadAccountPhoto;

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
      accountApi.clearPasswordHistory = originals.clearPasswordHistory;
      accountApi.uploadAccountPhoto = originals.uploadAccountPhoto;
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
    const firstLabel = root.querySelector('label[for="gssc-account-first-name"]')!;
    expect(firstLabel.textContent).toContain('First Name');
    expect(firstLabel.textContent).toContain('*');
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
    const homeZipRow = root.querySelector<HTMLElement>('.gssc-account-addresses__home-zip-row')!;
    const mailZipRow = root.querySelector<HTMLElement>('.gssc-account-addresses__mail-zip-row')!;
    expect(homeZipRow.classList.contains('items-center')).toBe(true);
    expect(mailZipRow.classList.contains('items-center')).toBe(true);
    expect(homeZipRow.querySelector('.gssc-account-addresses__home-zip')).not.toBeNull();
    expect(homeZipRow.querySelector('.gssc-account-addresses__home-zip-ext')).not.toBeNull();
    expect(homeZipRow.querySelector('.gssc-account-addresses__zip-plus')?.textContent).toBe('+');
    expect(mailZipRow.querySelector('.gssc-account-addresses__zip-plus')?.textContent).toBe('+');
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
    const zipLabel = root.querySelector('label[for="gssc-account-home-zip"]')!;
    expect(zipLabel.textContent).toContain('Zip');
    expect(zipLabel.textContent).toContain('*');
    expect(root.querySelector('label[for="gssc-account-home-zip-ext"]')!.textContent).toContain(
      'Zip Extension',
    );
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
    expect(plain.root.textContent).toContain('Tool Editor');
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
    expect(root.querySelector('.gssc-account-photo-username__file-label')!.textContent).toContain(
      'Account Photo',
    );
    expect(root.querySelector('.gssc-account-photo-username__choose')!.textContent).toContain(
      'Choose Photo',
    );
    const usernameLabel = root.querySelector('label[for="gssc-account-username"]')!;
    expect(usernameLabel.textContent).toContain('Username');
    expect(usernameLabel.textContent).toContain('*');
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
    const currentLabel = root.querySelector('label[for="gssc-account-current-password"]')!;
    expect(currentLabel.textContent).toContain('Current Password');
    expect(currentLabel.textContent).toContain('*');
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
    expect(match.querySelector('.nf-fa-times')).not.toBeNull();

    page.onNewPasswordInput('Abcdef1!');
    page.onConfirmPasswordInput('Abcdef1!');
    fixture.detectChanges();
    expect(match.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(match.querySelector('.nf-fa-check')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-157, scope=range_end, role=Test)

// @relation(GSSC-MLLR-158, scope=range_start, role=Test)
test('GSSC-MLLR-158 Semantic', async () => {
  const managed = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2' },
  });
  try {
    expect(managed.page.canChangePassword()).toBe(false);
    expect(managed.root.querySelector('.gssc-account-password__form')).toBeNull();
    expect(managed.root.querySelector('.gssc-account-password__submit')).toBeNull();
  } finally {
    managed.restore();
  }

  const own = await setupAccount({
    url: '/account',
    viewer: { cuid: 'user_1', isAdmin: false, isUserMod: false },
  });
  try {
    expect(own.page.canChangePassword()).toBe(true);
    expect(own.root.querySelector('.gssc-account-password__form')).not.toBeNull();
    expect(own.root.querySelector('.gssc-account-password__submit')).not.toBeNull();
  } finally {
    own.restore();
  }
});
// @relation(GSSC-MLLR-158, scope=range_end, role=Test)

// @relation(GSSC-MLLR-438, scope=range_start, role=Test)
test('GSSC-MLLR-438 Semantic', async () => {
  const clearCalls: string[] = [];

  const other = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2' },
  });
  try {
    accountApi.clearPasswordHistory = (async (cuid: string) => {
      clearCalls.push(cuid);
      return okResponse(null, 204);
    }) as typeof accountApi.clearPasswordHistory;
    expect(other.page.canResetPasswordHistory()).toBe(true);
    expect(other.root.querySelector('.gssc-account-password-history__reset')).not.toBeNull();
    expect(other.root.querySelector('.gssc-account-password__form')).toBeNull();
    other.root.querySelector<HTMLButtonElement>('.gssc-account-password-history__reset')!.click();
    await other.fixture.whenStable();
    expect(clearCalls).toEqual(['user_2']);
    expect(other.page.passwordMessage()).toBe('Password history reset.');
  } finally {
    other.restore();
  }

  const ownAdmin = await setupAccount({
    url: '/account',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'admin_1' },
  });
  try {
    expect(ownAdmin.page.canChangePassword()).toBe(true);
    expect(ownAdmin.page.canResetPasswordHistory()).toBe(true);
    expect(ownAdmin.root.querySelector('.gssc-account-password__form')).not.toBeNull();
    expect(ownAdmin.root.querySelector('.gssc-account-password-history__reset')).not.toBeNull();
  } finally {
    ownAdmin.restore();
  }

  const plain = await setupAccount();
  try {
    expect(plain.page.canResetPasswordHistory()).toBe(false);
    expect(plain.root.querySelector('.gssc-account-password-history__reset')).toBeNull();
  } finally {
    plain.restore();
  }
});
// @relation(GSSC-MLLR-438, scope=range_end, role=Test)

// @relation(GSSC-MLLR-439, scope=range_start, role=Test)
test('GSSC-MLLR-439 Syntactic', async () => {
  const both = await setupAccount({
    url: '/account',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'admin_1' },
  });
  try {
    const form = both.root.querySelector('.gssc-account-password__form')!;
    const reset = both.root.querySelector('.gssc-account-password-history__reset')!;
    expect(form.compareDocumentPosition(reset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    both.restore();
  }

  const onlyReset = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2' },
  });
  try {
    expect(onlyReset.root.querySelector('.gssc-account-password__heading')?.textContent?.trim()).toBe(
      'Password History Reset',
    );
    expect(onlyReset.root.querySelector('.gssc-account-password__form')).toBeNull();
    expect(onlyReset.root.querySelector('.gssc-account-password-history__reset')).not.toBeNull();
  } finally {
    onlyReset.restore();
  }
});
// @relation(GSSC-MLLR-439, scope=range_end, role=Test)

// @relation(GSSC-MLLR-440, scope=range_start, role=Test)
test('GSSC-MLLR-440 Lexical', async () => {
  const { root, restore } = await setupAccount({
    url: '/accounts/user_2',
    viewer: { cuid: 'admin_1', isAdmin: true, isUserMod: true },
    account: { ...sampleAccount, cuid: 'user_2' },
  });
  try {
    const reset = root.querySelector<HTMLButtonElement>('.gssc-account-password-history__reset')!;
    expect(reset.textContent?.trim()).toBe('Password History Reset');
    expect(reset.classList.contains('bg-gssc-light-green')).toBe(true);
    expect(reset.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(reset.classList.contains('rounded-md')).toBe(true);
    expect(reset.classList.contains('hover:bg-gssc-gray')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-440, scope=range_end, role=Test)

// @relation(GSSC-MLLR-415, scope=range_start, role=Test)
test('GSSC-MLLR-415 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    expect(page.memberSectionOpen()).toBe(true);
    page.toggleMemberSection();
    expect(page.memberSectionOpen()).toBe(false);
    page.toggleAccountSection();
    expect(page.accountSectionOpen()).toBe(false);
    page.togglePasswordSection();
    expect(page.passwordSectionOpen()).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-415, scope=range_end, role=Test)

// @relation(GSSC-MLLR-416, scope=range_start, role=Test)
test('GSSC-MLLR-416 Syntactic', async () => {
  const { root, page, restore } = await setupAccount();
  try {
    expect(page.memberSectionOpen()).toBe(true);
    expect(page.accountSectionOpen()).toBe(true);
    expect(page.passwordSectionOpen()).toBe(true);
    expect(root.querySelector('.gssc-account-member-info__toggle')).not.toBeNull();
    expect(root.querySelector('.gssc-account-account-info__toggle')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password__toggle')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-416, scope=range_end, role=Test)

// @relation(GSSC-MLLR-417, scope=range_start, role=Test)
test('GSSC-MLLR-417 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const heading = root.querySelector<HTMLElement>('.gssc-account-member-info__heading')!;
    expect(heading.classList.contains('font-sans')).toBe(true);
    expect(heading.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-417, scope=range_end, role=Test)

// @relation(GSSC-MLLR-418, scope=range_start, role=Test)
test('GSSC-MLLR-418 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    let called = false;
    accountApi.updateUser = (async () => {
      called = true;
      return okResponse(null, 204) as never;
    }) as typeof accountApi.updateUser;
    page.memberInfo.firstName = '';
    page.memberInfo.primaryEmail = 'not-an-email';
    await page.submitMemberInfo();
    expect(called).toBe(false);
    expect(page.memberInvalid().has('firstName')).toBe(true);
    expect(page.memberInvalid().has('primaryEmail')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-418, scope=range_end, role=Test)

// @relation(GSSC-MLLR-419, scope=range_start, role=Test)
test('GSSC-MLLR-419 Semantic', async () => {
  const { page, fixture, root, restore } = await setupAccount();
  try {
    page.memberInfo.homeZip = '12';
    await page.submitMemberInfo();
    fixture.detectChanges();
    expect(page.fieldInvalid('homeZip')).toBe(true);
    const zipField = root.querySelector('#gssc-account-home-zip')!.closest('.gssc-field')!;
    expect(zipField.classList.contains('border-gssc-dark-red')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-419, scope=range_end, role=Test)

// @relation(GSSC-MLLR-420, scope=range_start, role=Test)
test('GSSC-MLLR-420 Lexical', async () => {
  const { page, fixture, root, restore } = await setupAccount();
  try {
    page.memberInfo.lastName = '';
    await page.submitMemberInfo();
    fixture.detectChanges();
    const field = root.querySelector('#gssc-account-last-name')!.closest('.gssc-field')!;
    expect(field.classList.contains('border-gssc-dark-red')).toBe(true);
    expect(field.classList.contains('bg-gssc-light-red')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-420, scope=range_end, role=Test)

// @relation(GSSC-MLLR-421, scope=range_start, role=Test)
test('GSSC-MLLR-421 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    let uploadedFor = '';
    let savedPhoto: string | null = null;
    accountApi.uploadAccountPhoto = (async (_file, userCuid) => {
      uploadedFor = userCuid;
      return {
        data: { cuid: userCuid, path: `account-photos/${userCuid}` },
        error: null,
      };
    }) as typeof accountApi.uploadAccountPhoto;
    accountApi.updateUser = (async (_cuid, body) => {
      savedPhoto = (body as { accountPhoto?: string }).accountPhoto ?? null;
      return okResponse(null, 204) as never;
    }) as typeof accountApi.updateUser;
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'face.png', { type: 'image/png' })],
    });
    page.onPhotoSelected({ target: input } as unknown as Event);
    await page.submitAccountInfo();
    expect(uploadedFor).toBe('user_1');
    expect(savedPhoto).toBe('user_1');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-421, scope=range_end, role=Test)

// @relation(GSSC-MLLR-422, scope=range_start, role=Test)
test('GSSC-MLLR-422 Semantic', async () => {
  const { page, root, restore } = await setupAccount();
  try {
    let memberCalls = 0;
    accountApi.updateUser = (async () => {
      memberCalls += 1;
      return okResponse(null, 204) as never;
    }) as typeof accountApi.updateUser;
    const form = root.querySelector<HTMLFormElement>('.gssc-account-member-info__form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await page.submitMemberInfo();
    expect(memberCalls).toBeGreaterThan(0);
    expect(root.querySelector('.gssc-account-account-info__form')).not.toBeNull();
    expect(root.querySelector('.gssc-account-password__form')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-422, scope=range_end, role=Test)

// @relation(GSSC-MLLR-423, scope=range_start, role=Test)
test('GSSC-MLLR-423 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(
      root.querySelector<HTMLButtonElement>('.gssc-account-member-info__submit')!.type,
    ).toBe('submit');
    expect(
      root.querySelector<HTMLButtonElement>('.gssc-account-account-info__submit')!.type,
    ).toBe('submit');
    expect(
      root.querySelector<HTMLButtonElement>('.gssc-account-password__submit')!.type,
    ).toBe('submit');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-423, scope=range_end, role=Test)

// @relation(GSSC-MLLR-424, scope=range_start, role=Test)
test('GSSC-MLLR-424 Semantic', async () => {
  const { page, fixture, root, restore } = await setupAccount();
  try {
    const field = root.querySelector('.gssc-account-photo-username__picker')!;
    expect(field.querySelector('.gssc-account-photo-username__preview-frame')).not.toBeNull();
    expect(field.querySelector('.gssc-account-photo-username__preview-empty')).not.toBeNull();
    expect(field.querySelector('.gssc-account-photo-username__choose')).not.toBeNull();
    expect(
      root.querySelector<HTMLInputElement>('.gssc-account-photo-username__photo')!.type,
    ).toBe('file');
    expect(
      root.querySelector('.gssc-account-photo-username__photo')!.classList.contains('sr-only'),
    ).toBe(true);
    page.photoPreviewUrl.set('http://localhost:3000/account-photos/user_1');
    fixture.detectChanges();
    const img = root.querySelector('.gssc-account-photo-username__preview')!;
    expect(img.classList.contains('object-cover')).toBe(true);
    expect(img.classList.contains('object-center')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-424, scope=range_end, role=Test)

// @relation(GSSC-MLLR-425, scope=range_start, role=Test)
test('GSSC-MLLR-425 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const field = root.querySelector('.gssc-account-photo-username__picker')!;
    expect(field.classList.contains('gssc-field')).toBe(true);
    const frame = field.querySelector('.gssc-account-photo-username__preview-frame')!;
    const choose = field.querySelector('.gssc-account-photo-username__choose')!;
    expect(frame.classList.contains('size-40')).toBe(true);
    expect(frame.classList.contains('shrink-0')).toBe(true);
    expect(
      frame.compareDocumentPosition(choose) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(field.querySelector('.gssc-account-photo-username__file-name')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-425, scope=range_end, role=Test)

// @relation(GSSC-MLLR-426, scope=range_start, role=Test)
test('GSSC-MLLR-426 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const choose = root.querySelector('.gssc-account-photo-username__choose')!;
    expect(choose.classList.contains('font-sans')).toBe(true);
    expect(choose.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(choose.classList.contains('bg-gssc-light-green')).toBe(true);
    const floating = root.querySelector('.gssc-account-photo-username__file-label')!;
    expect(floating.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-426, scope=range_end, role=Test)

test('accountInfoBody sends empty-string accountPhoto and omits self membershipStatus', () => {
  const body = accountInfoBody(
    {
      accountPhoto: '',
      username: 'ada',
      membershipStatus: 'Active',
      position: 'President',
      isAdmin: false,
      isUserMod: true,
      isToolEditor: false,
      isPublicationEditor: false,
      isNewsletterEditor: false,
    },
    true,
    false,
    true,
  );
  expect(body['accountPhoto']).toBe('');
  expect(Object.prototype.hasOwnProperty.call(body, 'membershipStatus')).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(body, 'position')).toBe(false);
});

// @relation(GSSC-MLLR-427, scope=range_start, role=Test)
test('GSSC-MLLR-427 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    let called = false;
    accountApi.changePassword = (async () => {
      called = true;
      return okResponse(null, 204) as never;
    }) as typeof accountApi.changePassword;
    page.currentPassword = 'OldPass1!';
    page.onNewPasswordInput('OldPass1!');
    page.onConfirmPasswordInput('OldPass1!');
    await page.submitPasswordChange();
    expect(called).toBe(false);
    expect(page.passwordInvalid()).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-427, scope=range_end, role=Test)

// @relation(GSSC-MLLR-428, scope=range_start, role=Test)
test('GSSC-MLLR-428 Semantic', async () => {
  const { page, restore } = await setupAccount();
  try {
    accountApi.changePassword = (async () => ({
      data: null,
      error: { status: 422, value: 'Invalid' },
      response: new Response(null, { status: 422 }),
      status: 422,
      headers: new Headers(),
    })) as typeof accountApi.changePassword;
    page.currentPassword = 'OldPass1!';
    page.onNewPasswordInput('NewPass1!');
    page.onConfirmPasswordInput('NewPass1!');
    await page.submitPasswordChange();
    expect(page.passwordInvalid()).toBe(true);
    expect(page.passwordMessage()).toContain('previous');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-428, scope=range_end, role=Test)

// @relation(GSSC-MLLR-429, scope=range_start, role=Test)
test('GSSC-MLLR-429 Semantic', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(root.querySelector('#gssc-account-mailing-equals-home')).not.toBeNull();
    expect(root.querySelector('.gssc-account-addresses__mailing-equals-home')?.textContent).toContain(
      'Mailing = Home',
    );
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-429, scope=range_end, role=Test)

// @relation(GSSC-MLLR-430, scope=range_start, role=Test)
test('GSSC-MLLR-430 Syntactic', async () => {
  const { root, restore } = await setupAccount();
  try {
    const homeDisplay = root.querySelector('#gssc-account-home-display')!;
    const checkbox = root.querySelector('#gssc-account-mailing-equals-home')!;
    const mailLine1 = root.querySelector('#gssc-account-mail-line1')!;
    expect(
      homeDisplay.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      checkbox.compareDocumentPosition(mailLine1) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-430, scope=range_end, role=Test)

// @relation(GSSC-MLLR-431, scope=range_start, role=Test)
test('GSSC-MLLR-431 Lexical', async () => {
  const { root, restore } = await setupAccount();
  try {
    const label = root.querySelector<HTMLElement>('.gssc-account-addresses__mailing-equals-home')!;
    expect(label.classList.contains('font-sans')).toBe(true);
    expect(label.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-431, scope=range_end, role=Test)

// @relation(GSSC-MLLR-432, scope=range_start, role=Test)
test('GSSC-MLLR-432 Checkbox Initial State', async () => {
  const matched = await setupAccount();
  try {
    expect(matched.page.mailingEqualsHome()).toBe(true);
    expect(
      matched.root.querySelector<HTMLInputElement>('#gssc-account-mailing-equals-home')!.checked,
    ).toBe(true);
  } finally {
    matched.restore();
  }

  const mismatched = await setupAccount({
    account: {
      ...sampleAccount,
      mailingLine1: '99 Different St',
      mailingCity: 'Paris',
    },
  });
  try {
    expect(mismatched.page.mailingEqualsHome()).toBe(false);
    expect(
      mismatched.root.querySelector<HTMLInputElement>('#gssc-account-mailing-equals-home')!.checked,
    ).toBe(false);
  } finally {
    mismatched.restore();
  }
});
// @relation(GSSC-MLLR-432, scope=range_end, role=Test)

// @relation(GSSC-MLLR-433, scope=range_start, role=Test)
test('GSSC-MLLR-433 Home Updates Mailing When Checked', async () => {
  const { page, fixture, restore } = await setupAccount();
  try {
    expect(page.mailingEqualsHome()).toBe(true);
    page.memberInfo.homeLine1 = '42 Updated Lane';
    page.onHomeAddressChange();
    fixture.detectChanges();
    expect(page.memberInfo.mailingLine1).toBe('42 Updated Lane');
    page.memberInfo.homeCity = 'Bath';
    page.onHomeAddressChange();
    expect(page.memberInfo.mailingCity).toBe('Bath');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-433, scope=range_end, role=Test)

// @relation(GSSC-MLLR-434, scope=range_start, role=Test)
test('GSSC-MLLR-434 Mailing Fields Disabled When Checked', async () => {
  const { root, restore } = await setupAccount();
  try {
    expect(
      root.querySelector<HTMLInputElement>('#gssc-account-mail-line1')!.disabled,
    ).toBe(true);
    expect(
      root.querySelector<HTMLInputElement>('#gssc-account-mail-city')!.disabled,
    ).toBe(true);
    const mailField = root.querySelector('#gssc-account-mail-line1')!.closest('.gssc-field')!;
    expect(mailField.classList.contains('bg-gssc-gray')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-434, scope=range_end, role=Test)

// @relation(GSSC-MLLR-435, scope=range_start, role=Test)
test('GSSC-MLLR-435 Uncheck Stops Automatic Mailing Updates', async () => {
  const { page, fixture, restore } = await setupAccount();
  try {
    page.onMailingEqualsHomeChange(false);
    fixture.detectChanges();
    const priorMailing = page.memberInfo.mailingLine1;
    page.memberInfo.homeLine1 = '77 Independent Ave';
    page.onHomeAddressChange();
    expect(page.memberInfo.mailingLine1).toBe(priorMailing);
    expect(page.memberInfo.mailingLine1).not.toBe('77 Independent Ave');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-435, scope=range_end, role=Test)

// @relation(GSSC-MLLR-436, scope=range_start, role=Test)
test('GSSC-MLLR-436 Syntactic', async () => {
  const { root, page, fixture, restore } = await setupAccount();
  try {
    const mail = root.querySelector<HTMLInputElement>('#gssc-account-mail-line1')!;
    expect(mail).not.toBeNull();
    expect(mail.disabled).toBe(true);
    expect(mail.value).toBe(page.memberInfo.homeLine1);
    page.onMailingEqualsHomeChange(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.mailingEqualsHome()).toBe(false);
    expect(root.querySelector<HTMLInputElement>('#gssc-account-mail-line1')!.disabled).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-436, scope=range_end, role=Test)

// @relation(GSSC-MLLR-437, scope=range_start, role=Test)
test('GSSC-MLLR-437 Lexical', async () => {
  const { root, page, fixture, restore } = await setupAccount();
  try {
    const disabledField = root.querySelector('#gssc-account-mail-line1')!.closest('.gssc-field')!;
    expect(disabledField.classList.contains('bg-gssc-gray')).toBe(true);
    page.onMailingEqualsHomeChange(false);
    fixture.detectChanges();
    const enabledField = root.querySelector('#gssc-account-mail-line1')!.closest('.gssc-field')!;
    expect(enabledField.classList.contains('bg-gssc-white')).toBe(true);
    expect(enabledField.classList.contains('bg-gssc-gray')).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-437, scope=range_end, role=Test)
