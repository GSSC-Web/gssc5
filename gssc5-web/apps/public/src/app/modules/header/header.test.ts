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
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { Header } from './header';

const sampleOrg = {
  organizationName: 'Genealogical Society of Stanislaus County',
  organizationAcronym: 'GSSC',
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
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<Header>>>;
  router: Router;
  session: MemberSession;
  membersApp: MembersApp;
  contact: ContactOverlay;
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

  const fixture = await setupPublicComponent(Header, {
    providers: [{ provide: KvStore, useClass: FakeKvStore }],
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

  if (options?.loggedIn) {
    session.setSession('test-token', options.displayName ?? 'Ada');
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
    membersApp,
    contact,
    societyContact,
    root: nativeElement(fixture),
    header,
  };
}

// @relation(GSSC-PLLR-46, scope=range_start, role=Test)
test('GSSC-PLLR-46 Semantic', async () => {
  const { root } = await setupHeader();
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
  expect(textContent(root, '.gssc-header__org-name--full')).toBe(sampleOrg.organizationName);
  expect(textContent(root, '.gssc-header__org-name--short')).toBe(sampleOrg.organizationAcronym);
  expect(root.querySelector('.gssc-header__login')).not.toBeNull();
  expect(root.querySelector('.gssc-header__contact')).not.toBeNull();
  expect(root.querySelector('.gssc-header__search-toggle')).not.toBeNull();
});
// @relation(GSSC-PLLR-46, scope=range_end, role=Test)

// @relation(GSSC-PLLR-47, scope=range_start, role=Test)
test('GSSC-PLLR-47 Syntactic', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  expect(bar.classList.contains('flex')).toBe(true);
  expect(bar.classList.contains('flex-wrap')).toBe(true);
  expect(bar.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-47, scope=range_end, role=Test)

// @relation(GSSC-PLLR-48, scope=range_start, role=Test)
test('GSSC-PLLR-48 Lexical', async () => {
  const { root } = await setupHeader();
  const bar = root.querySelector<HTMLElement>('.gssc-header')!;
  expect(bar.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(bar.classList.contains('border-gssc-gray')).toBe(true);
  expect(bar.classList.contains('border-b-4')).toBe(true);
  expect(bar.classList.contains('text-gssc-dark-green')).toBe(true);
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
  const { root } = await setupHeader();
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.firstElementChild?.classList.contains('gssc-header__logo')).toBe(true);
  expect(root.querySelector('.gssc-header__logo')).not.toBeNull();
});
// @relation(GSSC-PLLR-50, scope=range_end, role=Test)

// @relation(GSSC-PLLR-51, scope=range_start, role=Test)
test('GSSC-PLLR-51 Lexical', async () => {
  const { root } = await setupHeader();
  const logo = root.querySelector<HTMLElement>('.gssc-header__logo')!;
  expect(logo.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-51, scope=range_end, role=Test)

// @relation(GSSC-PLLR-52, scope=range_start, role=Test)
test('GSSC-PLLR-52 Semantic', async () => {
  const { root, societyContact } = await setupHeader();
  const full = root.querySelector<HTMLElement>('.gssc-header__org-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-header__org-name--short')!;
  expect(full.textContent?.trim()).toBe(societyContact.organizationName());
  expect(short.textContent?.trim()).toBe(societyContact.organizationAcronym());
  // One form is shown at a time (Lexical); both values come from Society Contact.
  expect(societyContact.organizationName().length).toBeGreaterThan(0);
  expect(societyContact.organizationAcronym().length).toBeGreaterThan(0);
});
// @relation(GSSC-PLLR-52, scope=range_end, role=Test)

// @relation(GSSC-PLLR-53, scope=range_start, role=Test)
test('GSSC-PLLR-53 Syntactic', async () => {
  const { root } = await setupHeader();
  const identity = root.querySelector('.gssc-header__identity')!;
  expect(identity.children[0]?.classList.contains('gssc-header__logo')).toBe(true);
  expect(identity.children[1]?.classList.contains('gssc-header__org-name')).toBe(true);
  // Below small both forms stay hidden (omit); Lexical covers breakpoint reveals.
  const full = root.querySelector<HTMLElement>('.gssc-header__org-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-header__org-name--short')!;
  expect(full.classList.contains('hidden')).toBe(true);
  expect(short.classList.contains('hidden')).toBe(true);
});
// @relation(GSSC-PLLR-53, scope=range_end, role=Test)

// @relation(GSSC-PLLR-54, scope=range_start, role=Test)
test('GSSC-PLLR-54 Lexical', async () => {
  const { root } = await setupHeader();
  const name = root.querySelector<HTMLElement>('.gssc-header__org-name')!;
  const full = root.querySelector<HTMLElement>('.gssc-header__org-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-header__org-name--short')!;
  expect(name.classList.contains('font-medium')).toBe(true);
  expect(name.classList.contains('text-gssc-dark-green')).toBe(true);
  // Medium+: full name; small–under medium: acronym; below small: omit (SW: Tailwind md/sm).
  expect(full.classList.contains('hidden')).toBe(true);
  expect(full.classList.contains('md:inline')).toBe(true);
  expect(short.classList.contains('hidden')).toBe(true);
  expect(short.classList.contains('sm:inline')).toBe(true);
  expect(short.classList.contains('md:hidden')).toBe(true);
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

  session.setSession('test-token', 'Ada');
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
  const { fixture, root, session } = await setupHeader({ loggedIn: true, displayName: 'Ada' });
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
  const { root } = await setupHeader();
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
  const { fixture, root } = await setupHeader();
  const actions = [...root.querySelector('.gssc-header__actions')!.children];
  expect(actions.at(-1)?.classList.contains('gssc-header__search')).toBe(true);
  const toggle = root.querySelector<HTMLElement>('.gssc-header__search-toggle')!;
  expect(toggle.classList.contains('size-6')).toBe(true);
  expect(toggle.classList.contains('shrink-0')).toBe(true);
  expect(root.querySelector('.gssc-header__search-icon--open.nf.nf-fa-search')).not.toBeNull();

  toggle.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-header__search-icon--close.nf.nf-md-close')).not.toBeNull();
});
// @relation(GSSC-PLLR-71, scope=range_end, role=Test)

// @relation(GSSC-PLLR-72, scope=range_start, role=Test)
test('GSSC-PLLR-72 Lexical', async () => {
  const { fixture, root } = await setupHeader();
  const toggle = root.querySelector<HTMLElement>('.gssc-header__search-toggle')!;
  expect(toggle.classList.contains('text-gssc-dark-green')).toBe(true);

  toggle.click();
  fixture.detectChanges();
  await fixture.whenStable();
  const panel = root.querySelector<HTMLElement>('.gssc-header__search-panel')!;
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-72, scope=range_end, role=Test)
