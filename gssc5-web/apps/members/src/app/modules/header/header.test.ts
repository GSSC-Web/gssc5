import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { KvStore } from '../../services/kv-store/kv-store';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import {
  DEFAULT_PUBLIC_APP_ORIGIN,
  PublicApp,
} from '../../services/public-app';
import {
  BRANDING_FAVICON_KEY,
  BRANDING_LOGO_KEY,
} from '../../services/branding-assets/branding-assets';
import {
  SOCIETY_ORGANIZATION_ACRONYM_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import {
  SITE_SEARCH_GET,
  type SiteSearchResult,
} from '../../services/site-search/site-search';
import {
  SITE_TREE_GET,
  SiteTree,
  type NestedSiteTreePayload,
  type SiteTreeNavNode,
} from '../../services/site-tree/site-tree';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { Header } from './header';

/** Advance the header quick-search RxJS debounce (200ms) under fake timers. */
async function flushQuickSearchDebounce(
  input: HTMLInputElement,
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  value: string,
): Promise<void> {
  vi.useFakeTimers();
  try {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(200);
  } finally {
    vi.useRealTimers();
  }
  fixture.detectChanges();
  await fixture.whenStable();
}


const sampleQuickResults: SiteSearchResult[] = [
  {
    title: 'Directory',
    snippet: 'Browse members',
    href: '/directory',
    kind: 'site-tree',
  },
];

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

const sampleBrandingLogoUrl = 'http://localhost:3000/branding/gssc-society-logo.png';

class FakeKvStore {
  private readonly values = new Map<string, string | null>([
    [SOCIETY_ORGANIZATION_NAME_KEY, sampleOrg.organizationName],
    [SOCIETY_ORGANIZATION_ACRONYM_KEY, sampleOrg.organizationAcronym],
    [BRANDING_FAVICON_KEY, 'branding/favicon.ico'],
    [BRANDING_LOGO_KEY, 'branding/gssc-society-logo.png'],
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
  searchResults?: SiteSearchResult[] | null;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<Header>>>;
  router: Router;
  session: MemberSession;
  publicApp: PublicApp;
  societyContact: SocietyContact;
  root: HTMLElement;
  header: Header;
  searchCalls: { q: string; limit?: number }[];
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
    globalThis.localStorage?.removeItem('gssc-color-mode');
  } catch {
    // ignore
  }
  globalThis.document?.documentElement.classList.remove('dark');

  stubChallengeLoggedOut();
  const tree = options?.tree === undefined ? sampleTree : options.tree;
  const searchCalls: { q: string; limit?: number }[] = [];
  const searchResults =
    options?.searchResults === undefined
      ? sampleQuickResults
      : options.searchResults;

  const fixture = await setupMembersComponent(Header, {
    providers: [
      { provide: KvStore, useClass: FakeKvStore },
      { provide: SITE_TREE_GET, useValue: async () => tree },
      {
        provide: SITE_SEARCH_GET,
        useValue: async (query: { q: string; limit?: number }) => {
          searchCalls.push({ q: query.q, limit: query.limit });
          return searchResults;
        },
      },
    ],
  });
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const session = TestBed.inject(MemberSession);
  const publicApp = TestBed.inject(PublicApp);
  const societyContact = TestBed.inject(SocietyContact);
  const siteTree = TestBed.inject(SiteTree);
  const header = fixture.componentInstance;

  publicApp.lastNavigation = null;
  publicApp.assignLocation = false;

  await societyContact.refresh();
  await fixture.whenStable();
  session.ready.set(true);
  // Nav structure tests use the full sample tree; permission filtering is
  // covered in site-tree / site-tree-permissions unit tests (GSSC5-127).
  session.isAdmin.set(true);

  if (options?.loggedIn) {
    session.setSession(options.displayName ?? 'Ada');
  } else {
    session.loggedIn.set(false);
    session.displayName.set('');
  }

  await siteTree.refresh();
  header.setChromeTierForTest(options?.chromeTier ?? 'wide');
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    router,
    session,
    publicApp,
    societyContact,
    root: nativeElement(fixture),
    header,
    searchCalls,
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
  expect(root.querySelector('.gssc-header__theme-toggle')).not.toBeNull();
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
  const mark = root.querySelector<HTMLImageElement>('.gssc-header__logo-mark')!;
  expect(mark.tagName).toBe('IMG');
  expect(mark.getAttribute('src')).toBe(sampleBrandingLogoUrl);
  expect(mark.classList.contains('size-10')).toBe(true);
  expect(mark.classList.contains('object-contain')).toBe(true);
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
  const { fixture, root, session } = await setupHeader({
    loggedIn: true,
    displayName: 'Ada',
  });
  const greeting = root.querySelector('.gssc-header__greeting')!;
  const menu = root.querySelector<HTMLElement>('.gssc-header__greeting-menu')!;
  expect(root.querySelector('.gssc-header__account .gssc-header__greeting')).not.toBeNull();
  expect(greeting).not.toBeNull();
  expect(menu.querySelector('.gssc-header__public-access')).not.toBeNull();
  expect(menu.querySelector('.gssc-header__logout')).not.toBeNull();
  expect(menu.classList.contains('group-hover:visible')).toBe(true);
  expect(menu.classList.contains('group-hover:flex')).toBe(true);
  expect(root.querySelector('.gssc-header__login')).toBeNull();

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
  expect(root.querySelector('.gssc-header__greeting-menu .gssc-header__logout')).not.toBeNull();

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

// @relation(GSSC-MLLR-33, scope=range_start, role=Test)
test('GSSC-MLLR-33 Semantic', async () => {
  const { root, publicApp } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  root.querySelector<HTMLButtonElement>('.gssc-header__public-access')!.click();
  expect(publicApp.lastNavigation).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
});
// @relation(GSSC-MLLR-33, scope=range_end, role=Test)

// @relation(GSSC-MLLR-34, scope=range_start, role=Test)
test('GSSC-MLLR-34 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__greeting-menu .gssc-header__public-access')).not.toBeNull();
  expect(root.querySelector('.gssc-header__login')).toBeNull();

  session.loggedIn.set(false);
  session.displayName.set('');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__public-access')).toBeNull();
});
// @relation(GSSC-MLLR-34, scope=range_end, role=Test)

// @relation(GSSC-MLLR-35, scope=range_start, role=Test)
test('GSSC-MLLR-35 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true });
  const control = root.querySelector<HTMLElement>('.gssc-header__public-access')!;
  expect(control.classList.contains('font-sans')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-35, scope=range_end, role=Test)

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
  expect(nav.classList.contains('bg-gssc-white')).toBe(true);
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
  const wideNav = root.querySelector<HTMLElement>('.gssc-header__nav--wide')!;
  expect(wideNav.classList.contains('grid')).toBe(true);
  const topItems = [
    ...wideNav.querySelectorAll<HTMLElement>(':scope > .gssc-header__nav-item'),
  ];
  expect(topItems.length).toBeGreaterThan(0);
  expect(wideNav.querySelectorAll('.gssc-header__nav-divider').length).toBe(
    Math.max(0, topItems.length - 1),
  );
  const topLinks = [
    ...wideNav.querySelectorAll<HTMLElement>(
      ':scope > .gssc-header__nav-item .gssc-header__nav-link',
    ),
  ];
  expect(topLinks.length).toBeGreaterThan(0);
  expect(topLinks.every((link) => link.classList.contains('whitespace-nowrap'))).toBe(true);
  expect(wideNav.style.gridTemplateColumns).toContain('minmax(0, 1fr)');
  expect(wideNav.style.gridTemplateColumns).toContain('auto');

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
  expect(link.classList.contains('hover:text-gssc-dark-brown')).toBe(true);
  expect(link.classList.contains('group-hover:text-gssc-dark-brown')).toBe(true);
  expect(link.classList.contains('group-focus-within:text-gssc-dark-brown')).toBe(true);
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
  const publications = [...root.querySelectorAll('.gssc-header__nav-item')].find((item) =>
    item.querySelector('.gssc-header__nav-link')?.textContent?.includes('Publications'),
  )!;
  const cluster = publications.querySelector<HTMLElement>('.gssc-header__nav-cluster')!;
  const submenu = cluster.querySelector<HTMLElement>(':scope > .gssc-header__submenu')!;
  expect(submenu.classList.contains('absolute')).toBe(true);
  expect(submenu.classList.contains('group-hover:visible')).toBe(true);

  cluster.getBoundingClientRect = () =>
    ({
      x: 120,
      y: 40,
      left: 120,
      top: 40,
      right: 220,
      bottom: 64,
      width: 100,
      height: 24,
      toJSON: () => ({}),
    }) as DOMRect;
  Object.defineProperty(submenu, 'offsetWidth', { configurable: true, value: 176 });
  Object.defineProperty(submenu, 'scrollWidth', { configurable: true, value: 176 });
  cluster.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(submenu.classList.contains('start-0')).toBe(true);
  expect(submenu.classList.contains('end-0')).toBe(false);

  cluster.getBoundingClientRect = () =>
    ({
      x: window.innerWidth - 80,
      y: 40,
      left: window.innerWidth - 80,
      top: 40,
      right: window.innerWidth - 10,
      bottom: 64,
      width: 70,
      height: 24,
      toJSON: () => ({}),
    }) as DOMRect;
  cluster.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(submenu.classList.contains('end-0')).toBe(true);
  expect(submenu.classList.contains('start-0')).toBe(false);

  const nestedParent = [...publications.querySelectorAll('.gssc-header__submenu-item')].find(
    (item) => item.querySelector('.gssc-header__submenu--nested'),
  )!;
  const nested = nestedParent.querySelector<HTMLElement>('.gssc-header__submenu--nested')!;
  nestedParent.getBoundingClientRect = () =>
    ({
      x: window.innerWidth - 200,
      y: 80,
      left: window.innerWidth - 200,
      top: 80,
      right: window.innerWidth - 40,
      bottom: 112,
      width: 160,
      height: 32,
      toJSON: () => ({}),
    }) as DOMRect;
  Object.defineProperty(nested, 'offsetWidth', { configurable: true, value: 176 });
  Object.defineProperty(nested, 'scrollWidth', { configurable: true, value: 176 });
  nestedParent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(nested.classList.contains('end-full')).toBe(true);
  expect(nested.classList.contains('start-full')).toBe(false);

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
  const orgName = root.querySelector<HTMLElement>(
    '.gssc-header__identity .gssc-header__org-name',
  )!;
  expect(orgName).not.toBeNull();
  expect(orgName.classList.contains('whitespace-nowrap')).toBe(true);

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
  // Closed: search glyph must be present (styles.css .nf-fa-search) so the
  // dark-green icon stays visible including on hover:bg-gssc-gray.
  expect(
    root.querySelector('.gssc-header__search-icon--open.nf.nf-fa-search'),
  ).not.toBeNull();

  toggle.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(
    root.querySelector('.gssc-header__search-icon--close.nf.nf-md-close'),
  ).not.toBeNull();
  const panel = root.querySelector<HTMLElement>('.gssc-header__search-panel')!;
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-461, scope=range_end, role=Test)

// @relation(GSSC-MLLR-462, scope=range_start, role=Test)
test('GSSC-MLLR-462 Semantic', async () => {
  const { fixture, root, header, router, searchCalls } = await setupHeader({
    loggedIn: true,
  });
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  await flushQuickSearchDebounce(input, fixture, 'dir');

  expect(searchCalls.at(-1)).toEqual({ q: 'dir', limit: 5 });
  expect(textContent(root, '.gssc-header__search-result-title')).toBe('Directory');

  root.querySelector<HTMLButtonElement>('.gssc-header__search-result-button')!.click();
  await fixture.whenStable();
  expect(header.searchOpen()).toBe(false);
  expect(router.url.split('?')[0]).toBe('/directory');

  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const reopen = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  reopen.value = 'account';
  reopen.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  root.querySelector<HTMLFormElement>('.gssc-header__search-form')!.requestSubmit();
  await fixture.whenStable();
  expect(header.searchOpen()).toBe(false);
  expect(router.url).toContain('/search');
  expect(router.url).toContain('q=account');
});
// @relation(GSSC-MLLR-462, scope=range_end, role=Test)

// @relation(GSSC-MLLR-463, scope=range_start, role=Test)
test('GSSC-MLLR-463 Syntactic', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const panel = root.querySelector('.gssc-header__search-panel')!;
  expect(panel.classList.contains('absolute')).toBe(true);
  const query = panel.querySelector('.gssc-header__search-query')!;
  const results = panel.querySelector('.gssc-header__search-results');
  expect(query).not.toBeNull();
  // Results appear only after a query; query field stays first in the form.
  expect(
    panel
      .querySelector('.gssc-header__search-form')!
      .firstElementChild?.classList.contains('gssc-header__search-query'),
  ).toBe(true);
  expect(results === null || query.compareDocumentPosition(results!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-463, scope=range_end, role=Test)

// @relation(GSSC-MLLR-464, scope=range_start, role=Test)
test('GSSC-MLLR-464 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const panel = root.querySelector<HTMLElement>('.gssc-header__search-panel')!;
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
  expect(panel.classList.contains('font-sans')).toBe(true);
  expect(panel.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-MLLR-464, scope=range_end, role=Test)

// @relation(GSSC-MLLR-465, scope=range_start, role=Test)
test('GSSC-MLLR-465 Semantic', async () => {
  const { fixture, root, searchCalls } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  await flushQuickSearchDebounce(input, fixture, 'news');
  expect(searchCalls.some((call) => call.q === 'news')).toBe(true);
});
// @relation(GSSC-MLLR-465, scope=range_end, role=Test)

// @relation(GSSC-MLLR-466, scope=range_start, role=Test)
test('GSSC-MLLR-466 Syntactic', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLElement>('.gssc-header__search-query')!;
  expect(input.classList.contains('w-full')).toBe(true);
  expect(input.getAttribute('type')).toBe('search');
});
// @relation(GSSC-MLLR-466, scope=range_end, role=Test)

// @relation(GSSC-MLLR-467, scope=range_start, role=Test)
test('GSSC-MLLR-467 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLElement>('.gssc-header__search-query')!;
  expect(input.classList.contains('font-sans')).toBe(true);
  expect(input.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(input.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-467, scope=range_end, role=Test)

// @relation(GSSC-MLLR-468, scope=range_start, role=Test)
test('GSSC-MLLR-468 Semantic', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  await flushQuickSearchDebounce(input, fixture, 'dir');
  expect(textContent(root, '.gssc-header__search-result-title')).toBe('Directory');
  expect(textContent(root, '.gssc-header__search-result-snippet')).toBe(
    'Browse members',
  );
  expect(textContent(root, '.gssc-header__search-result-kind')).toBe('site-tree');
});
// @relation(GSSC-MLLR-468, scope=range_end, role=Test)

// @relation(GSSC-MLLR-469, scope=range_start, role=Test)
test('GSSC-MLLR-469 Syntactic', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  await flushQuickSearchDebounce(input, fixture, 'dir');
  const list = root.querySelector('.gssc-header__search-results')!;
  expect(list.tagName).toBe('UL');
  expect(list.querySelectorAll('.gssc-header__search-result').length).toBe(1);
});
// @relation(GSSC-MLLR-469, scope=range_end, role=Test)

// @relation(GSSC-MLLR-470, scope=range_start, role=Test)
test('GSSC-MLLR-470 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  await flushQuickSearchDebounce(input, fixture, 'dir');
  const title = root.querySelector<HTMLElement>('.gssc-header__search-result-title')!;
  const snippet = root.querySelector<HTMLElement>(
    '.gssc-header__search-result-snippet',
  )!;
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(snippet.classList.contains('text-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-470, scope=range_end, role=Test)

// @relation(GSSC-MLLR-651, scope=range_start, role=Test)
test('GSSC-MLLR-651 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const actions = root.querySelector('.gssc-header__actions')!;
  expect(actions.querySelector('.gssc-header__theme-toggle')).not.toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(
    root.querySelector('.gssc-header__actions .gssc-header__theme-toggle'),
  ).not.toBeNull();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__theme-toggle')).toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(
    root.querySelector(
      '.gssc-header__overlay-utilities .gssc-header__theme-toggle',
    ),
  ).not.toBeNull();
});
// @relation(GSSC-MLLR-651, scope=range_end, role=Test)

// @relation(GSSC-MLLR-652, scope=range_start, role=Test)
test('GSSC-MLLR-652 Lexical', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const toggle = root.querySelector<HTMLButtonElement>('.gssc-header__theme-toggle')!;
  expect(toggle.classList.contains('font-sans')).toBe(true);
  expect(toggle.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
  toggle.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
  expect(header.themeMode.mode()).toBe('dark');
});
// @relation(GSSC-MLLR-652, scope=range_end, role=Test)

function stubNestedSubmenuRect(nested: HTMLElement): void {
  nested.getBoundingClientRect = () =>
    ({
      x: 200,
      y: 100,
      left: 200,
      top: 100,
      right: 360,
      bottom: 220,
      width: 160,
      height: 120,
      toJSON: () => ({}),
    }) as DOMRect;
}

// @relation(GSSC-MLLR-665, scope=range_start, role=Test)
test('GSSC-MLLR-665 Semantic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const nestedParent = [...root.querySelectorAll('.gssc-header__submenu-item')].find((item) =>
    item.querySelector('.gssc-header__submenu--nested'),
  )!;
  stubNestedSubmenuRect(nestedParent.querySelector('.gssc-header__submenu--nested')!);
  nestedParent.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 40, clientY: 80, bubbles: true }),
  );
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.safeTriangleCuid()).not.toBeNull();
  expect(header.safeTrianglePath()).toMatch(/^M /);
  nestedParent.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.safeTrianglePath()).toBeNull();
});
// @relation(GSSC-MLLR-665, scope=range_end, role=Test)

// @relation(GSSC-MLLR-666, scope=range_start, role=Test)
test('GSSC-MLLR-666 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const nestedParent = [...root.querySelectorAll('.gssc-header__submenu-item')].find((item) =>
    item.querySelector('.gssc-header__submenu--nested'),
  )!;
  stubNestedSubmenuRect(nestedParent.querySelector('.gssc-header__submenu--nested')!);
  nestedParent.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 12, clientY: 24, bubbles: true }),
  );
  fixture.detectChanges();
  await fixture.whenStable();
  const path = header.safeTrianglePath()!;
  expect(path.startsWith('M 12 24 L ')).toBe(true);
  expect(path.endsWith(' Z')).toBe(true);
  const svg = root.querySelector('.gssc-header__safe-triangle')!;
  expect(svg.classList.contains('pointer-events-none')).toBe(true);
  const triangle = root.querySelector('.gssc-header__safe-triangle-path')!;
  expect(triangle.classList.contains('pointer-events-auto')).toBe(true);
});
// @relation(GSSC-MLLR-666, scope=range_end, role=Test)

// @relation(GSSC-MLLR-667, scope=range_start, role=Test)
test('GSSC-MLLR-667 Lexical', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const nestedParent = [...root.querySelectorAll('.gssc-header__submenu-item')].find((item) =>
    item.querySelector('.gssc-header__submenu--nested'),
  )!;
  stubNestedSubmenuRect(nestedParent.querySelector('.gssc-header__submenu--nested')!);
  nestedParent.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 8, clientY: 16, bubbles: true }),
  );
  fixture.detectChanges();
  await fixture.whenStable();
  const triangle = root.querySelector<SVGPathElement>('.gssc-header__safe-triangle-path')!;
  expect(triangle.classList.contains('fill-transparent')).toBe(true);
  expect(triangle.getAttribute('stroke')).toBeNull();
  expect(triangle.textContent?.trim() ?? '').toBe('');
  expect(header.safeTrianglePath()).not.toBeNull();
});
// @relation(GSSC-MLLR-667, scope=range_end, role=Test)
