import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { DEFAULT_MEMBERS_APP_ORIGIN, MembersApp } from '../../services/members-app';
import {
  SOCIETY_EMAIL_KEY,
  SOCIETY_ORGANIZATION_ACRONYM_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SOCIETY_PHONE_KEY,
  SOCIETY_POSTAL_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import { KvStore } from '../../services/kv-store/kv-store';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { Footer } from './footer';

const sampleContact = {
  organizationName: 'Genealogical Society of Stanislaus County',
  organizationAcronym: 'GSSC',
  phoneNumber: '(209) 529-9430',
  emailAddress: 'gsscfounded1968@gmail.com',
  postalAddress: 'P.O. Box 1352 Modesto, CA 95353-1352',
};

class FakeKvStore {
  private readonly values = new Map<string, string>([
    [SOCIETY_ORGANIZATION_NAME_KEY, sampleContact.organizationName],
    [SOCIETY_ORGANIZATION_ACRONYM_KEY, sampleContact.organizationAcronym],
    [SOCIETY_PHONE_KEY, sampleContact.phoneNumber],
    [SOCIETY_EMAIL_KEY, sampleContact.emailAddress],
    [SOCIETY_POSTAL_KEY, sampleContact.postalAddress],
  ]);

  async getValue(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
}

async function setupFooter() {
  const fixture = await setupPublicComponent(Footer, {
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: KvStore, useClass: FakeKvStore },
    ],
  });
  await fixture.whenStable();
  fixture.detectChanges();
  const societyContact = TestBed.inject(SocietyContact);
  const contactOverlay = TestBed.inject(ContactOverlay);
  const membersApp = TestBed.inject(MembersApp);
  const router = TestBed.inject(Router);
  membersApp.assignLocation = false;
  const root = nativeElement(fixture);
  return { fixture, societyContact, contactOverlay, membersApp, router, root };
}

// @relation(GSSC-PLLR-28, scope=range_start, role=Test)
test('GSSC-PLLR-28 Semantic', async () => {
  const { root } = await setupFooter();
  expect(root.querySelector('.gssc-footer__logo')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__organization-name')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__phone')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__email')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__postal')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__contact')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__copyright')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__members')).not.toBeNull();
});
// @relation(GSSC-PLLR-28, scope=range_end, role=Test)

// @relation(GSSC-PLLR-30, scope=range_start, role=Test)
test('GSSC-PLLR-30 Lexical', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer.classList.contains('bg-gssc-black')).toBe(true);
  expect(footer.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-PLLR-30, scope=range_end, role=Test)

// @relation(GSSC-PLLR-31, scope=range_start, role=Test)
test('GSSC-PLLR-31 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const full = root.querySelector<HTMLElement>('.gssc-footer__organization-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-footer__organization-name--short')!;
  expect(full.textContent?.trim()).toBe(societyContact.organizationName());
  expect(short.textContent?.trim()).toBe(societyContact.organizationAcronym());
  // One form is shown at a time (Lexical); both values come from Society Contact.
  expect(societyContact.organizationName().length).toBeGreaterThan(0);
  expect(societyContact.organizationAcronym().length).toBeGreaterThan(0);
});
// @relation(GSSC-PLLR-31, scope=range_end, role=Test)

// @relation(GSSC-PLLR-32, scope=range_start, role=Test)
test('GSSC-PLLR-32 Syntactic', async () => {
  const { root } = await setupFooter();
  const identity = root.querySelector('.gssc-footer__identity')!;
  const logo = identity.querySelector('.gssc-footer__logo')!;
  const name = identity.querySelector('.gssc-footer__organization-name')!;
  expect(logo.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-32, scope=range_end, role=Test)

// @relation(GSSC-PLLR-383, scope=range_start, role=Test)
test('GSSC-PLLR-383 Semantic', async () => {
  const { fixture, root, router } = await setupFooter();
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-footer__logo')!;
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  expect(logo.querySelector('.gssc-footer__logo-mark')).not.toBeNull();
  await router.navigateByUrl('/membership');
  fixture.detectChanges();
  await fixture.whenStable();
  logo.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/');
});
// @relation(GSSC-PLLR-383, scope=range_end, role=Test)

// @relation(GSSC-PLLR-384, scope=range_start, role=Test)
test('GSSC-PLLR-384 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const identity = [...footer.children].find((child) => child instanceof HTMLElement);
  expect(identity?.classList.contains('gssc-footer__identity')).toBe(true);
  const logo = identity!.querySelector('.gssc-footer__logo')!;
  const name = identity!.querySelector('.gssc-footer__organization-name')!;
  expect(logo.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-384, scope=range_end, role=Test)

// @relation(GSSC-PLLR-385, scope=range_start, role=Test)
test('GSSC-PLLR-385 Lexical', async () => {
  const { root } = await setupFooter();
  const mark = root.querySelector<HTMLImageElement>('.gssc-footer__logo-mark')!;
  expect(mark.tagName).toBe('IMG');
  expect(mark.getAttribute('src')).toBe('/gssc-society-logo.png');
  expect(mark.classList.contains('size-10')).toBe(true);
  expect(mark.classList.contains('object-contain')).toBe(true);
});
// @relation(GSSC-PLLR-385, scope=range_end, role=Test)

// @relation(GSSC-PLLR-33, scope=range_start, role=Test)
test('GSSC-PLLR-33 Lexical', async () => {
  const { root } = await setupFooter();
  const name = root.querySelector<HTMLElement>('.gssc-footer__organization-name')!;
  const full = root.querySelector<HTMLElement>('.gssc-footer__organization-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-footer__organization-name--short')!;
  expect(name.classList.contains('font-semibold')).toBe(true);
  expect(name.classList.contains('text-gssc-white')).toBe(true);
  // Small and above: full name; below small: acronym (SW: Tailwind sm utilities).
  expect(full.classList.contains('hidden')).toBe(true);
  expect(full.classList.contains('sm:inline')).toBe(true);
  expect(short.classList.contains('inline')).toBe(true);
  expect(short.classList.contains('sm:hidden')).toBe(true);
});
// @relation(GSSC-PLLR-33, scope=range_end, role=Test)

// @relation(GSSC-PLLR-34, scope=range_start, role=Test)
test('GSSC-PLLR-34 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const phone = root.querySelector<HTMLAnchorElement>('.gssc-footer__phone')!;
  expect(phone.textContent?.trim()).toBe(societyContact.phoneNumber());
  expect(phone.getAttribute('href')).toBe(societyContact.phoneDialHref());
  expect(societyContact.phoneDialHref().startsWith('tel:')).toBe(true);
});
// @relation(GSSC-PLLR-34, scope=range_end, role=Test)

// @relation(GSSC-PLLR-35, scope=range_start, role=Test)
test('GSSC-PLLR-35 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const phone = root.querySelector('.gssc-footer__phone')!;
  expect(phone.tagName).toBe('A');
  expect(details.contains(phone)).toBe(true);
  expect(details.querySelector('.gssc-footer__email')).not.toBeNull();
  expect(details.querySelector('.gssc-footer__postal')).not.toBeNull();
});
// @relation(GSSC-PLLR-35, scope=range_end, role=Test)

// @relation(GSSC-PLLR-36, scope=range_start, role=Test)
test('GSSC-PLLR-36 Lexical', async () => {
  const { root } = await setupFooter();
  const phone = root.querySelector<HTMLElement>('.gssc-footer__phone')!;
  expect(phone.classList.contains('font-normal')).toBe(true);
  expect(phone.classList.contains('text-gssc-white')).toBe(true);
  expect(phone.classList.contains('no-underline')).toBe(true);
  expect(phone.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-36, scope=range_end, role=Test)

// @relation(GSSC-PLLR-37, scope=range_start, role=Test)
test('GSSC-PLLR-37 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const email = root.querySelector<HTMLAnchorElement>('.gssc-footer__email')!;
  expect(email.textContent?.trim()).toBe(societyContact.emailAddress());
  expect(email.getAttribute('href')).toBe(societyContact.emailMailtoHref());
  expect(societyContact.emailMailtoHref().startsWith('mailto:')).toBe(true);
});
// @relation(GSSC-PLLR-37, scope=range_end, role=Test)

// @relation(GSSC-PLLR-38, scope=range_start, role=Test)
test('GSSC-PLLR-38 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const email = root.querySelector('.gssc-footer__email')!;
  expect(email.tagName).toBe('A');
  expect(details.contains(email)).toBe(true);
});
// @relation(GSSC-PLLR-38, scope=range_end, role=Test)

// @relation(GSSC-PLLR-39, scope=range_start, role=Test)
test('GSSC-PLLR-39 Lexical', async () => {
  const { root } = await setupFooter();
  const email = root.querySelector<HTMLElement>('.gssc-footer__email')!;
  expect(email.classList.contains('font-normal')).toBe(true);
  expect(email.classList.contains('text-gssc-white')).toBe(true);
  expect(email.classList.contains('no-underline')).toBe(true);
  expect(email.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-39, scope=range_end, role=Test)

// @relation(GSSC-PLLR-40, scope=range_start, role=Test)
test('GSSC-PLLR-40 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  expect(textContent(root, '.gssc-footer__postal')).toBe(societyContact.postalAddress());
});
// @relation(GSSC-PLLR-40, scope=range_end, role=Test)

// @relation(GSSC-PLLR-41, scope=range_start, role=Test)
test('GSSC-PLLR-41 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  expect(details.contains(root.querySelector('.gssc-footer__postal'))).toBe(true);
});
// @relation(GSSC-PLLR-41, scope=range_end, role=Test)

// @relation(GSSC-PLLR-42, scope=range_start, role=Test)
test('GSSC-PLLR-42 Lexical', async () => {
  const { root } = await setupFooter();
  const postal = root.querySelector<HTMLElement>('.gssc-footer__postal')!;
  expect(postal.classList.contains('font-normal')).toBe(true);
  expect(postal.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-PLLR-42, scope=range_end, role=Test)

// @relation(GSSC-PLLR-43, scope=range_start, role=Test)
test('GSSC-PLLR-43 Semantic', async () => {
  const { fixture, root, contactOverlay } = await setupFooter();
  expect(contactOverlay.openCount()).toBe(0);
  root.querySelector<HTMLButtonElement>('.gssc-footer__contact')!.click();
  fixture.detectChanges();
  expect(contactOverlay.openCount()).toBe(1);
});
// @relation(GSSC-PLLR-43, scope=range_end, role=Test)

// @relation(GSSC-PLLR-44, scope=range_start, role=Test)
test('GSSC-PLLR-44 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const contact = root.querySelector('.gssc-footer__contact')!;
  expect(contact.tagName).toBe('BUTTON');
  expect(details.contains(contact)).toBe(true);
});
// @relation(GSSC-PLLR-44, scope=range_end, role=Test)

// @relation(GSSC-PLLR-45, scope=range_start, role=Test)
test('GSSC-PLLR-45 Lexical', async () => {
  const { root } = await setupFooter();
  const contact = root.querySelector<HTMLElement>('.gssc-footer__contact')!;
  expect(contact.classList.contains('text-gssc-white')).toBe(true);
  expect(contact.classList.contains('no-underline')).toBe(true);
  expect(contact.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-45, scope=range_end, role=Test)

// @relation(GSSC-PLLR-345, scope=range_start, role=Test)
test('GSSC-PLLR-345 Semantic', async () => {
  const { root } = await setupFooter();
  const sitemap = root.querySelector<HTMLAnchorElement>('.gssc-footer__sitemap')!;
  expect(sitemap).not.toBeNull();
  expect(sitemap.getAttribute('href')).toBe('/sitemap');
  expect(sitemap.textContent?.trim()).toBe('Sitemap');
});
// @relation(GSSC-PLLR-345, scope=range_end, role=Test)

// @relation(GSSC-PLLR-346, scope=range_start, role=Test)
test('GSSC-PLLR-346 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const contact = root.querySelector('.gssc-footer__contact')!;
  const sitemap = root.querySelector('.gssc-footer__sitemap')!;
  expect(details.contains(sitemap)).toBe(true);
  expect(
    contact.compareDocumentPosition(sitemap) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(sitemap.tagName).toBe('A');
});
// @relation(GSSC-PLLR-346, scope=range_end, role=Test)

// @relation(GSSC-PLLR-347, scope=range_start, role=Test)
test('GSSC-PLLR-347 Lexical', async () => {
  const { root } = await setupFooter();
  const sitemap = root.querySelector<HTMLElement>('.gssc-footer__sitemap')!;
  expect(sitemap.classList.contains('text-gssc-white')).toBe(true);
  expect(sitemap.classList.contains('no-underline')).toBe(true);
  expect(sitemap.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-347, scope=range_end, role=Test)

// @relation(GSSC-PLLR-376, scope=range_start, role=Test)
test('GSSC-PLLR-376 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const copyright = textContent(root, '.gssc-footer__copyright')!;
  expect(copyright).toContain('©');
  expect(copyright).toContain(String(new Date().getFullYear()));
  expect(copyright).toContain(societyContact.organizationName());
  expect(copyright).toContain('All Rights Reserved');
});
// @relation(GSSC-PLLR-376, scope=range_end, role=Test)

// @relation(GSSC-PLLR-377, scope=range_start, role=Test)
test('GSSC-PLLR-377 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const copyright = root.querySelector('.gssc-footer__copyright')!;
  expect(footer.contains(copyright)).toBe(true);
  expect(
    details.compareDocumentPosition(copyright) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-377, scope=range_end, role=Test)

// @relation(GSSC-PLLR-378, scope=range_start, role=Test)
test('GSSC-PLLR-378 Lexical', async () => {
  const { root } = await setupFooter();
  const copyright = root.querySelector<HTMLElement>('.gssc-footer__copyright')!;
  expect(copyright.classList.contains('font-normal')).toBe(true);
  expect(copyright.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-PLLR-378, scope=range_end, role=Test)

// @relation(GSSC-PLLR-379, scope=range_start, role=Test)
test('GSSC-PLLR-379 Semantic', async () => {
  const { fixture, root, membersApp } = await setupFooter();
  expect(membersApp.lastNavigation).toBeNull();
  root.querySelector<HTMLButtonElement>('.gssc-footer__members')!.click();
  fixture.detectChanges();
  expect(membersApp.lastNavigation).toBe(DEFAULT_MEMBERS_APP_ORIGIN);
});
// @relation(GSSC-PLLR-379, scope=range_end, role=Test)

// @relation(GSSC-PLLR-380, scope=range_start, role=Test)
test('GSSC-PLLR-380 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const sitemap = root.querySelector('.gssc-footer__sitemap')!;
  const members = root.querySelector('.gssc-footer__members')!;
  expect(details.contains(members)).toBe(true);
  expect(
    sitemap.compareDocumentPosition(members) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(members.tagName).toBe('BUTTON');
  expect(members.textContent?.trim()).toBe('Members');
});
// @relation(GSSC-PLLR-380, scope=range_end, role=Test)

// @relation(GSSC-PLLR-381, scope=range_start, role=Test)
test('GSSC-PLLR-381 Lexical', async () => {
  const { root } = await setupFooter();
  const members = root.querySelector<HTMLElement>('.gssc-footer__members')!;
  expect(members.classList.contains('text-gssc-white')).toBe(true);
  expect(members.classList.contains('no-underline')).toBe(true);
  expect(members.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-381, scope=range_end, role=Test)
