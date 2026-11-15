import { TestBed } from '@angular/core/testing';
import { MemberSession, memberSessionApi } from './member-session';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

function errResponse(status = 403) {
  return {
    data: null,
    error: { status, value: 'Forbidden' },
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

async function setupSession(options?: {
  challenge?: 'valid' | 'invalid' | 'error';
}): Promise<{
  session: MemberSession;
  restore: () => void;
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    login: memberSessionApi.login,
    logout: memberSessionApi.logout,
  };

  const mode = options?.challenge ?? 'invalid';
  memberSessionApi.challenge = (async () => {
    if (mode === 'error') return errResponse(500) as never;
    if (mode === 'invalid') return okResponse({ status: 'invalid' }) as never;
    return okResponse({ status: 'valid', cuid: 'user_1' }) as never;
  }) as typeof memberSessionApi.challenge;

  memberSessionApi.getUser = (async () =>
    okResponse({
      cuid: 'user_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      isAdmin: false,
      isUserMod: false,
    })) as typeof memberSessionApi.getUser;

  memberSessionApi.login = (async () => okResponse({ status: 'ok' })) as typeof memberSessionApi.login;
  memberSessionApi.logout = (async () =>
    okResponse(null, 204)) as typeof memberSessionApi.logout;

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    providers: [MemberSession],
  }).compileComponents();

  const session = TestBed.inject(MemberSession);
  await session.whenReady();

  return {
    session,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      memberSessionApi.login = originals.login;
      memberSessionApi.logout = originals.logout;
    },
  };
}

// @relation(GSSC-MLLR-67, scope=range_start, role=Test)
test('GSSC-MLLR-67 Semantic', async () => {
  const { session, restore } = await setupSession({ challenge: 'valid' });
  try {
    expect(session.ready()).toBe(true);
    expect(session.loggedIn()).toBe(true);
    expect(session.displayName()).toBe('Ada Lovelace');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-67, scope=range_end, role=Test)

// @relation(GSSC-MLLR-68, scope=range_start, role=Test)
test('GSSC-MLLR-68 Semantic', async () => {
  const { session, restore } = await setupSession({ challenge: 'invalid' });
  try {
    expect(session.ready()).toBe(true);
    expect(session.loggedIn()).toBe(false);
    expect(session.displayName()).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-68, scope=range_end, role=Test)

// @relation(GSSC-MLLR-69, scope=range_start, role=Test)
test('GSSC-MLLR-69 Semantic', async () => {
  const { session, restore } = await setupSession({ challenge: 'invalid' });
  try {
    let seenBody: unknown;
    memberSessionApi.login = (async (body: unknown) => {
      seenBody = body;
      return okResponse({ status: 'ok' }) as never;
    }) as typeof memberSessionApi.login;
    memberSessionApi.challenge = (async () =>
      okResponse({ status: 'valid', cuid: 'user_1' })) as typeof memberSessionApi.challenge;

    const okUser = await session.login({ identity: 'ada', password: 'secret' });
    expect(okUser).toBe(true);
    expect(seenBody).toEqual({ username: 'ada', password: 'secret' });

    const okEmail = await session.login({
      identity: 'ada@example.com',
      password: 'secret',
    });
    expect(okEmail).toBe(true);
    expect(seenBody).toEqual({
      primaryEmail: 'ada@example.com',
      password: 'secret',
    });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-69, scope=range_end, role=Test)

// @relation(GSSC-MLLR-70, scope=range_start, role=Test)
test('GSSC-MLLR-70 Semantic', async () => {
  const { session, restore } = await setupSession({ challenge: 'invalid' });
  try {
    memberSessionApi.login = (async () =>
      okResponse({ status: 'ok' })) as typeof memberSessionApi.login;
    memberSessionApi.challenge = (async () =>
      okResponse({ status: 'valid', cuid: 'user_1' })) as typeof memberSessionApi.challenge;

    expect(session.loggedIn()).toBe(false);
    const ok = await session.login({ identity: 'ada', password: 'secret' });
    expect(ok).toBe(true);
    expect(session.loggedIn()).toBe(true);
    expect(session.displayName()).toBe('Ada Lovelace');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-70, scope=range_end, role=Test)

// @relation(GSSC-MLLR-71, scope=range_start, role=Test)
test('GSSC-MLLR-71 Semantic', async () => {
  const { session, restore } = await setupSession({ challenge: 'invalid' });
  try {
    memberSessionApi.login = (async () => errResponse(403)) as typeof memberSessionApi.login;
    session.setSession('Ada');
    expect(session.loggedIn()).toBe(true);

    const ok = await session.login({ identity: 'ada', password: 'wrong' });
    expect(ok).toBe(false);
    expect(session.loggedIn()).toBe(false);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-71, scope=range_end, role=Test)
