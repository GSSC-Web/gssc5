import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { KvStore } from '../../services/kv-store/kv-store';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import {
  SOCIETY_ORGANIZATION_ACRONYM_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import {
  SITE_TREE_GET,
  type NestedSiteTreePayload,
  type SiteTreeNavNode,
} from '../../services/site-tree/site-tree';
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

const sampleOrg = {
  organizationName: 'Genealogical Society of Stanislaus County',
  organizationAcronym: 'GSSC',
};

function navNode(
  cuid: string,
  label: string,
  path: string,
  children: SiteTreeNavNode[] = [],
): SiteTreeNavNode {
  return { cuid, label, path, children };
}

const sampleTree: NestedSiteTreePayload = {
  frontend: 'members',
  root: navNode('root', 'Dashboard', '/', [
    navNode('directory', 'Directory', '/directory'),
    navNode('account', 'Account', '/account'),
    navNode('publications', 'Publications', '/publications', [
      navNode('catalog', 'Catalog', '/publications/catalog', [
        navNode('section', 'Section', '/publications/catalog/section', [
          navNode('too-deep', 'Too Deep', '/publications/catalog/deep'),
        ]),
      ]),
      navNode('tools', 'Tools', '/publications/tools'),
    ]),
    navNode('newsletters', 'Newsletters', '/newsletters'),
  ]),
};

class FakeKvStore {
  private readonly values = new Map<string, string | null>([
    [SOCIETY_ORGANIZATION_NAME_KEY, sampleOrg.organizationName],
    [SOCIETY_ORGANIZATION_ACRONYM_KEY, sampleOrg.organizationAcronym],
  ]);

  async getValue(key: string): Promise<string | null> {
    return this.values.has(key) ? (this.values.get(key) ?? null) : null;
  }
}

async function setupHeader(options?: {
  loggedIn?: boolean;
  displayName?: string;
  chromeTier?: 'wide' | 'mid' | 'narrow';
  tree?: NestedSiteTreePayload | null;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<Header>>>;
  router: Router;
  session: MemberSession;
  societyContact: SocietyContact;
  root: HTMLElement;
  header: Header;
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  stubChallengeLoggedOut();
  const tree = options?.tree === undefined ? sampleTree : options.tree;

  const fixture = await setupMembersComponent(Header, {
    providers: [
      { provide: KvStore, useClass: FakeKvStore },
      { provide: SITE_TREE_GET, useValue: async () => tree },
    ],
  });
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const session = TestBed.inject(MemberSession);
  const societyContact = TestBed.inject(SocietyContact);
  const header = fixture.componentInstance;

  await societyContact.refresh();
  await fixture.whenStable();
  session.ready.set(true);

  if (options?.loggedIn) {
    session.setSession(options.displayName ?? 'Ada');
  } else {
    session.loggedIn.set(false);
    session.displayName.set('');
  }

  header.setChromeTierForTest(options?.chromeTier ?? 'wide');
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    router,
    session,
    societyContact,
    root: nativeElement(fixture),
    header,
  };
}

// @relation(GSSC-MLLR-14, scope=range_start, role=Test)
test('GSSC-MLLR-14 Semantic', async () => {
  const { fixture, root, session } = await setupHeader({
    loggedIn: false,
    chromeTier: 'wide',
  });
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(sampleOrg.organizationName);
  expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__search-toggle')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav--wide')).not.toBeNull();
  expect(root.querySelector('.gssc-header__donate')).toBeNull();
  expect(root.querySelector('.gssc-header__greeting')).toBeNull();
  expect(root.querySelector('.gssc-header__logout')).toBeNull();

  session.setSession('Ada');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__greeting')).not.toBeNull();
  expect(root.querySelector('.gssc-header__logout')).not.toBeNull();
  expect(root.querySelector('.gssc-header__login')).toBeNull();
});
// @relation(GSSC-MLLR-14, scope=range_end, role=Test)

// @relation(GSSC-MLLR-15, scope=range_start, role=Test)
test('GSSC-MLLR-15 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const chrome = root.querySelector<HTMLElement>('.gssc-header')!;
  expect(chrome.classList.contains('w-full')).toBe(true);
  expect(chrome.getAttribute('data-chrome-tier')).toBe('wide');
  expect(root.querySelector('.gssc-header__nav--wide')).not.toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(chrome.getAttribute('data-chrome-tier')).toBe('mid');
  expect(root.querySelector('.gssc-header__menu-toggle')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav--wide')).toBeNull();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(chrome.getAttribute('data-chrome-tier')).toBe('narrow');
  expect(root.querySelector('.gssc-header__bar--narrow')).not.toBeNull();
});
// @relation(GSSC-MLLR-15, scope=range_end, role=Test)

// @relation(GSSC-MLLR-16, scope=range_start, role=Test)
test('GSSC-MLLR-16 Lexical', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header__bar')!;
  expect(bar.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(bar.classList.contains('border-gssc-gray')).toBe(true);
  expect(bar.classList.contains('border-b-4')).toBe(true);
  expect(root.querySelector<HTMLElement>('.gssc-header')!.classList.contains('text-gssc-dark-green')).toBe(
    true,
  );
});
// @relation(GSSC-MLLR-16, scope=range_end, role=Test)

// @relation(GSSC-MLLR-17, scope=range_start, role=Test)
test('GSSC-MLLR-17 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({ loggedIn: true });
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-header__logo')!;
  expect(logo.querySelector('.gssc-header__logo-mark')).not.toBeNull();
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  await router.navigateByUrl('/login');
  fixture.detectChanges();
  await fixture.whenStable();
  logo.click();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/');
});
// @relation(GSSC-MLLR-17, scope=range_end, role=Test)

// @relation(GSSC-MLLR-18, scope=range_start, role=Test)
test('GSSC-MLLR-18 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.querySelector('.gssc-header__logo')).not.toBeNull();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.querySelector('.gssc-header__identity .gssc-header__logo')).not.toBeNull();
  expect(narrowBar.querySelector('.gssc-header__identity')!.classList.contains('justify-center')).toBe(
    true,
  );
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
  const { fixture, root, router } = await setupHeader({
    loggedIn: true,
    chromeTier: 'wide',
  });
  const labels = [...root.querySelectorAll('.gssc-header__nav--wide .gssc-header__nav-link')].map(
    (el) => el.textContent?.trim(),
  );
  expect(labels[0]).toBe('Dashboard');
  expect(labels).toContain('Directory');
  expect(labels).toContain('Account');

  const dashboard = root.querySelector<HTMLAnchorElement>(
    '.gssc-header__nav--wide .gssc-header__nav-link',
  )!;
  dashboard.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/');
});
// @relation(GSSC-MLLR-20, scope=range_end, role=Test)

// @relation(GSSC-MLLR-21, scope=range_start, role=Test)
test('GSSC-MLLR-21 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(root.querySelector('.gssc-header__nav--wide')).not.toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__nav--wide')).toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__menu-overlay')).not.toBeNull();
});
// @relation(GSSC-MLLR-21, scope=range_end, role=Test)

// @relation(GSSC-MLLR-22, scope=range_start, role=Test)
test('GSSC-MLLR-22 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
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
    const { fixture, root, session, router } = await setupHeader({
      loggedIn: true,
      displayName: 'Ada',
    });
    expect(session.loggedIn()).toBe(true);
    root.querySelector<HTMLButtonElement>('.gssc-header__logout')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(session.loggedIn()).toBe(false);
    expect(root.querySelector('.gssc-header__logout')).toBeNull();
    expect(root.querySelector('.gssc-header__login')).not.toBeNull();
    expect(router.url).toBe('/login');
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

// @relation(GSSC-MLLR-441, scope=range_start, role=Test)
test('GSSC-MLLR-441 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({
    loggedIn: true,
    chromeTier: 'wide',
  });
  const labels = [...root.querySelectorAll('.gssc-header__nav--wide .gssc-header__nav-link')].map(
    (el) => el.textContent?.trim(),
  );
  expect(labels[0]).toBe('Dashboard');
  expect(labels).toContain('Directory');
  expect(labels).toContain('Publications');

  const home = root.querySelector<HTMLAnchorElement>(
    '.gssc-header__nav--wide .gssc-header__nav-link',
  )!;
  home.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/');
});
// @relation(GSSC-MLLR-441, scope=range_end, role=Test)

// @relation(GSSC-MLLR-442, scope=range_start, role=Test)
test('GSSC-MLLR-442 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const nav = root.querySelector<HTMLElement>('.gssc-header__nav--wide')!;
  expect(nav.classList.contains('absolute')).toBe(false);
  expect(root.querySelector('.gssc-header__menu-overlay')).toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const overlay = root.querySelector<HTMLElement>('.gssc-header__menu-overlay')!;
  expect(overlay.classList.contains('absolute')).toBe(true);
  expect(overlay.classList.contains('top-full')).toBe(true);
  expect(overlay.classList.contains('z-20')).toBe(true);
});
// @relation(GSSC-MLLR-442, scope=range_end, role=Test)

// @relation(GSSC-MLLR-443, scope=range_start, role=Test)
test('GSSC-MLLR-443 Lexical', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const nav = root.querySelector<HTMLElement>('.gssc-header__nav--wide')!;
  expect(nav.classList.contains('bg-gssc-cream')).toBe(true);
  expect(nav.classList.contains('text-gssc-dark-green')).toBe(true);

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const overlay = root.querySelector<HTMLElement>('.gssc-header__menu-overlay')!;
  expect(overlay.classList.contains('bg-gssc-white')).toBe(true);
  expect(overlay.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-443, scope=range_end, role=Test)

// @relation(GSSC-MLLR-444, scope=range_start, role=Test)
test('GSSC-MLLR-444 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({
    loggedIn: true,
    chromeTier: 'wide',
  });
  const directory = [...root.querySelectorAll('.gssc-header__nav-link')].find(
    (el) => el.textContent?.trim() === 'Directory',
  ) as HTMLAnchorElement;
  expect(directory).toBeTruthy();
  directory.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url.split('?')[0]).toBe('/directory');
});
// @relation(GSSC-MLLR-444, scope=range_end, role=Test)

// @relation(GSSC-MLLR-445, scope=range_start, role=Test)
test('GSSC-MLLR-445 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const wideNav = root.querySelector('.gssc-header__nav--wide')!;
  expect(wideNav.classList.contains('flex-nowrap')).toBe(true);
  expect(wideNav.querySelectorAll('.gssc-header__nav-divider').length).toBeGreaterThan(0);

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__overlay-list')).not.toBeNull();
});
// @relation(GSSC-MLLR-445, scope=range_end, role=Test)

// @relation(GSSC-MLLR-446, scope=range_start, role=Test)
test('GSSC-MLLR-446 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const link = root.querySelector<HTMLElement>('.gssc-header__nav-link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-446, scope=range_end, role=Test)

// @relation(GSSC-MLLR-447, scope=range_start, role=Test)
test('GSSC-MLLR-447 Semantic', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const publications = [...root.querySelectorAll('.gssc-header__nav-item')].find((item) =>
    item.querySelector('.gssc-header__nav-link')?.textContent?.includes('Publications'),
  )!;
  const childLabels = [...publications.querySelectorAll('.gssc-header__submenu-link')].map((el) =>
    el.textContent?.trim(),
  );
  expect(childLabels).toContain('Catalog');
  expect(childLabels).toContain('Tools');
  expect(childLabels).toContain('Section');
  expect(childLabels).not.toContain('Too Deep');
});
// @relation(GSSC-MLLR-447, scope=range_end, role=Test)

// @relation(GSSC-MLLR-448, scope=range_start, role=Test)
test('GSSC-MLLR-448 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const submenu = root.querySelector<HTMLElement>('.gssc-header__submenu')!;
  expect(submenu.classList.contains('absolute')).toBe(true);
  expect(submenu.classList.contains('group-hover:visible')).toBe(true);

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const publicationsRow = [...root.querySelectorAll('.gssc-header__overlay-item')].find((item) =>
    item.textContent?.includes('Publications'),
  )!;
  publicationsRow.querySelector<HTMLButtonElement>('.gssc-header__expander')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(publicationsRow.querySelector('.gssc-header__submenu')).not.toBeNull();
});
// @relation(GSSC-MLLR-448, scope=range_end, role=Test)

// @relation(GSSC-MLLR-449, scope=range_start, role=Test)
test('GSSC-MLLR-449 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const submenu = root.querySelector<HTMLElement>('.gssc-header__submenu')!;
  expect(submenu.classList.contains('bg-gssc-white')).toBe(true);
  expect(submenu.classList.contains('border-gssc-gray')).toBe(true);
  const link = submenu.querySelector<HTMLElement>('.gssc-header__submenu-link')!;
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-449, scope=range_end, role=Test)

// @relation(GSSC-MLLR-450, scope=range_start, role=Test)
test('GSSC-MLLR-450 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(root.querySelector('.gssc-header__menu-toggle')).toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.menuOpen()).toBe(false);
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.menuOpen()).toBe(true);
  expect(root.querySelector('.gssc-header__menu-overlay')).not.toBeNull();
});
// @relation(GSSC-MLLR-450, scope=range_end, role=Test)

// @relation(GSSC-MLLR-451, scope=range_start, role=Test)
test('GSSC-MLLR-451 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'mid' });
  const actions = [...root.querySelector('.gssc-header__actions')!.children];
  expect(actions.at(-1)?.classList.contains('gssc-header__menu-toggle')).toBe(true);

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.lastElementChild?.querySelector('.gssc-header__menu-toggle')).not.toBeNull();
});
// @relation(GSSC-MLLR-451, scope=range_end, role=Test)

// @relation(GSSC-MLLR-452, scope=range_start, role=Test)
test('GSSC-MLLR-452 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'mid' });
  const toggle = root.querySelector<HTMLElement>('.gssc-header__menu-toggle')!;
  expect(toggle.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(toggle.classList.contains('rounded')).toBe(true);
  expect(toggle.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-452, scope=range_end, role=Test)

// @relation(GSSC-MLLR-453, scope=range_start, role=Test)
test('GSSC-MLLR-453 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'mid' });
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const publicationsRow = [...root.querySelectorAll('.gssc-header__overlay-item')].find((item) =>
    item.textContent?.includes('Publications'),
  )!;
  expect(publicationsRow.querySelector('.gssc-header__submenu')).toBeNull();
  publicationsRow.querySelector<HTMLButtonElement>('.gssc-header__expander')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.isExpanded('publications')).toBe(true);
  expect(publicationsRow.querySelector('.gssc-header__submenu')).not.toBeNull();
});
// @relation(GSSC-MLLR-453, scope=range_end, role=Test)

// @relation(GSSC-MLLR-454, scope=range_start, role=Test)
test('GSSC-MLLR-454 Syntactic', async () => {
  const { fixture, root } = await setupHeader({ chromeTier: 'mid' });
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const publicationsRow = [...root.querySelectorAll('.gssc-header__overlay-item')].find((item) =>
    item.textContent?.includes('Publications'),
  )!;
  const expander = publicationsRow.querySelector<HTMLButtonElement>('.gssc-header__expander')!;
  expect(expander.getAttribute('aria-expanded')).toBe('false');
  expect(expander.textContent?.trim()).toBe('+');
  expander.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(expander.getAttribute('aria-expanded')).toBe('true');
  expect(expander.textContent?.trim()).toBe('−');
});
// @relation(GSSC-MLLR-454, scope=range_end, role=Test)

// @relation(GSSC-MLLR-455, scope=range_start, role=Test)
test('GSSC-MLLR-455 Lexical', async () => {
  const { fixture, root } = await setupHeader({ chromeTier: 'mid' });
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const expander = root.querySelector<HTMLElement>('.gssc-header__expander')!;
  expect(expander.classList.contains('font-sans')).toBe(true);
  expect(expander.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-455, scope=range_end, role=Test)

// @relation(GSSC-MLLR-456, scope=range_start, role=Test)
test('GSSC-MLLR-456 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(sampleOrg.organizationName);

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(textContent(root, '.gssc-header__org-name--short')).toBe(sampleOrg.organizationAcronym);
});
// @relation(GSSC-MLLR-456, scope=range_end, role=Test)

// @relation(GSSC-MLLR-457, scope=range_start, role=Test)
test('GSSC-MLLR-457 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(root.querySelector('.gssc-header__identity .gssc-header__org-name')).not.toBeNull();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__org-name')).toBeNull();
});
// @relation(GSSC-MLLR-457, scope=range_end, role=Test)

// @relation(GSSC-MLLR-458, scope=range_start, role=Test)
test('GSSC-MLLR-458 Lexical', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const full = root.querySelector<HTMLElement>('.gssc-header__org-name')!;
  expect(full.classList.contains('font-medium')).toBe(true);
  expect(full.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(sampleOrg.organizationName);

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(textContent(root, '.gssc-header__org-name--short')).toBe(sampleOrg.organizationAcronym);

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__org-name')).toBeNull();
});
// @relation(GSSC-MLLR-458, scope=range_end, role=Test)

// @relation(GSSC-MLLR-459, scope=range_start, role=Test)
test('GSSC-MLLR-459 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(header.searchOpen()).toBe(false);
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.searchOpen()).toBe(true);
  expect(root.querySelector('.gssc-header__search-panel')).not.toBeNull();
});
// @relation(GSSC-MLLR-459, scope=range_end, role=Test)

// @relation(GSSC-MLLR-460, scope=range_start, role=Test)
test('GSSC-MLLR-460 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  expect(root.querySelector('.gssc-header__actions .gssc-header__search')).not.toBeNull();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.firstElementChild?.classList.contains('gssc-header__search')).toBe(true);
});
// @relation(GSSC-MLLR-460, scope=range_end, role=Test)

// @relation(GSSC-MLLR-461, scope=range_start, role=Test)
test('GSSC-MLLR-461 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  const toggle = root.querySelector<HTMLElement>('.gssc-header__search-toggle')!;
  expect(toggle.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(toggle.classList.contains('rounded')).toBe(true);
  expect(toggle.classList.contains('hover:bg-gssc-gray')).toBe(true);

  toggle.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const panel = root.querySelector<HTMLElement>('.gssc-header__search-panel')!;
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-461, scope=range_end, role=Test)
