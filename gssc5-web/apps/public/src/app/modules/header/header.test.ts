import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MemberSession } from '../../services/member-session';
import { DEFAULT_MEMBERS_APP_ORIGIN, MembersApp } from '../../services/members-app';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { Header } from './header';

async function setupHeader(options?: {
  loggedIn?: boolean;
  widthPx?: number;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<Header>>>;
  router: Router;
  session: MemberSession;
  membersApp: MembersApp;
  contact: ContactOverlay;
  root: HTMLElement;
  header: Header;
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
  } catch {
    // ignore
  }

  const fixture = await setupPublicComponent(Header);
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const session = TestBed.inject(MemberSession);
  const membersApp = TestBed.inject(MembersApp);
  const contact = TestBed.inject(ContactOverlay);
  const header = fixture.componentInstance;

  membersApp.lastNavigation = null;
  membersApp.assignLocation = false;
  /* shared ContactOverlay uses openCount */

  if (options?.loggedIn) session.setToken('test-token');
  else session.loggedIn.set(false);

  if (options?.widthPx !== undefined) header.layoutWidthPx.set(options.widthPx);

  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, session, membersApp, contact, root: nativeElement(fixture), header };
}

// @relation(GSSC-PLLR-46, scope=range_start, role=Test)
test('GSSC-PLLR-46 Semantic', async () => {
  const { root } = await setupHeader({ widthPx: 48 * 16 });
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(textContent(root, '.gssc-header__org-name')).toContain(
    'Genealogical Society of Stanislaus County',
  );
  expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__contact')).not.toBeNull();
  expect(root.querySelector('.gssc-header__search')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav')).not.toBeNull();
});
// @relation(GSSC-PLLR-46, scope=range_end, role=Test)

// @relation(GSSC-PLLR-47, scope=range_start, role=Test)
test('GSSC-PLLR-47 Syntactic', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  const style = getComputedStyle(bar);
  expect(style.display).toBe('flex');
  expect(style.flexWrap).toBe('wrap');
  expect(style.width).toBe('100%');
});
// @relation(GSSC-PLLR-47, scope=range_end, role=Test)

// @relation(GSSC-PLLR-48, scope=range_start, role=Test)
test('GSSC-PLLR-48 Lexical', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  const style = getComputedStyle(bar);
  expect(style.backgroundColor).toBe('var(--gssc-light-green)');
  expect(style.borderBottomColor).toBe('var(--gssc-gray)');
  expect(style.color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-48, scope=range_end, role=Test)

// @relation(GSSC-PLLR-49, scope=range_start, role=Test)
test('GSSC-PLLR-49 Semantic', async () => {
  const { root } = await setupHeader();
  const logo = root.querySelector<HTMLElement>('.gssc-header__logo')!;
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  expect(logo.querySelector('.gssc-header__logo-mark')).not.toBeNull();
});
// @relation(GSSC-PLLR-49, scope=range_end, role=Test)

// @relation(GSSC-PLLR-50, scope=range_start, role=Test)
test('GSSC-PLLR-50 Syntactic', async () => {
  const { root } = await setupHeader({ widthPx: 20 * 16 });
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.firstElementChild?.classList.contains('gssc-header__logo')).toBe(true);
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
});
// @relation(GSSC-PLLR-50, scope=range_end, role=Test)

// @relation(GSSC-PLLR-51, scope=range_start, role=Test)
test('GSSC-PLLR-51 Lexical', async () => {
  const { root } = await setupHeader();
  const logo = root.querySelector<HTMLElement>('.gssc-header__logo')!;
  expect(getComputedStyle(logo).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-51, scope=range_end, role=Test)

// @relation(GSSC-PLLR-52, scope=range_start, role=Test)
test('GSSC-PLLR-52 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ widthPx: 48 * 16 });
  expect(textContent(root, '.gssc-header__org-name')).toBe(
    'Genealogical Society of Stanislaus County',
  );

  header.layoutWidthPx.set(30 * 16);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(textContent(root, '.gssc-header__org-name')).toBe('GSSC');
});
// @relation(GSSC-PLLR-52, scope=range_end, role=Test)

// @relation(GSSC-PLLR-53, scope=range_start, role=Test)
test('GSSC-PLLR-53 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ widthPx: 48 * 16 });
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(identity.querySelector('.gssc-header__org-name')).not.toBeNull();

  header.layoutWidthPx.set(20 * 16);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__org-name')).toBeNull();
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
});
// @relation(GSSC-PLLR-53, scope=range_end, role=Test)

// @relation(GSSC-PLLR-54, scope=range_start, role=Test)
test('GSSC-PLLR-54 Lexical', async () => {
  const { root } = await setupHeader({ widthPx: 48 * 16 });
  const name = root.querySelector<HTMLElement>('.gssc-header__org-name')!;
  const style = getComputedStyle(name);
  expect(style.fontFamily).toBe('var(--font-sans)');
  expect(style.fontWeight).toBe('500');
  expect(style.color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-54, scope=range_end, role=Test)

// @relation(GSSC-PLLR-55, scope=range_start, role=Test)
test('GSSC-PLLR-55 Semantic', async () => {
  const { root, membersApp } = await setupHeader({ loggedIn: false });
  root.querySelector<HTMLButtonElement>('.gssc-header__login')!.click();
  expect(membersApp.lastNavigation).toBe(DEFAULT_MEMBERS_APP_ORIGIN);
});
// @relation(GSSC-PLLR-55, scope=range_end, role=Test)

// @relation(GSSC-PLLR-56, scope=range_start, role=Test)
test('GSSC-PLLR-56 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: false });
  expect(root.querySelector('.gssc-header__account .gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__member-access')).toBeNull();

  session.setToken('test-token');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__login')).toBeNull();
});
// @relation(GSSC-PLLR-56, scope=range_end, role=Test)

// @relation(GSSC-PLLR-57, scope=range_start, role=Test)
test('GSSC-PLLR-57 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: false });
  const login = root.querySelector<HTMLElement>('.gssc-header__login')!;
  expect(getComputedStyle(login).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(login).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-57, scope=range_end, role=Test)

// @relation(GSSC-PLLR-58, scope=range_start, role=Test)
test('GSSC-PLLR-58 Semantic', async () => {
  const { root, membersApp } = await setupHeader({ loggedIn: true });
  root.querySelector<HTMLButtonElement>('.gssc-header__member-access')!.click();
  expect(membersApp.lastNavigation).toBe(DEFAULT_MEMBERS_APP_ORIGIN);
});
// @relation(GSSC-PLLR-58, scope=range_end, role=Test)

// @relation(GSSC-PLLR-59, scope=range_start, role=Test)
test('GSSC-PLLR-59 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__account .gssc-header__member-access')).not.toBeNull();
  expect(root.querySelector('.gssc-header__login')).toBeNull();

  session.loggedIn.set(false);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__member-access')).toBeNull();
});
// @relation(GSSC-PLLR-59, scope=range_end, role=Test)

// @relation(GSSC-PLLR-60, scope=range_start, role=Test)
test('GSSC-PLLR-60 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const control = root.querySelector<HTMLElement>('.gssc-header__member-access')!;
  expect(getComputedStyle(control).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(control).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-60, scope=range_end, role=Test)

// @relation(GSSC-PLLR-61, scope=range_start, role=Test)
test('GSSC-PLLR-61 Semantic', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  expect(textContent(root, '.gssc-header__greeting')).toBe('Welcome');
});
// @relation(GSSC-PLLR-61, scope=range_end, role=Test)

// @relation(GSSC-PLLR-62, scope=range_start, role=Test)
test('GSSC-PLLR-62 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__account .gssc-header__greeting')).not.toBeNull();

  session.loggedIn.set(false);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__greeting')).toBeNull();
});
// @relation(GSSC-PLLR-62, scope=range_end, role=Test)

// @relation(GSSC-PLLR-63, scope=range_start, role=Test)
test('GSSC-PLLR-63 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const greeting = root.querySelector<HTMLElement>('.gssc-header__greeting')!;
  expect(getComputedStyle(greeting).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(greeting).color).toBe('var(--gssc-dark-brown)');
});
// @relation(GSSC-PLLR-63, scope=range_end, role=Test)

// @relation(GSSC-PLLR-64, scope=range_start, role=Test)
test('GSSC-PLLR-64 Semantic', async () => {
  const { fixture, root, router, session } = await setupHeader({ loggedIn: true });
  await router.navigateByUrl('/membership');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/membership');

  root.querySelector<HTMLButtonElement>('.gssc-header__logout')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  expect(session.loggedIn()).toBe(false);
  expect(router.url).toBe('/membership');
});
// @relation(GSSC-PLLR-64, scope=range_end, role=Test)

// @relation(GSSC-PLLR-65, scope=range_start, role=Test)
test('GSSC-PLLR-65 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__account .gssc-header__logout')).not.toBeNull();

  session.loggedIn.set(false);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__logout')).toBeNull();
});
// @relation(GSSC-PLLR-65, scope=range_end, role=Test)

// @relation(GSSC-PLLR-66, scope=range_start, role=Test)
test('GSSC-PLLR-66 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const logout = root.querySelector<HTMLElement>('.gssc-header__logout')!;
  expect(getComputedStyle(logout).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(logout).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-66, scope=range_end, role=Test)

// @relation(GSSC-PLLR-67, scope=range_start, role=Test)
test('GSSC-PLLR-67 Semantic', async () => {
  const { root, contact } = await setupHeader();
  expect(contact.openCount()).toBe(0);
  root.querySelector<HTMLButtonElement>('.gssc-header__contact')!.click();
  expect(contact.openCount()).toBe(1);
});
// @relation(GSSC-PLLR-67, scope=range_end, role=Test)

// @relation(GSSC-PLLR-68, scope=range_start, role=Test)
test('GSSC-PLLR-68 Syntactic', async () => {
  const { root } = await setupHeader();
  expect(root.querySelector('.gssc-header__actions .gssc-header__contact')).not.toBeNull();
});
// @relation(GSSC-PLLR-68, scope=range_end, role=Test)

// @relation(GSSC-PLLR-69, scope=range_start, role=Test)
test('GSSC-PLLR-69 Lexical', async () => {
  const { root } = await setupHeader();
  const contact = root.querySelector<HTMLElement>('.gssc-header__contact')!;
  expect(getComputedStyle(contact).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(contact).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-69, scope=range_end, role=Test)

// @relation(GSSC-PLLR-70, scope=range_start, role=Test)
test('GSSC-PLLR-70 Semantic', async () => {
  const { fixture, root, header } = await setupHeader();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-input')!;
  input.value = 'stanislaus';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.searchQuery()).toBe('stanislaus');
});
// @relation(GSSC-PLLR-70, scope=range_end, role=Test)

// @relation(GSSC-PLLR-71, scope=range_start, role=Test)
test('GSSC-PLLR-71 Syntactic', async () => {
  const { root } = await setupHeader();
  expect(root.querySelector('.gssc-header__actions .gssc-header__search')).not.toBeNull();
});
// @relation(GSSC-PLLR-71, scope=range_end, role=Test)

// @relation(GSSC-PLLR-72, scope=range_start, role=Test)
test('GSSC-PLLR-72 Lexical', async () => {
  const { root } = await setupHeader();
  const input = root.querySelector<HTMLElement>('.gssc-header__search-input')!;
  const style = getComputedStyle(input);
  expect(style.fontFamily).toBe('var(--font-sans)');
  expect(style.backgroundColor).toBe('var(--gssc-white)');
  expect(style.borderBottomColor).toBe('var(--gssc-gray)');
  expect(style.color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-72, scope=range_end, role=Test)

// @relation(GSSC-PLLR-73, scope=range_start, role=Test)
test('GSSC-PLLR-73 Semantic', async () => {
  const { fixture, root, router } = await setupHeader();
  const paths = [
    ['/', 'a.gssc-header__nav-link[href="/"]'],
    ['/membership', 'a.gssc-header__nav-link[href="/membership"]'],
    ['/leadership', 'a.gssc-header__nav-link[href="/leadership"]'],
    ['/calendar', 'a.gssc-header__nav-link[href="/calendar"]'],
    ['/publications', 'a.gssc-header__nav-link[href="/publications"]'],
    ['/publications/cemetery', 'a.gssc-header__nav-link[href="/publications/cemetery"]'],
    ['/publications/war-veterans', 'a.gssc-header__nav-link[href="/publications/war-veterans"]'],
    ['/research-tools', 'a.gssc-header__nav-link[href="/research-tools"]'],
    ['/newsletters', 'a.gssc-header__nav-link[href="/newsletters"]'],
  ] as const;

  for (const [path, selector] of paths) {
    const link = root.querySelector<HTMLAnchorElement>(selector);
    expect(link).not.toBeNull();
    link!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toBe(path);
  }

  const publicationsGroup = root.querySelector('.gssc-header__nav-group')!;
  expect(
    publicationsGroup.querySelector('a.gssc-header__nav-link[href="/publications"]'),
  ).not.toBeNull();
  expect(
    publicationsGroup.querySelector('.gssc-header__nav-children a[href="/publications/cemetery"]'),
  ).not.toBeNull();
  expect(
    publicationsGroup.querySelector(
      '.gssc-header__nav-children a[href="/publications/war-veterans"]',
    ),
  ).not.toBeNull();
});
// @relation(GSSC-PLLR-73, scope=range_end, role=Test)

// @relation(GSSC-PLLR-74, scope=range_start, role=Test)
test('GSSC-PLLR-74 Syntactic', async () => {
  const { root } = await setupHeader();
  const nav = root.querySelector<HTMLElement>('.gssc-header__nav')!;
  expect(getComputedStyle(nav).display).toBe('flex');
  expect(getComputedStyle(nav).flexWrap).toBe('wrap');
  expect(root.querySelector('.gssc-header__nav-group .gssc-header__nav-children')).not.toBeNull();
});
// @relation(GSSC-PLLR-74, scope=range_end, role=Test)

// @relation(GSSC-PLLR-75, scope=range_start, role=Test)
test('GSSC-PLLR-75 Lexical', async () => {
  const { root } = await setupHeader();
  const link = root.querySelector<HTMLElement>('.gssc-header__nav-link')!;
  expect(getComputedStyle(link).fontFamily).toBe('var(--font-sans)');
  expect(getComputedStyle(link).color).toBe('var(--gssc-dark-green)');
});
// @relation(GSSC-PLLR-75, scope=range_end, role=Test)
