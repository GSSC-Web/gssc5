import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { MemberSession, memberSessionApi } from './services/member-session';
import { nativeElement, setupMembersComponent } from '../test-harness';

function stubChallengeLoggedOut(): void {
  memberSessionApi.challenge = (async () =>
    ({
      data: { status: 'invalid' },
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.challenge;
}

function stubChallengeLoggedIn(): void {
  memberSessionApi.challenge = (async () =>
    ({
      data: { status: 'valid', cuid: 'user_test' },
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.challenge;
  memberSessionApi.getUser = (async () =>
    ({
      data: { firstName: 'Ada', lastName: 'Lovelace', username: 'ada' },
      error: null,
      response: new Response(null, { status: 200 }),
      status: 200,
      headers: new Headers(),
    })) as unknown as typeof memberSessionApi.getUser;
}

async function setupApp(
  url = '/',
  options?: { loggedIn?: boolean },
): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<App>>>;
  router: Router;
  session: MemberSession;
  root: HTMLElement;
}> {
  const loggedIn = options?.loggedIn ?? true;
  if (loggedIn) stubChallengeLoggedIn();
  else stubChallengeLoggedOut();

  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  const fixture = await setupMembersComponent(App);
  const router = TestBed.inject(Router);
  const session = TestBed.inject(MemberSession);
  router.resetConfig(routes);
  await fixture.whenStable();
  if (loggedIn) {
    session.setSession('Ada Lovelace');
  } else {
    session.loggedIn.set(false);
    session.displayName.set('');
  }
  // ready may already be true from constructor refresh; ensure guards proceed
  session.ready.set(true);
  await router.navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, session, root: nativeElement(fixture) };
}

function hostOf(root: HTMLElement): HTMLElement {
  return root.matches('gssc-root') ? root : (root.querySelector('gssc-root') ?? root);
}

// Baseline STD smoke for the members testing harness (GSSC5-80).
// Feature LLR tests below own @relation markers; do not test the harness itself.
test('members harness mounts App shell', async () => {
  const { root } = await setupApp('/');
  expect(root.querySelector('[data-slot="header"]')).not.toBeNull();
  expect(root.querySelector('[data-slot="footer"]')).not.toBeNull();
  expect(root.querySelector('router-outlet')).not.toBeNull();
});

// @relation(GSSC-MLLR-1, scope=range_start, role=Test)
test('GSSC-MLLR-1 Semantic', async () => {
  const { root } = await setupApp('/');
  expect(root.querySelector('router-outlet')).not.toBeNull();
  expect(root.querySelector('[data-slot="header"]')).not.toBeNull();
  expect(root.querySelector('[data-slot="footer"]')).not.toBeNull();
  expect(root.querySelector('gssc-header')).not.toBeNull();
  expect(root.querySelector('gssc-footer')).not.toBeNull();
});
// @relation(GSSC-MLLR-1, scope=range_end, role=Test)

// @relation(GSSC-MLLR-32, scope=range_start, role=Test)
test('GSSC-MLLR-32 Semantic', async () => {
  const { root } = await setupApp('/login', { loggedIn: false });
  expect(root.querySelector('router-outlet')).not.toBeNull();
  expect(root.querySelector('[data-slot="header"]')).toBeNull();
  expect(root.querySelector('[data-slot="footer"]')).toBeNull();
  expect(root.querySelector('gssc-header')).toBeNull();
  expect(root.querySelector('gssc-footer')).toBeNull();
});
// @relation(GSSC-MLLR-32, scope=range_end, role=Test)

// @relation(GSSC-MLLR-2, scope=range_start, role=Test)
test('GSSC-MLLR-2 Syntactic', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const appRoot = root.querySelector<HTMLElement>('.gssc-app-root')!;
  expect(host.classList.contains('min-h-dvh')).toBe(true);
  expect(appRoot.classList.contains('min-h-dvh')).toBe(true);
  expect(appRoot.classList.contains('flex')).toBe(true);
  expect(appRoot.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-MLLR-2, scope=range_end, role=Test)

// @relation(GSSC-MLLR-3, scope=range_start, role=Test)
test('GSSC-MLLR-3 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const appRoot = root.querySelector<HTMLElement>('.gssc-app-root')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);
  expect(host.classList.contains('text-gssc-black')).toBe(true);
  expect(appRoot.classList.contains('bg-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-3, scope=range_end, role=Test)

// @relation(GSSC-MLLR-4, scope=range_start, role=Test)
test('GSSC-MLLR-4 Semantic', async () => {
  const { root } = await setupApp();
  const host = root.querySelector('[data-slot="header"]');
  expect(host).not.toBeNull();
  expect(host!.querySelector('gssc-header')).not.toBeNull();
});
// @relation(GSSC-MLLR-4, scope=range_end, role=Test)

// @relation(GSSC-MLLR-5, scope=range_start, role=Test)
test('GSSC-MLLR-5 Syntactic', async () => {
  const { root } = await setupApp();
  const header = root.querySelector<HTMLElement>('[data-slot="header"]')!;
  expect(header.classList.contains('sticky')).toBe(true);
  expect(header.classList.contains('top-0')).toBe(true);
  expect(header.classList.contains('z-[1]')).toBe(true);
});
// @relation(GSSC-MLLR-5, scope=range_end, role=Test)

// @relation(GSSC-MLLR-6, scope=range_start, role=Test)
test('GSSC-MLLR-6 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const header = root.querySelector<HTMLElement>('[data-slot="header"]')!;
  expect(getComputedStyle(header).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(header).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-MLLR-6, scope=range_end, role=Test)

// @relation(GSSC-MLLR-7, scope=range_start, role=Test)
test('GSSC-MLLR-7 Semantic', async () => {
  const { root } = await setupApp();
  const host = root.querySelector('[data-slot="footer"]');
  expect(host).not.toBeNull();
  expect(host!.querySelector('gssc-footer')).not.toBeNull();
});
// @relation(GSSC-MLLR-7, scope=range_end, role=Test)

// @relation(GSSC-MLLR-8, scope=range_start, role=Test)
test('GSSC-MLLR-8 Syntactic', async () => {
  const { root } = await setupApp();
  const children = [...root.querySelector('.gssc-app-root')!.children];
  expect(children.at(-1)?.getAttribute('data-slot')).toBe('footer');
});
// @relation(GSSC-MLLR-8, scope=range_end, role=Test)

// @relation(GSSC-MLLR-9, scope=range_start, role=Test)
test('GSSC-MLLR-9 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const footer = root.querySelector<HTMLElement>('[data-slot="footer"]')!;
  expect(getComputedStyle(footer).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(footer).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-MLLR-9, scope=range_end, role=Test)

// @relation(GSSC-MLLR-10, scope=range_start, role=Test)
test('GSSC-MLLR-10 Semantic', async () => {
  const { root } = await setupApp('/');
  expect(root.querySelector('router-outlet')).not.toBeNull();
  expect(root.querySelector('gssc-home-page')).not.toBeNull();
});
// @relation(GSSC-MLLR-10, scope=range_end, role=Test)

// @relation(GSSC-MLLR-11, scope=range_start, role=Test)
test('GSSC-MLLR-11 Syntactic', async () => {
  const { root } = await setupApp('/');
  const appRoot = root.querySelector('.gssc-app-root')!;
  const header = appRoot.querySelector('[data-slot="header"]')!;
  const footer = appRoot.querySelector('[data-slot="footer"]')!;
  const page = appRoot.querySelector<HTMLElement>('.gssc-page')!;
  const outlet = page.querySelector('router-outlet')!;
  expect(header.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(outlet.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(page.classList.contains('flex-auto')).toBe(true);
});
// @relation(GSSC-MLLR-11, scope=range_end, role=Test)

// @relation(GSSC-MLLR-12, scope=range_start, role=Test)
test('GSSC-MLLR-12 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const page = root.querySelector<HTMLElement>('.gssc-page')!;
  expect(getComputedStyle(page).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(page).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-MLLR-12, scope=range_end, role=Test)

// @relation(GSSC-MLLR-13, scope=range_start, role=Test)
test('GSSC-MLLR-13 Home Page Route', async () => {
  const { router, root } = await setupApp('/');
  expect(router.url.split('?')[0]).toBe('/');
  expect(root.querySelector('gssc-home-page')).not.toBeNull();
});
// @relation(GSSC-MLLR-13, scope=range_end, role=Test)
