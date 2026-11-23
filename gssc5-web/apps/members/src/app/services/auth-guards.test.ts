import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import {
  RETURN_URL_QUERY,
  redirectIfAuthenticatedGuard,
  requireAuthGuard,
  resolveReturnUrl,
} from './auth-guards';
import { MemberSession, memberSessionApi } from './member-session';

@Component({
  selector: 'gssc-guard-home-stub',
  template: '<p>home</p>',
})
class HomeStub {}

@Component({
  selector: 'gssc-guard-login-stub',
  template: '<p>login</p>',
})
class LoginStub {}

function stubChallenge(mode: 'valid' | 'invalid'): void {
  memberSessionApi.challenge = (async () =>
    mode === 'valid'
      ? {
          data: { status: 'valid', cuid: 'user_1' },
          error: null,
          response: new Response(null, { status: 200 }),
          status: 200,
          headers: new Headers(),
        }
      : {
          data: { status: 'invalid' },
          error: null,
          response: new Response(null, { status: 200 }),
          status: 200,
          headers: new Headers(),
        }) as unknown as typeof memberSessionApi.challenge;

  memberSessionApi.getUser = (async () =>
    ({
      data: { firstName: 'Ada', lastName: 'Lovelace', username: 'ada' },
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.getUser;
}

async function setupGuards(loggedIn: boolean): Promise<{
  router: Router;
  session: MemberSession;
}> {
  stubChallenge(loggedIn ? 'valid' : 'invalid');
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'login',
          component: LoginStub,
          canActivate: [redirectIfAuthenticatedGuard],
        },
        {
          path: '',
          pathMatch: 'full',
          component: HomeStub,
          canActivate: [requireAuthGuard],
        },
        {
          path: 'deep',
          component: HomeStub,
          canActivate: [requireAuthGuard],
        },
      ]),
    ],
  }).compileComponents();

  const session = TestBed.inject(MemberSession);
  const router = TestBed.inject(Router);
  await session.whenReady();
  if (loggedIn) session.setSession('Ada');
  else {
    session.loggedIn.set(false);
    session.displayName.set('');
  }
  session.ready.set(true);
  return { router, session };
}

test('resolveReturnUrl accepts relative member paths only', () => {
  expect(resolveReturnUrl('/deep')).toBe('/deep');
  expect(resolveReturnUrl('/')).toBe('/');
  expect(resolveReturnUrl('/login')).toBeNull();
  expect(resolveReturnUrl('https://evil.example/')).toBeNull();
  expect(resolveReturnUrl('//evil.example')).toBeNull();
});

// @relation(GSSC-MLLR-92, scope=range_start, role=Test)
test('GSSC-MLLR-92 Semantic', async () => {
  const { router } = await setupGuards(false);
  await router.navigateByUrl('/deep');
  expect(router.url).toBe(`/login?${RETURN_URL_QUERY}=${encodeURIComponent('/deep')}`);
});
// @relation(GSSC-MLLR-92, scope=range_end, role=Test)

// @relation(GSSC-MLLR-93, scope=range_start, role=Test)
test('GSSC-MLLR-93 Semantic', async () => {
  // Explicit Header logout navigates to /login with no return query — exercised
  // in header tests; guard helper must not invent a return path for bare /login.
  const { router } = await setupGuards(false);
  await router.navigateByUrl('/login');
  expect(router.url).toBe('/login');
  expect(router.url.includes(RETURN_URL_QUERY)).toBe(false);
});
// @relation(GSSC-MLLR-93, scope=range_end, role=Test)

// @relation(GSSC-MLLR-94, scope=range_start, role=Test)
test('GSSC-MLLR-94 Semantic', async () => {
  const { router } = await setupGuards(true);
  await router.navigateByUrl('/login');
  expect(router.url.split('?')[0]).toBe('/');

  await router.navigateByUrl(`/login?${RETURN_URL_QUERY}=${encodeURIComponent('/deep')}`);
  expect(router.url.split('?')[0]).toBe('/deep');
});
// @relation(GSSC-MLLR-94, scope=range_end, role=Test)

