import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { RETURN_URL_QUERY } from '../../services/auth-guards';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { LoginPage } from './login';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

function stubLoggedOutChallenge(): void {
  memberSessionApi.challenge = (async () =>
    okResponse({ status: 'invalid' })) as typeof memberSessionApi.challenge;
}

async function setupLogin(url = '/login'): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<LoginPage>>>;
  router: Router;
  session: MemberSession;
  root: HTMLElement;
  page: LoginPage;
}> {
  stubLoggedOutChallenge();
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  const fixture = await setupMembersComponent(LoginPage);
  const router = TestBed.inject(Router);
  const session = TestBed.inject(MemberSession);
  router.resetConfig(routes);
  await fixture.whenStable();
  session.loggedIn.set(false);
  session.displayName.set('');
  session.ready.set(true);
  await router.navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    router,
    session,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
  };
}

// @relation(GSSC-MLLR-72, scope=range_start, role=Test)
test('GSSC-MLLR-72 Semantic', async () => {
  const { root } = await setupLogin();
  expect(root.querySelector('.gssc-login-page__logo')).not.toBeNull();
  expect(root.querySelector('.gssc-login-page__identity-control')).not.toBeNull();
  expect(root.querySelector('.gssc-login-page__password-control')).not.toBeNull();
  expect(root.querySelector('.gssc-login-page__submit')).not.toBeNull();
});
// @relation(GSSC-MLLR-72, scope=range_end, role=Test)

// @relation(GSSC-MLLR-73, scope=range_start, role=Test)
test('GSSC-MLLR-73 Syntactic', async () => {
  const { root } = await setupLogin();
  const page = root.querySelector<HTMLElement>('.gssc-login-page')!;
  expect(page.classList.contains('mx-auto')).toBe(true);
  expect(page.classList.contains('items-center')).toBe(true);
  expect(page.classList.contains('justify-center')).toBe(true);
  expect(page.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-MLLR-73, scope=range_end, role=Test)

// @relation(GSSC-MLLR-74, scope=range_start, role=Test)
test('GSSC-MLLR-74 Lexical', async () => {
  const { root } = await setupLogin();
  const page = root.querySelector<HTMLElement>('.gssc-login-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-MLLR-74, scope=range_end, role=Test)

// @relation(GSSC-MLLR-75, scope=range_start, role=Test)
test('GSSC-MLLR-75 Semantic', async () => {
  const { root } = await setupLogin();
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-login-page__logo')!;
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  expect(logo.querySelector('.gssc-login-page__logo-mark')).not.toBeNull();
});
// @relation(GSSC-MLLR-75, scope=range_end, role=Test)

// @relation(GSSC-MLLR-76, scope=range_start, role=Test)
test('GSSC-MLLR-76 Syntactic', async () => {
  const { root } = await setupLogin();
  const page = root.querySelector('.gssc-login-page')!;
  const logo = page.querySelector('.gssc-login-page__logo')!;
  const form = page.querySelector('.gssc-login-page__form')!;
  expect(logo.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-76, scope=range_end, role=Test)

// @relation(GSSC-MLLR-77, scope=range_start, role=Test)
test('GSSC-MLLR-77 Lexical', async () => {
  const { root } = await setupLogin();
  const mark = root.querySelector<HTMLImageElement>('.gssc-login-page__logo-mark')!;
  expect(mark.tagName).toBe('IMG');
  expect(mark.getAttribute('src')).toBe('/gssc-society-logo.png');
  expect(mark.getAttribute('width')).toBe('96');
  expect(mark.getAttribute('height')).toBe('96');
  expect(mark.classList.contains('size-24')).toBe(true);
  expect(mark.classList.contains('object-contain')).toBe(true);
});
// @relation(GSSC-MLLR-77, scope=range_end, role=Test)

// @relation(GSSC-MLLR-78, scope=range_start, role=Test)
test('GSSC-MLLR-78 Semantic', async () => {
  const { root, page, fixture } = await setupLogin();
  const control = root.querySelector<HTMLInputElement>('.gssc-login-page__identity-control')!;
  expect(control.type).toBe('text');
  expect(control.required).toBe(true);
  control.value = 'ada';
  control.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.identity).toBe('ada');
});
// @relation(GSSC-MLLR-78, scope=range_end, role=Test)

// @relation(GSSC-MLLR-79, scope=range_start, role=Test)
test('GSSC-MLLR-79 Syntactic', async () => {
  const { root } = await setupLogin();
  const form = root.querySelector('.gssc-login-page__form')!;
  const identity = form.querySelector('.gssc-login-page__identity')!;
  const password = form.querySelector('.gssc-login-page__password')!;
  expect(identity.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-79, scope=range_end, role=Test)

// @relation(GSSC-MLLR-80, scope=range_start, role=Test)
test('GSSC-MLLR-80 Lexical', async () => {
  const { root } = await setupLogin();
  const field = root.querySelector<HTMLElement>('.gssc-login-page__identity')!;
  const label = root.querySelector<HTMLElement>('.gssc-login-page__identity-label')!;
  expect(field.classList.contains('font-sans')).toBe(true);
  expect(field.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(label.classList.contains('text-xs')).toBe(true);
  expect(label.classList.contains('italic')).toBe(true);
});
// @relation(GSSC-MLLR-80, scope=range_end, role=Test)

// @relation(GSSC-MLLR-81, scope=range_start, role=Test)
test('GSSC-MLLR-81 Semantic', async () => {
  const { root, page, fixture } = await setupLogin();
  const control = root.querySelector<HTMLInputElement>('.gssc-login-page__password-control')!;
  expect(control.type).toBe('password');
  expect(control.required).toBe(true);
  control.value = 'secret';
  control.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(page.password).toBe('secret');
});
// @relation(GSSC-MLLR-81, scope=range_end, role=Test)

// @relation(GSSC-MLLR-82, scope=range_start, role=Test)
test('GSSC-MLLR-82 Syntactic', async () => {
  const { root } = await setupLogin();
  const form = root.querySelector('.gssc-login-page__form')!;
  const password = form.querySelector('.gssc-login-page__password')!;
  const submit = form.querySelector('.gssc-login-page__submit')!;
  expect(password.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-82, scope=range_end, role=Test)

// @relation(GSSC-MLLR-83, scope=range_start, role=Test)
test('GSSC-MLLR-83 Lexical', async () => {
  const { root } = await setupLogin();
  const field = root.querySelector<HTMLElement>('.gssc-login-page__password')!;
  const label = root.querySelector<HTMLElement>('.gssc-login-page__password-label')!;
  expect(field.classList.contains('font-sans')).toBe(true);
  expect(label.classList.contains('text-xs')).toBe(true);
  expect(label.classList.contains('italic')).toBe(true);
});
// @relation(GSSC-MLLR-83, scope=range_end, role=Test)

// @relation(GSSC-MLLR-84, scope=range_start, role=Test)
test('GSSC-MLLR-84 Semantic', async () => {
  const { root } = await setupLogin();
  const submit = root.querySelector<HTMLButtonElement>('.gssc-login-page__submit')!;
  expect(submit.type).toBe('submit');
  expect(submit.textContent?.trim()).toBe('Login');
});
// @relation(GSSC-MLLR-84, scope=range_end, role=Test)

// @relation(GSSC-MLLR-85, scope=range_start, role=Test)
test('GSSC-MLLR-85 Syntactic', async () => {
  const { root } = await setupLogin();
  const form = root.querySelector('.gssc-login-page__form')!;
  const children = [...form.children];
  expect(children.at(-1)?.classList.contains('gssc-login-page__submit')).toBe(true);
});
// @relation(GSSC-MLLR-85, scope=range_end, role=Test)

// @relation(GSSC-MLLR-86, scope=range_start, role=Test)
test('GSSC-MLLR-86 Lexical', async () => {
  const { root } = await setupLogin();
  const submit = root.querySelector<HTMLElement>('.gssc-login-page__submit')!;
  expect(submit.classList.contains('font-sans')).toBe(true);
  expect(submit.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(submit.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(submit.classList.contains('border-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-86, scope=range_end, role=Test)

// @relation(GSSC-MLLR-87, scope=range_start, role=Test)
test('GSSC-MLLR-87 Semantic', async () => {
  const { root, page, fixture } = await setupLogin();
  expect(root.querySelector('.gssc-login-page__failure')).toBeNull();
  memberSessionApi.login = (async () =>
    ({
      data: null,
      error: { status: 403, value: 'Forbidden' },
      response: new Response(null, { status: 403 }),
      status: 403,
      headers: new Headers(),
    })) as typeof memberSessionApi.login;
  page.identity = 'ada';
  page.password = 'wrong';
  await page.onSubmit();
  fixture.detectChanges();
  expect(textContent(root, '.gssc-login-page__failure')).toBe('Login did not succeed.');
});
// @relation(GSSC-MLLR-87, scope=range_end, role=Test)

// @relation(GSSC-MLLR-88, scope=range_start, role=Test)
test('GSSC-MLLR-88 Syntactic', async () => {
  const { root, page, fixture } = await setupLogin();
  memberSessionApi.login = (async () =>
    ({
      data: null,
      error: { status: 403, value: 'Forbidden' },
      response: new Response(null, { status: 403 }),
      status: 403,
      headers: new Headers(),
    })) as typeof memberSessionApi.login;
  page.identity = 'ada';
  page.password = 'wrong';
  await page.onSubmit();
  fixture.detectChanges();
  const form = root.querySelector('.gssc-login-page__form')!;
  const failure = form.querySelector('.gssc-login-page__failure')!;
  const submit = form.querySelector('.gssc-login-page__submit')!;
  expect(failure.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-88, scope=range_end, role=Test)

// @relation(GSSC-MLLR-89, scope=range_start, role=Test)
test('GSSC-MLLR-89 Lexical', async () => {
  const { root, page, fixture } = await setupLogin();
  memberSessionApi.login = (async () =>
    ({
      data: null,
      error: { status: 403, value: 'Forbidden' },
      response: new Response(null, { status: 403 }),
      status: 403,
      headers: new Headers(),
    })) as typeof memberSessionApi.login;
  page.identity = 'ada';
  page.password = 'wrong';
  await page.onSubmit();
  fixture.detectChanges();
  const failure = root.querySelector<HTMLElement>('.gssc-login-page__failure')!;
  expect(failure.classList.contains('font-sans')).toBe(true);
  expect(failure.classList.contains('text-gssc-dark-red')).toBe(true);
  expect(failure.classList.contains('text-sm')).toBe(true);
});
// @relation(GSSC-MLLR-89, scope=range_end, role=Test)

// @relation(GSSC-MLLR-90, scope=range_start, role=Test)
test('GSSC-MLLR-90 Semantic', async () => {
  const { root } = await setupLogin();
  const form = root.querySelector('form.gssc-login-page__form')!;
  // Enter in either field submits via native form submit (ngSubmit).
  expect(form.querySelector('.gssc-login-page__identity-control')).not.toBeNull();
  expect(form.querySelector('.gssc-login-page__password-control')).not.toBeNull();
  expect(form.querySelector('button[type="submit"]')).not.toBeNull();
});
// @relation(GSSC-MLLR-90, scope=range_end, role=Test)

// @relation(GSSC-MLLR-91, scope=range_start, role=Test)
test('GSSC-MLLR-91 Semantic', async () => {
  const { root, page, fixture } = await setupLogin();
  await page.onSubmit();
  fixture.detectChanges();
  expect(page.identityInvalid()).toBe(true);
  expect(page.passwordInvalid()).toBe(true);
  expect(
    root.querySelector('.gssc-login-page__identity')!.classList.contains('border-gssc-dark-red'),
  ).toBe(true);
  expect(
    root.querySelector('.gssc-login-page__password')!.classList.contains('border-gssc-dark-red'),
  ).toBe(true);
});
// @relation(GSSC-MLLR-91, scope=range_end, role=Test)

// @relation(GSSC-MLLR-95, scope=range_start, role=Test)
test('GSSC-MLLR-95 Semantic login destination', async () => {
  const { page, router, session, fixture } = await setupLogin(
    `/login?${RETURN_URL_QUERY}=${encodeURIComponent('/deep')}`,
  );
  memberSessionApi.login = (async () => okResponse({ status: 'ok' })) as typeof memberSessionApi.login;
  memberSessionApi.challenge = (async () =>
    okResponse({ status: 'valid', cuid: 'user_1' })) as typeof memberSessionApi.challenge;
  memberSessionApi.getUser = (async () =>
    okResponse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
    })) as typeof memberSessionApi.getUser;

  // Ensure /deep is a reachable authenticated route for the redirect target.
  router.resetConfig([
    ...routes,
    {
      path: 'deep',
      pathMatch: 'full',
      component: LoginPage,
      canActivate: routes[1]?.canActivate,
    },
  ]);

  page.identity = 'ada';
  page.password = 'secret';
  await page.onSubmit();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(session.loggedIn()).toBe(true);
  expect(router.url.split('?')[0]).toBe('/deep');
});
// @relation(GSSC-MLLR-95, scope=range_end, role=Test)
