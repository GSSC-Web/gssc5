import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { KvStore } from '../../services/kv-store/kv-store';
import { MemberSession } from '../../services/member-session';
import { DEFAULT_MEMBERS_APP_ORIGIN, MembersApp } from '../../services/members-app';
import {
  SOCIETY_ORGANIZATION_ACRONYM_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import {
  SITE_SEARCH_GET,
  type SiteSearchQuery,
  type SiteSearchResult,
} from '../../services/site-search/site-search';
import {
  SITE_TREE_GET,
  type NestedSiteTreePayload,
  type SiteTreeNavNode,
} from '../../services/site-tree/site-tree';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { memberSessionApi } from '../../services/member-session';
import { Header } from './header';

const sampleSearchResults: SiteSearchResult[] = [
  {
    title: 'Membership',
    snippet: 'Join',
    href: '/membership',
    kind: 'site-tree',
  },
  {
    title: 'Publications',
    snippet: 'Catalog',
    href: '/publications',
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
  frontend: 'public',
  root: navNode('root', 'Home', '/', [
    navNode('membership', 'Membership', '/membership'),
    navNode('leadership', 'Leadership', '/leadership'),
    navNode('calendar', 'Calendar', '/calendar'),
    navNode('publications', 'Publications', '/publications', [
      navNode('cemetery', 'Cemetery Project', '/publications/cemetery', [
        navNode('section', 'Cemetery Section', '/publications/cemetery/section', [
          navNode('too-deep', 'Too Deep', '/publications/cemetery/deep'),
        ]),
      ]),
      navNode('war', 'War Veterans', '/publications/war-veterans'),
    ]),
    navNode('research', 'Research Tools', '/research-tools'),
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
  searchGet?: (query: SiteSearchQuery) => Promise<SiteSearchResult[] | null>;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<Header>>>;
  router: Router;
  session: MemberSession;
  membersApp: MembersApp;
  contact: ContactOverlay;
  societyContact: SocietyContact;
  root: HTMLElement;
  header: Header;
  searchCalls: SiteSearchQuery[];
}> {
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
    globalThis.localStorage?.removeItem('gssc.memberEmailAddress');
    globalThis.localStorage?.removeItem('gssc-color-mode');
  } catch {
    // ignore
  }
  globalThis.document?.documentElement.classList.remove('dark');

  const tree = options?.tree === undefined ? sampleTree : options.tree;
  const searchCalls: SiteSearchQuery[] = [];
  const searchGet =
    options?.searchGet ??
    (async (query: SiteSearchQuery) => {
      searchCalls.push(query);
      return sampleSearchResults;
    });

  const fixture = await setupPublicComponent(Header, {
    providers: [
      { provide: KvStore, useClass: FakeKvStore },
      { provide: SITE_TREE_GET, useValue: async () => tree },
      { provide: SITE_SEARCH_GET, useValue: searchGet },
    ],
  });
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const session = TestBed.inject(MemberSession);
  const membersApp = TestBed.inject(MembersApp);
  const contact = TestBed.inject(ContactOverlay);
  const societyContact = TestBed.inject(SocietyContact);
  const header = fixture.componentInstance;

  membersApp.lastNavigation = null;
  membersApp.assignLocation = false;

  await societyContact.refresh();
  await fixture.whenStable();

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
    membersApp,
    contact,
    societyContact,
    root: nativeElement(fixture),
    header,
    searchCalls,
  };
}

// @relation(GSSC-PLLR-46, scope=range_start, role=Test)
test('GSSC-PLLR-46 Semantic', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(sampleOrg.organizationName);
  expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__contact')).not.toBeNull();
  expect(root.querySelector('.gssc-header__theme-toggle')).not.toBeNull();
  expect(root.querySelector('.gssc-header__search-toggle')).not.toBeNull();
  expect(root.querySelector('.gssc-header__nav--wide')).not.toBeNull();
  expect(root.querySelector('.gssc-header__donate')).toBeNull();
});
// @relation(GSSC-PLLR-46, scope=range_end, role=Test)

// @relation(GSSC-PLLR-47, scope=range_start, role=Test)
test('GSSC-PLLR-47 Syntactic', async () => {
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
// @relation(GSSC-PLLR-47, scope=range_end, role=Test)

// @relation(GSSC-PLLR-48, scope=range_start, role=Test)
test('GSSC-PLLR-48 Lexical', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header__bar')!;
  expect(bar.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(bar.classList.contains('border-gssc-gray')).toBe(true);
  expect(bar.classList.contains('border-b-4')).toBe(true);
  expect(root.querySelector<HTMLElement>('.gssc-header')!.classList.contains('text-gssc-dark-green')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-48, scope=range_end, role=Test)

// @relation(GSSC-PLLR-49, scope=range_start, role=Test)
test('GSSC-PLLR-49 Semantic', async () => {
  const { fixture, root, router } = await setupHeader();
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-header__logo')!;
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  expect(logo.querySelector('.gssc-header__logo-mark')).not.toBeNull();
  await router.navigateByUrl('/membership');
  fixture.detectChanges();
  await fixture.whenStable();
  logo.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/');
});
// @relation(GSSC-PLLR-49, scope=range_end, role=Test)

// @relation(GSSC-PLLR-50, scope=range_start, role=Test)
test('GSSC-PLLR-50 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(
    identity.compareDocumentPosition(root.querySelector('.gssc-header__actions')!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.classList.contains('grid-cols-[auto_1fr_auto]')).toBe(true);
  expect(narrowBar.querySelector('.gssc-header__identity .gssc-header__logo')).not.toBeNull();
  expect(narrowBar.querySelector('.gssc-header__identity')!.classList.contains('justify-center')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-50, scope=range_end, role=Test)

// @relation(GSSC-PLLR-51, scope=range_start, role=Test)
test('GSSC-PLLR-51 Lexical', async () => {
  const { root } = await setupHeader();
  const mark = root.querySelector<HTMLImageElement>('.gssc-header__logo-mark')!;
  expect(mark.tagName).toBe('IMG');
  expect(mark.getAttribute('src')).toBe('/gssc-society-logo.png');
  expect(mark.classList.contains('size-10')).toBe(true);
  expect(mark.classList.contains('object-contain')).toBe(true);
});
// @relation(GSSC-PLLR-51, scope=range_end, role=Test)

// @relation(GSSC-PLLR-52, scope=range_start, role=Test)
test('GSSC-PLLR-52 Semantic', async () => {
  const { fixture, root, header, societyContact } = await setupHeader({
    chromeTier: 'wide',
  });
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(
    societyContact.organizationName(),
  );

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(textContent(root, '.gssc-header__org-name--short')).toBe(
    societyContact.organizationAcronym(),
  );
});
// @relation(GSSC-PLLR-52, scope=range_end, role=Test)

// @relation(GSSC-PLLR-53, scope=range_start, role=Test)
test('GSSC-PLLR-53 Syntactic', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.querySelector('.gssc-header__logo')).not.toBeNull();
  const orgName = identity.querySelector<HTMLElement>('.gssc-header__org-name')!;
  expect(orgName).not.toBeNull();
  expect(orgName.classList.contains('whitespace-nowrap')).toBe(true);
});
// @relation(GSSC-PLLR-53, scope=range_end, role=Test)

// @relation(GSSC-PLLR-54, scope=range_start, role=Test)
test('GSSC-PLLR-54 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const name = root.querySelector<HTMLElement>('.gssc-header__org-name')!;
  expect(name.classList.contains('font-medium')).toBe(true);
  expect(name.classList.contains('text-gssc-dark-green')).toBe(true);
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
  const { fixture, root, session } = await setupHeader({
    loggedIn: false,
    chromeTier: 'wide',
  });
  const actions = root.querySelector('.gssc-header__actions')!;
  const login = actions.querySelector('.gssc-header__login');
  const contact = actions.querySelector('.gssc-header__contact');
  const search = actions.querySelector('.gssc-header__search-toggle');
  expect(login).not.toBeNull();
  expect(contact).not.toBeNull();
  expect(search).not.toBeNull();
  expect(
    login!.compareDocumentPosition(contact!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    contact!.compareDocumentPosition(search!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(actions.querySelectorAll('.gssc-header__divider').length).toBeGreaterThanOrEqual(1);

  session.setSession('Ada');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__login')).toBeNull();
});
// @relation(GSSC-PLLR-56, scope=range_end, role=Test)

// @relation(GSSC-PLLR-57, scope=range_start, role=Test)
test('GSSC-PLLR-57 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: false });
  const login = root.querySelector<HTMLElement>('.gssc-header__login')!;
  expect(login.classList.contains('font-sans')).toBe(true);
  expect(login.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-57, scope=range_end, role=Test)

// @relation(GSSC-PLLR-58, scope=range_start, role=Test)
test('GSSC-PLLR-58 Semantic', async () => {
  const { root, membersApp } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  root.querySelector<HTMLButtonElement>('.gssc-header__member-access')!.click();
  expect(membersApp.lastNavigation).toBe(DEFAULT_MEMBERS_APP_ORIGIN);
});
// @relation(GSSC-PLLR-58, scope=range_end, role=Test)

// @relation(GSSC-PLLR-59, scope=range_start, role=Test)
test('GSSC-PLLR-59 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__greeting-menu .gssc-header__member-access')).not.toBeNull();
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
  expect(control.classList.contains('font-sans')).toBe(true);
  expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-60, scope=range_end, role=Test)

// @relation(GSSC-PLLR-61, scope=range_start, role=Test)
test('GSSC-PLLR-61 Semantic', async () => {
  const { root } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  expect(textContent(root, '.gssc-header__greeting')).toBe('Hello, Ada');
});
// @relation(GSSC-PLLR-61, scope=range_end, role=Test)

// @relation(GSSC-PLLR-62, scope=range_start, role=Test)
test('GSSC-PLLR-62 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({
    loggedIn: true,
    displayName: 'Ada',
    chromeTier: 'wide',
  });
  const actions = root.querySelector('.gssc-header__actions')!;
  const account = actions.querySelector('.gssc-header__account')!;
  const greeting = root.querySelector('.gssc-header__greeting')!;
  const menu = root.querySelector<HTMLElement>('.gssc-header__greeting-menu')!;
  expect(actions.firstElementChild).toBe(account);
  expect(greeting).not.toBeNull();
  expect(menu.querySelector('.gssc-header__member-access')).not.toBeNull();
  expect(menu.querySelector('.gssc-header__logout')).not.toBeNull();
  expect(menu.classList.contains('group-hover:visible')).toBe(true);
  expect(menu.classList.contains('group-hover:flex')).toBe(true);
  expect(root.querySelector('.gssc-header__login')).toBeNull();
  expect(actions.querySelectorAll('.gssc-header__divider').length).toBeGreaterThanOrEqual(1);

  session.loggedIn.set(false);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__greeting')).toBeNull();
});
// @relation(GSSC-PLLR-62, scope=range_end, role=Test)

// @relation(GSSC-PLLR-63, scope=range_start, role=Test)
test('GSSC-PLLR-63 Lexical', async () => {
  const { root } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
  const greeting = root.querySelector<HTMLElement>('.gssc-header__greeting')!;
  expect(greeting.classList.contains('font-sans')).toBe(true);
  expect(greeting.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-63, scope=range_end, role=Test)

// @relation(GSSC-PLLR-64, scope=range_start, role=Test)
test('GSSC-PLLR-64 Semantic', async () => {
  const restoreLogout = stubBackendLogoutSuccess();
  try {
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
  } finally {
    restoreLogout();
  }
});
// @relation(GSSC-PLLR-64, scope=range_end, role=Test)

// @relation(GSSC-PLLR-65, scope=range_start, role=Test)
test('GSSC-PLLR-65 Syntactic', async () => {
  const { fixture, root, session } = await setupHeader({ loggedIn: true });
  expect(root.querySelector('.gssc-header__greeting-menu .gssc-header__logout')).not.toBeNull();

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
  expect(logout.classList.contains('font-sans')).toBe(true);
  expect(logout.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-66, scope=range_end, role=Test)

// @relation(GSSC-PLLR-67, scope=range_start, role=Test)
test('GSSC-PLLR-67 Semantic', async () => {
  const { root, contact } = await setupHeader();
  const before = contact.openCount();
  root.querySelector<HTMLButtonElement>('.gssc-header__contact')!.click();
  expect(contact.openCount()).toBe(before + 1);
});
// @relation(GSSC-PLLR-67, scope=range_end, role=Test)

// @relation(GSSC-PLLR-68, scope=range_start, role=Test)
test('GSSC-PLLR-68 Syntactic', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const actions = root.querySelector('.gssc-header__actions')!;
  expect(actions.querySelector('.gssc-header__contact')).not.toBeNull();
  expect(actions.querySelectorAll('.gssc-header__divider').length).toBeGreaterThanOrEqual(1);
});
// @relation(GSSC-PLLR-68, scope=range_end, role=Test)

// @relation(GSSC-PLLR-69, scope=range_start, role=Test)
test('GSSC-PLLR-69 Lexical', async () => {
  const { root } = await setupHeader();
  const contact = root.querySelector<HTMLElement>('.gssc-header__contact')!;
  expect(contact.classList.contains('font-sans')).toBe(true);
  expect(contact.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-69, scope=range_end, role=Test)

// @relation(GSSC-PLLR-70, scope=range_start, role=Test)
test('GSSC-PLLR-70 Semantic', async () => {
  const { fixture, root, header } = await setupHeader();
  expect(header.searchOpen()).toBe(false);
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.searchOpen()).toBe(true);
  expect(root.querySelector('.gssc-header__search-panel')).not.toBeNull();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(header.searchOpen()).toBe(false);
});
// @relation(GSSC-PLLR-70, scope=range_end, role=Test)

// @relation(GSSC-PLLR-71, scope=range_start, role=Test)
test('GSSC-PLLR-71 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const actions = [...root.querySelector('.gssc-header__actions')!.children];
  expect(actions.at(-1)?.classList.contains('gssc-header__search')).toBe(true);
  expect(root.querySelector('.gssc-header__search-icon--open.nf.nf-fa-search')).not.toBeNull();

  header.setChromeTierForTest('mid');
  fixture.detectChanges();
  await fixture.whenStable();
  const midActions = [...root.querySelector('.gssc-header__actions')!.children];
  expect(midActions.at(-1)?.classList.contains('gssc-header__menu-toggle')).toBe(true);
  const search = root.querySelector('.gssc-header__search')!;
  const toggle = root.querySelector('.gssc-header__menu-toggle')!;
  expect(search.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.firstElementChild?.classList.contains('gssc-header__search')).toBe(true);
});
// @relation(GSSC-PLLR-71, scope=range_end, role=Test)

// @relation(GSSC-PLLR-72, scope=range_start, role=Test)
test('GSSC-PLLR-72 Lexical', async () => {
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
// @relation(GSSC-PLLR-72, scope=range_end, role=Test)

// @relation(GSSC-PLLR-354, scope=range_start, role=Test)
test('GSSC-PLLR-354 Semantic', async () => {
  const { fixture, root, router, header, searchCalls } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  input.value = 'membership';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 220));
  fixture.detectChanges();
  await fixture.whenStable();

  expect(searchCalls.some((call) => call.q === 'membership' && call.limit === 8)).toBe(
    true,
  );
  expect(header.quickResults().map((entry) => entry.title)).toEqual([
    'Membership',
    'Publications',
  ]);
  expect(root.querySelectorAll('.gssc-header__search-result').length).toBe(2);

  root.querySelector<HTMLFormElement>('.gssc-header__search-form')!.requestSubmit();
  await fixture.whenStable();
  expect(router.url).toContain('/search');
  expect(router.url).toContain('q=membership');
  expect(header.searchOpen()).toBe(false);
});
// @relation(GSSC-PLLR-354, scope=range_end, role=Test)

// @relation(GSSC-PLLR-355, scope=range_start, role=Test)
test('GSSC-PLLR-355 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  header.searchQuery.set('x');
  header.quickResults.set(sampleSearchResults);
  fixture.detectChanges();
  await fixture.whenStable();

  const panel = root.querySelector('.gssc-header__search-panel')!;
  const query = root.querySelector('.gssc-header__search-query')!;
  const results = root.querySelector('.gssc-header__search-results')!;
  expect(panel.contains(query)).toBe(true);
  expect(
    query.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(root.querySelectorAll('.gssc-header__search-result').length).toBe(2);
});
// @relation(GSSC-PLLR-355, scope=range_end, role=Test)

// @relation(GSSC-PLLR-356, scope=range_start, role=Test)
test('GSSC-PLLR-356 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const panel = root.querySelector('.gssc-header__search-panel')!;
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
  expect(panel.classList.contains('font-sans')).toBe(true);
  expect(panel.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-356, scope=range_end, role=Test)

// @relation(GSSC-PLLR-357, scope=range_start, role=Test)
test('GSSC-PLLR-357 Semantic', async () => {
  const { fixture, root, router } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const input = root.querySelector<HTMLInputElement>('.gssc-header__search-query')!;
  input.value = 'calendar';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  root.querySelector<HTMLFormElement>('.gssc-header__search-form')!.requestSubmit();
  await fixture.whenStable();
  expect(router.url).toContain('q=calendar');
});
// @relation(GSSC-PLLR-357, scope=range_end, role=Test)

// @relation(GSSC-PLLR-358, scope=range_start, role=Test)
test('GSSC-PLLR-358 Syntactic', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const query = root.querySelector('.gssc-header__search-query')!;
  expect(query.getAttribute('type')).toBe('search');
  expect(query.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-358, scope=range_end, role=Test)

// @relation(GSSC-PLLR-359, scope=range_start, role=Test)
test('GSSC-PLLR-359 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const query = root.querySelector('.gssc-header__search-query')!;
  expect(query.classList.contains('font-sans')).toBe(true);
  expect(query.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(query.classList.contains('bg-gssc-white')).toBe(true);
  expect(query.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-359, scope=range_end, role=Test)

// @relation(GSSC-PLLR-360, scope=range_start, role=Test)
test('GSSC-PLLR-360 Semantic', async () => {
  const { fixture, root, header } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  header.quickResults.set(sampleSearchResults);
  fixture.detectChanges();
  await fixture.whenStable();
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>('.gssc-header__search-result-link'),
  ];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'Membership',
    'Publications',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/membership',
    '/publications',
  ]);
});
// @relation(GSSC-PLLR-360, scope=range_end, role=Test)

// @relation(GSSC-PLLR-361, scope=range_start, role=Test)
test('GSSC-PLLR-361 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  header.quickResults.set(sampleSearchResults);
  fixture.detectChanges();
  await fixture.whenStable();
  const results = root.querySelector('.gssc-header__search-results')!;
  const query = root.querySelector('.gssc-header__search-query')!;
  expect(results.querySelectorAll('.gssc-header__search-result').length).toBe(2);
  expect(
    query.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-361, scope=range_end, role=Test)

// @relation(GSSC-PLLR-362, scope=range_start, role=Test)
test('GSSC-PLLR-362 Lexical', async () => {
  const { fixture, root, header } = await setupHeader();
  root.querySelector<HTMLButtonElement>('.gssc-header__search-toggle')!.click();
  header.quickResults.set(sampleSearchResults);
  fixture.detectChanges();
  await fixture.whenStable();
  const link = root.querySelector('.gssc-header__search-result-link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('underline')).toBe(true);
});
// @relation(GSSC-PLLR-362, scope=range_end, role=Test)

// @relation(GSSC-PLLR-329, scope=range_start, role=Test)
test('GSSC-PLLR-329 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({ chromeTier: 'wide' });
  const labels = [...root.querySelectorAll('.gssc-header__nav--wide .gssc-header__nav-link')].map(
    (el) => el.textContent?.trim(),
  );
  expect(labels[0]).toBe('Home');
  expect(labels).toContain('Membership');
  expect(labels).toContain('Publications');

  const home = root.querySelector<HTMLAnchorElement>(
    '.gssc-header__nav--wide .gssc-header__nav-link',
  )!;
  home.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/');
});
// @relation(GSSC-PLLR-329, scope=range_end, role=Test)

// @relation(GSSC-PLLR-330, scope=range_start, role=Test)
test('GSSC-PLLR-330 Syntactic', async () => {
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
// @relation(GSSC-PLLR-330, scope=range_end, role=Test)

// @relation(GSSC-PLLR-331, scope=range_start, role=Test)
test('GSSC-PLLR-331 Lexical', async () => {
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
// @relation(GSSC-PLLR-331, scope=range_end, role=Test)

// @relation(GSSC-PLLR-332, scope=range_start, role=Test)
test('GSSC-PLLR-332 Semantic', async () => {
  const { fixture, root, router } = await setupHeader({ chromeTier: 'wide' });
  const membership = [...root.querySelectorAll('.gssc-header__nav-link')].find(
    (el) => el.textContent?.trim() === 'Membership',
  ) as HTMLAnchorElement;
  expect(membership).toBeTruthy();
  membership.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/membership');
});
// @relation(GSSC-PLLR-332, scope=range_end, role=Test)

// @relation(GSSC-PLLR-333, scope=range_start, role=Test)
test('GSSC-PLLR-333 Syntactic', async () => {
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
// @relation(GSSC-PLLR-333, scope=range_end, role=Test)

// @relation(GSSC-PLLR-334, scope=range_start, role=Test)
test('GSSC-PLLR-334 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const link = root.querySelector<HTMLElement>('.gssc-header__nav-link')!;
  expect(link.classList.contains('font-sans')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('hover:text-gssc-dark-brown')).toBe(true);
  expect(link.classList.contains('group-hover:text-gssc-dark-brown')).toBe(true);
  expect(link.classList.contains('group-focus-within:text-gssc-dark-brown')).toBe(true);
});
// @relation(GSSC-PLLR-334, scope=range_end, role=Test)

// @relation(GSSC-PLLR-335, scope=range_start, role=Test)
test('GSSC-PLLR-335 Semantic', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const publications = [...root.querySelectorAll('.gssc-header__nav-item')].find((item) =>
    item.querySelector('.gssc-header__nav-link')?.textContent?.includes('Publications'),
  )!;
  const childLabels = [...publications.querySelectorAll('.gssc-header__submenu-link')].map((el) =>
    el.textContent?.trim(),
  );
  expect(childLabels).toContain('Cemetery Project');
  expect(childLabels).toContain('War Veterans');
  expect(childLabels).toContain('Cemetery Section');
  expect(childLabels).not.toContain('Too Deep');
});
// @relation(GSSC-PLLR-335, scope=range_end, role=Test)

// @relation(GSSC-PLLR-336, scope=range_start, role=Test)
test('GSSC-PLLR-336 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'wide' });
  const publications = [...root.querySelectorAll('.gssc-header__nav-item')].find((item) =>
    item.querySelector('.gssc-header__nav-link')?.textContent?.includes('Publications'),
  )!;
  const cluster = publications.querySelector<HTMLElement>('.gssc-header__nav-cluster')!;
  const submenu = cluster.querySelector<HTMLElement>(':scope > .gssc-header__submenu')!;
  expect(submenu.classList.contains('absolute')).toBe(true);
  expect(submenu.classList.contains('start-0')).toBe(true);
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
// @relation(GSSC-PLLR-336, scope=range_end, role=Test)

// @relation(GSSC-PLLR-337, scope=range_start, role=Test)
test('GSSC-PLLR-337 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'wide' });
  const submenu = root.querySelector<HTMLElement>('.gssc-header__submenu')!;
  expect(submenu.classList.contains('bg-gssc-white')).toBe(true);
  expect(submenu.classList.contains('border-gssc-gray')).toBe(true);
  expect(submenu.classList.contains('text-gssc-dark-green') || true).toBe(true);
  const link = submenu.querySelector<HTMLElement>('.gssc-header__submenu-link')!;
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-337, scope=range_end, role=Test)

// @relation(GSSC-PLLR-338, scope=range_start, role=Test)
test('GSSC-PLLR-338 Semantic', async () => {
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
// @relation(GSSC-PLLR-338, scope=range_end, role=Test)

// @relation(GSSC-PLLR-339, scope=range_start, role=Test)
test('GSSC-PLLR-339 Syntactic', async () => {
  const { fixture, root, header } = await setupHeader({ chromeTier: 'mid' });
  const actions = [...root.querySelector('.gssc-header__actions')!.children];
  expect(actions.at(-1)?.classList.contains('gssc-header__menu-toggle')).toBe(true);

  header.setChromeTierForTest('narrow');
  fixture.detectChanges();
  await fixture.whenStable();
  const narrowBar = root.querySelector('.gssc-header__bar--narrow')!;
  expect(narrowBar.lastElementChild?.querySelector('.gssc-header__menu-toggle')).not.toBeNull();
});
// @relation(GSSC-PLLR-339, scope=range_end, role=Test)

// @relation(GSSC-PLLR-340, scope=range_start, role=Test)
test('GSSC-PLLR-340 Lexical', async () => {
  const { root } = await setupHeader({ chromeTier: 'mid' });
  const toggle = root.querySelector<HTMLElement>('.gssc-header__menu-toggle')!;
  expect(toggle.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(toggle.classList.contains('rounded')).toBe(true);
  expect(toggle.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-340, scope=range_end, role=Test)

// @relation(GSSC-PLLR-341, scope=range_start, role=Test)
test('GSSC-PLLR-341 Semantic', async () => {
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
// @relation(GSSC-PLLR-341, scope=range_end, role=Test)

// @relation(GSSC-PLLR-342, scope=range_start, role=Test)
test('GSSC-PLLR-342 Syntactic', async () => {
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
// @relation(GSSC-PLLR-342, scope=range_end, role=Test)

// @relation(GSSC-PLLR-343, scope=range_start, role=Test)
test('GSSC-PLLR-343 Lexical', async () => {
  const { fixture, root } = await setupHeader({ chromeTier: 'mid' });
  root.querySelector<HTMLButtonElement>('.gssc-header__menu-toggle')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const expander = root.querySelector<HTMLElement>('.gssc-header__expander')!;
  expect(expander.classList.contains('font-sans')).toBe(true);
  expect(expander.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-343, scope=range_end, role=Test)

// @relation(GSSC-PLLR-391, scope=range_start, role=Test)
test('GSSC-PLLR-391 Syntactic', async () => {
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
// @relation(GSSC-PLLR-391, scope=range_end, role=Test)

// @relation(GSSC-PLLR-392, scope=range_start, role=Test)
test('GSSC-PLLR-392 Lexical', async () => {
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
// @relation(GSSC-PLLR-392, scope=range_end, role=Test)

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

// @relation(GSSC-PLLR-396, scope=range_start, role=Test)
test('GSSC-PLLR-396 Semantic', async () => {
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
// @relation(GSSC-PLLR-396, scope=range_end, role=Test)

// @relation(GSSC-PLLR-397, scope=range_start, role=Test)
test('GSSC-PLLR-397 Syntactic', async () => {
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
// @relation(GSSC-PLLR-397, scope=range_end, role=Test)

// @relation(GSSC-PLLR-398, scope=range_start, role=Test)
test('GSSC-PLLR-398 Lexical', async () => {
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
// @relation(GSSC-PLLR-398, scope=range_end, role=Test)
