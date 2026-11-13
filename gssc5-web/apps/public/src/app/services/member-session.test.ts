import { TestBed } from '@angular/core/testing';
import { MemberSession, memberSessionApi } from './member-session';

type LogoutFn = typeof memberSessionApi.logout;

function stubLogout(outcome: 'success' | 'error' | 'throw'): () => void {
  const original = memberSessionApi.logout;
  memberSessionApi.logout = (async () => {
    if (outcome === 'throw') {
      throw new Error('network down');
    }
    if (outcome === 'error') {
      return {
        data: null,
        error: { status: 500, value: 'Failed' },
        response: new Response(null, { status: 500 }),
        status: 500,
        headers: new Headers(),
      };
    }
    return {
      data: null,
      error: null,
      response: new Response(null, { status: 204 }),
      status: 204,
      headers: new Headers(),
    };
  }) as unknown as LogoutFn;
  return () => {
    memberSessionApi.logout = original;
  };
}

function stubChallengeInvalid(): () => void {
  const original = memberSessionApi.challenge;
  memberSessionApi.challenge = (async () =>
    ({
      data: 'invalid',
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.challenge;
  return () => {
    memberSessionApi.challenge = original;
  };
}

function clearStorage(): void {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
    globalThis.localStorage?.removeItem('gssc.memberEmailAddress');
  } catch {
    // ignore
  }
}

async function freshSession(): Promise<{ session: MemberSession; restoreChallenge: () => void }> {
  clearStorage();
  const restoreChallenge = stubChallengeInvalid();
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ providers: [MemberSession] }).compileComponents();
  const session = TestBed.inject(MemberSession);
  await session.refresh();
  return { session, restoreChallenge };
}

// @relation(GSSC-PLLR-64, scope=range_start, role=Test)
test('GSSC-PLLR-64 MemberSession logout ends backend session before clearing UI', async () => {
  const { session, restoreChallenge } = await freshSession();
  session.setSession('Ada');
  expect(session.loggedIn()).toBe(true);

  const restoreSuccess = stubLogout('success');
  const order: string[] = [];
  const originalPost = memberSessionApi.logout;
  memberSessionApi.logout = (async () => {
    order.push('backend');
    const result = await originalPost();
    expect(session.loggedIn()).toBe(true);
    return result;
  }) as unknown as LogoutFn;

  try {
    const ok = await session.logout();
    expect(ok).toBe(true);
    expect(session.loggedIn()).toBe(false);
    expect(order[0]).toBe('backend');
  } finally {
    memberSessionApi.logout = originalPost;
    restoreSuccess();
    restoreChallenge();
  }
});
// @relation(GSSC-PLLR-64, scope=range_end, role=Test)

test('MemberSession logout keeps UI logged-in when backend logout fails', async () => {
  const { session, restoreChallenge } = await freshSession();
  session.setSession('Ada');
  const restore = stubLogout('error');
  try {
    const ok = await session.logout();
    expect(ok).toBe(false);
    expect(session.loggedIn()).toBe(true);
    expect(session.displayName()).toBe('Ada');
  } finally {
    restore();
    restoreChallenge();
  }
});

test('MemberSession logout keeps UI logged-in when backend logout throws', async () => {
  const { session, restoreChallenge } = await freshSession();
  session.setSession('Ada');
  const restore = stubLogout('throw');
  try {
    const ok = await session.logout();
    expect(ok).toBe(false);
    expect(session.loggedIn()).toBe(true);
  } finally {
    restore();
    restoreChallenge();
  }
});
