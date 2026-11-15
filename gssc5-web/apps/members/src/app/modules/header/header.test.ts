import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { Header } from './header';

function stubBackendLogoutSuccess(): () => void {
  const original = memberSessionApi.logout;
  memberSessionApi.logout = (async () =>
    ({
      data: null,
      error: null,
      response: new Response(null, { status: 204 }),
      status: 204,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.logout;
  return () => {
    memberSessionApi.logout = original;
  };
}

function stubChallengeLoggedOut(): () => void {
  const originalChallenge = memberSessionApi.challenge;
  memberSessionApi.challenge = (async () =>
    ({
      data: { status: 'invalid' },
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.challenge;
  return () => {
    memberSessionApi.challenge = originalChallenge;
  };
}

async function setupHeader(options?: {
  loggedIn?: boolean;
  displayName?: string;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<Header>>>;
  router: Router;
  session: MemberSession;
  root: HTMLElement;
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  stubChallengeLoggedOut();
  const fixture = await setupMembersComponent(Header);
  const router = TestBed.inject(Router);
  router.resetConfig([
    ...routes,
    { path: 'login', pathMatch: 'full', component: Header },
  ]);
  const session = TestBed.inject(MemberSession);

  // Allow in-flight constructor refresh (stubbed) to settle before overriding state.
  await fixture.whenStable();

  if (options?.loggedIn) {
    session.setSession(options.displayName ?? 'Ada');
  } else {
    session.loggedIn.set(false);
    session.displayName.set('');
  }

  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    router,
    session,
    root: nativeElement(fixture),
  };
}

// @relation(GSSC-MLLR-14, scope=range_start, role=Test)
test('GSSC-MLLR-14 Semantic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: false });
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav')).toBeNull();
  expect(root.querySelector('.gssc-header__greeting')).toBeNull();
  expect(root.querySelector('.gssc-header__logout')).toBeNull();

  session.setSession('Ada');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav')).not.toBeNull();
  expect(root.querySelector('.gssc-header__greeting')).not.toBeNull();
  expect(root.querySelector('.gssc-header__logout')).not.toBeNull();
  expect(root.querySelector('.gssc-header__login')).toBeNull();
});
// @relation(GSSC-MLLR-14, scope=range_end, role=Test)

// @relation(GSSC-MLLR-15, scope=range_start, role=Test)
test('GSSC-MLLR-15 Syntactic', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  expect(bar.classList.contains('flex')).toBe(true);
  expect(bar.classList.contains('w-full')).toBe(true);
  expect(bar.classList.contains('flex-wrap')).toBe(true);
  expect(bar.classList.contains('items-center')).toBe(true);
});
// @relation(GSSC-MLLR-15, scope=range_end, role=Test)

// @relation(GSSC-MLLR-16, scope=range_start, role=Test)
test('GSSC-MLLR-16 Lexical', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  expect(bar.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(bar.classList.contains('border-gssc-gray')).toBe(true);
  expect(bar.classList.contains('border-b-4')).toBe(true);
  expect(bar.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(bar.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-MLLR-16, scope=range_end, role=Test)

// @relation(GSSC-MLLR-17, scope=range_start, role=Test)
test('GSSC-MLLR-17 Semantic', async () => {
  const { fixture, root, router } = await setupHeader();
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-header__logo')!;
  expect(logo.querySelector('.gssc-header__logo-mark')).not.toBeNull();
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  await router.navigateByUrl('/login');
  fixture.detectChanges();
  logo.click();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/');
});
// @relation(GSSC-MLLR-17, scope=range_end, role=Test)

// @relation(GSSC-MLLR-18, scope=range_start, role=Test)
test('GSSC-MLLR-18 Syntactic', async () => {
  const { root } = await setupHeader();
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.firstElementChild?.classList.contains('gssc-header__logo')).toBe(true);
  expect(root.querySelector('.gssc-header')!.querySelector('.gssc-header__logo')).not.toBeNull();
});
// @relation(GSSC-MLLR-18, scope=range_end, role=Test)

// @relation(GSSC-MLLR-19, scope=range_start, role=Test)
test('GSSC-MLLR-19 Lexical', async () => {
  const { root } = await setupHeader();
  const logo = root.querySelector<HTMLElement>('.gssc-header__logo')!;
  expect(logo.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-19, scope=range_end, role=Test)

// @relation(GSSC-MLLR-20, scope=range_start, role=Test)
test('GSSC-MLLR-20 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({ loggedIn: true });
  const dashboard = root.querySelector<HTMLAnchorElement>('.gssc-header__nav-dashboard')!;
  expect(dashboard).not.toBeNull();
  expect(textContent(root, '.gssc-header__nav-dashboard')).toBe('Dashboard');
  await router.navigateByUrl('/login');
  fixture.detectChanges();
  dashboard.click();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/');
});
// @relation(GSSC-MLLR-20, scope=range_end, role=Test)

// @relation(GSSC-MLLR-21, scope=range_start, role=Test)
test('GSSC-MLLR-21 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  const header = root.querySelector('.gssc-header')!;
  const logo = header.querySelector('.gssc-header__logo')!;
  const nav = header.querySelector('.gssc-header__nav')!;
  expect(logo.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  session.loggedIn.set(false);
  session.displayName.set('');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__nav')).toBeNull();
});
// @relation(GSSC-MLLR-21, scope=range_end, role=Test)

// @relation(GSSC-MLLR-22, scope=range_start, role=Test)
test('GSSC-MLLR-22 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const nav = root.querySelector<HTMLElement>('.gssc-header__nav')!;
  expect(nav.classList.contains('font-sans')).toBe(true);
  expect(nav.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-22, scope=range_end, role=Test)

// @relation(GSSC-MLLR-23, scope=range_start, role=Test)
test('GSSC-MLLR-23 Semantic', async () => {
  const { root } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  expect(textContent(root, '.gssc-header__greeting')).toBe('Hello, Ada');
});
// @relation(GSSC-MLLR-23, scope=range_end, role=Test)

// @relation(GSSC-MLLR-24, scope=range_start, role=Test)
test('GSSC-MLLR-24 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  expect(root.querySelector('.gssc-header__account .gssc-header__greeting')).not.toBeNull();

  session.loggedIn.set(false);
  session.displayName.set('');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__greeting')).toBeNull();
});
// @relation(GSSC-MLLR-24, scope=range_end, role=Test)

// @relation(GSSC-MLLR-25, scope=range_start, role=Test)
test('GSSC-MLLR-25 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  const greeting = root.querySelector<HTMLElement>('.gssc-header__greeting')!;
  expect(greeting.classList.contains('font-sans')).toBe(true);
  expect(greeting.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-25, scope=range_end, role=Test)

// @relation(GSSC-MLLR-26, scope=range_start, role=Test)
test('GSSC-MLLR-26 Semantic', async () => {
  const restoreLogout = stubBackendLogoutSuccess();
  try {
    const { fixture, root, session } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
    expect(session.loggedIn()).toBe(true);
    root.querySelector<HTMLButtonElement>('.gssc-header__logout')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(session.loggedIn()).toBe(false);
    expect(root.querySelector('.gssc-header__logout')).toBeNull();
    expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  } finally {
    restoreLogout();
  }
});
// @relation(GSSC-MLLR-26, scope=range_end, role=Test)

// @relation(GSSC-MLLR-27, scope=range_start, role=Test)
test('GSSC-MLLR-27 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__account .gssc-header__logout')).not.toBeNull();

  session.loggedIn.set(false);
  session.displayName.set('');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__logout')).toBeNull();
});
// @relation(GSSC-MLLR-27, scope=range_end, role=Test)

// @relation(GSSC-MLLR-28, scope=range_start, role=Test)
test('GSSC-MLLR-28 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const logout = root.querySelector<HTMLElement>('.gssc-header__logout')!;
  expect(logout.classList.contains('font-sans')).toBe(true);
  expect(logout.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-28, scope=range_end, role=Test)

// @relation(GSSC-MLLR-29, scope=range_start, role=Test)
test('GSSC-MLLR-29 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({ loggedIn: false });
  const login = root.querySelector<HTMLAnchorElement>('.gssc-header__login')!;
  expect(login).not.toBeNull();
  await router.navigateByUrl('/');
  fixture.detectChanges();
  login.click();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/login');
});
// @relation(GSSC-MLLR-29, scope=range_end, role=Test)

// @relation(GSSC-MLLR-30, scope=range_start, role=Test)
test('GSSC-MLLR-30 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: false });
  expect(root.querySelector('.gssc-header__account .gssc-header__login')).not.toBeNull();

  session.setSession('Ada');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__login')).toBeNull();
});
// @relation(GSSC-MLLR-30, scope=range_end, role=Test)

// @relation(GSSC-MLLR-31, scope=range_start, role=Test)
test('GSSC-MLLR-31 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: false });
  const login = root.querySelector<HTMLElement>('.gssc-header__login')!;
  expect(login.classList.contains('font-sans')).toBe(true);
  expect(login.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-31, scope=range_end, role=Test)
