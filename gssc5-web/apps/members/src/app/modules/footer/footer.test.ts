import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import {
  BRANDING_FAVICON_KEY,
  BRANDING_LOGO_KEY,
} from '../../services/branding-assets/branding-assets';
import {
  SOCIETY_EMAIL_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SOCIETY_PHONE_KEY,
  SOCIETY_POSTAL_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import { KvStore } from '../../services/kv-store/kv-store';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { Footer } from './footer';

const sampleContact = {
  organizationName: 'Genealogical Society of Stanislaus County',
  phoneNumber: '(209) 529-9430',
  emailAddress: 'gsscfounded1968@gmail.com',
  postalAddress: 'P.O. Box 1352 Modesto, CA 95353-1352',
};

const sampleBrandingLogoUrl = 'http://localhost:3000/branding/gssc-society-logo.png';

class FakeKvStore {
  private readonly values = new Map<string, string>([
    [SOCIETY_ORGANIZATION_NAME_KEY, sampleContact.organizationName],
    [SOCIETY_PHONE_KEY, sampleContact.phoneNumber],
    [SOCIETY_EMAIL_KEY, sampleContact.emailAddress],
    [SOCIETY_POSTAL_KEY, sampleContact.postalAddress],
    [BRANDING_FAVICON_KEY, 'branding/favicon.ico'],
    [BRANDING_LOGO_KEY, 'branding/gssc-society-logo.png'],
  ]);

  async getValue(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
}

async function setupFooter() {
  const fixture = await setupMembersComponent(Footer, {
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: KvStore, useClass: FakeKvStore },
    ],
  });
  await fixture.whenStable();
  fixture.detectChanges();
  const societyContact = TestBed.inject(SocietyContact);
  const contactOverlay = TestBed.inject(ContactOverlay);
  const router = TestBed.inject(Router);
  const root = nativeElement(fixture);
  return { fixture, societyContact, contactOverlay, router, root };
}

// @relation(GSSC-MLLR-40, scope=range_start, role=Test)
test('GSSC-MLLR-40 Semantic', async () => {
  const { root } = await setupFooter();
  expect(root.querySelector('.gssc-footer__logo')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__organization-name')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__phone')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__email')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__postal')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__contact')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__home')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__copyright')).not.toBeNull();
});
// @relation(GSSC-MLLR-40, scope=range_end, role=Test)

// @relation(GSSC-MLLR-41, scope=range_start, role=Test)
test('GSSC-MLLR-41 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer.classList.contains('w-full')).toBe(true);
  expect(footer.classList.contains('flex')).toBe(true);
  expect(footer.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-MLLR-41, scope=range_end, role=Test)

// @relation(GSSC-MLLR-42, scope=range_start, role=Test)
test('GSSC-MLLR-42 Lexical', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer.classList.contains('bg-gssc-black')).toBe(true);
  expect(footer.classList.contains('text-gssc-white')).toBe(true);
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const footerPin = css.match(/html\.dark\s+\.gssc-footer\s*\{([^}]*)\}/);
  expect(footerPin?.[1]).toMatch(/--gssc-black:\s*#000000/);
  expect(footerPin?.[1]).toMatch(/--gssc-white:\s*#ffffff/);
  expect(footerPin?.[1]).toMatch(/--color-gssc-black:\s*#000000/);
  expect(footerPin?.[1]).toMatch(/--color-gssc-white:\s*#ffffff/);
});
// @relation(GSSC-MLLR-42, scope=range_end, role=Test)

// @relation(GSSC-MLLR-43, scope=range_start, role=Test)
test('GSSC-MLLR-43 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  expect(textContent(root, '.gssc-footer__organization-name')).toBe(
    societyContact.organizationName(),
  );
  expect(societyContact.organizationName()).toBe(sampleContact.organizationName);
});
// @relation(GSSC-MLLR-43, scope=range_end, role=Test)

// @relation(GSSC-MLLR-44, scope=range_start, role=Test)
test('GSSC-MLLR-44 Syntactic', async () => {
  const { root } = await setupFooter();
  const identity = root.querySelector('.gssc-footer__identity')!;
  const logo = identity.querySelector('.gssc-footer__logo')!;
  const name = identity.querySelector('.gssc-footer__organization-name')!;
  expect(logo.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-44, scope=range_end, role=Test)

// @relation(GSSC-MLLR-644, scope=range_start, role=Test)
test('GSSC-MLLR-644 Semantic', async () => {
  const { fixture, root, router } = await setupFooter();
  const logo = root.querySelector<HTMLAnchorElement>('.gssc-footer__logo')!;
  expect(logo.getAttribute('aria-label')).toBe('GSSC Logo');
  expect(logo.querySelector('.gssc-footer__logo-mark')).not.toBeNull();
  await router.navigateByUrl('/account');
  fixture.detectChanges();
  await fixture.whenStable();
  logo.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(router.url).toBe('/');
});
// @relation(GSSC-MLLR-644, scope=range_end, role=Test)

// @relation(GSSC-MLLR-645, scope=range_start, role=Test)
test('GSSC-MLLR-645 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const identity = [...footer.children].find((child) => child instanceof HTMLElement);
  expect(identity?.classList.contains('gssc-footer__identity')).toBe(true);
  const logo = identity!.querySelector('.gssc-footer__logo')!;
  const name = identity!.querySelector('.gssc-footer__organization-name')!;
  expect(logo.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-645, scope=range_end, role=Test)

// @relation(GSSC-MLLR-646, scope=range_start, role=Test)
test('GSSC-MLLR-646 Lexical', async () => {
  const { root } = await setupFooter();
  const mark = root.querySelector<HTMLImageElement>('.gssc-footer__logo-mark')!;
  expect(mark.tagName).toBe('IMG');
  expect(mark.getAttribute('src')).toBe(sampleBrandingLogoUrl);
  expect(mark.classList.contains('size-10')).toBe(true);
  expect(mark.classList.contains('object-contain')).toBe(true);
});
// @relation(GSSC-MLLR-646, scope=range_end, role=Test)

// @relation(GSSC-MLLR-45, scope=range_start, role=Test)
test('GSSC-MLLR-45 Lexical', async () => {
  const { root } = await setupFooter();
  const name = root.querySelector<HTMLElement>('.gssc-footer__organization-name')!;
  expect(name.classList.contains('font-semibold')).toBe(true);
  expect(name.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-45, scope=range_end, role=Test)

// @relation(GSSC-MLLR-46, scope=range_start, role=Test)
test('GSSC-MLLR-46 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const copyright = textContent(root, '.gssc-footer__copyright')!;
  expect(copyright).toContain('©');
  expect(copyright).toContain(String(new Date().getFullYear()));
  expect(copyright).toContain(societyContact.organizationName());
  expect(copyright).toContain('All Rights Reserved');
});
// @relation(GSSC-MLLR-46, scope=range_end, role=Test)

// @relation(GSSC-MLLR-47, scope=range_start, role=Test)
test('GSSC-MLLR-47 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const copyright = root.querySelector('.gssc-footer__copyright')!;
  expect(footer.contains(copyright)).toBe(true);
  expect(
    details.compareDocumentPosition(copyright) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-MLLR-47, scope=range_end, role=Test)

// @relation(GSSC-MLLR-48, scope=range_start, role=Test)
test('GSSC-MLLR-48 Lexical', async () => {
  const { root } = await setupFooter();
  const copyright = root.querySelector<HTMLElement>('.gssc-footer__copyright')!;
  expect(copyright.classList.contains('font-normal')).toBe(true);
  expect(copyright.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-48, scope=range_end, role=Test)

// @relation(GSSC-MLLR-49, scope=range_start, role=Test)
test('GSSC-MLLR-49 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const phone = root.querySelector<HTMLAnchorElement>('.gssc-footer__phone')!;
  expect(phone.textContent?.trim()).toBe(societyContact.phoneNumber());
  expect(phone.getAttribute('href')).toBe(societyContact.phoneDialHref());
  expect(societyContact.phoneDialHref().startsWith('tel:')).toBe(true);
});
// @relation(GSSC-MLLR-49, scope=range_end, role=Test)

// @relation(GSSC-MLLR-50, scope=range_start, role=Test)
test('GSSC-MLLR-50 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const phone = root.querySelector('.gssc-footer__phone')!;
  expect(phone.tagName).toBe('A');
  expect(details.contains(phone)).toBe(true);
});
// @relation(GSSC-MLLR-50, scope=range_end, role=Test)

// @relation(GSSC-MLLR-51, scope=range_start, role=Test)
test('GSSC-MLLR-51 Lexical', async () => {
  const { root } = await setupFooter();
  const phone = root.querySelector<HTMLElement>('.gssc-footer__phone')!;
  expect(phone.classList.contains('font-normal')).toBe(true);
  expect(phone.classList.contains('text-gssc-white')).toBe(true);
  expect(phone.classList.contains('no-underline')).toBe(true);
  expect(phone.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-MLLR-51, scope=range_end, role=Test)

// @relation(GSSC-MLLR-52, scope=range_start, role=Test)
test('GSSC-MLLR-52 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  const email = root.querySelector<HTMLAnchorElement>('.gssc-footer__email')!;
  expect(email.textContent?.trim()).toBe(societyContact.emailAddress());
  expect(email.getAttribute('href')).toBe(societyContact.emailMailtoHref());
  expect(societyContact.emailMailtoHref().startsWith('mailto:')).toBe(true);
});
// @relation(GSSC-MLLR-52, scope=range_end, role=Test)

// @relation(GSSC-MLLR-53, scope=range_start, role=Test)
test('GSSC-MLLR-53 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const email = root.querySelector('.gssc-footer__email')!;
  expect(email.tagName).toBe('A');
  expect(details.contains(email)).toBe(true);
});
// @relation(GSSC-MLLR-53, scope=range_end, role=Test)

// @relation(GSSC-MLLR-54, scope=range_start, role=Test)
test('GSSC-MLLR-54 Lexical', async () => {
  const { root } = await setupFooter();
  const email = root.querySelector<HTMLElement>('.gssc-footer__email')!;
  expect(email.classList.contains('font-normal')).toBe(true);
  expect(email.classList.contains('text-gssc-white')).toBe(true);
  expect(email.classList.contains('no-underline')).toBe(true);
  expect(email.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-MLLR-54, scope=range_end, role=Test)

// @relation(GSSC-MLLR-55, scope=range_start, role=Test)
test('GSSC-MLLR-55 Semantic', async () => {
  const { root, societyContact } = await setupFooter();
  expect(textContent(root, '.gssc-footer__postal')).toBe(societyContact.postalAddress());
});
// @relation(GSSC-MLLR-55, scope=range_end, role=Test)

// @relation(GSSC-MLLR-56, scope=range_start, role=Test)
test('GSSC-MLLR-56 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  expect(details.contains(root.querySelector('.gssc-footer__postal'))).toBe(true);
});
// @relation(GSSC-MLLR-56, scope=range_end, role=Test)

// @relation(GSSC-MLLR-57, scope=range_start, role=Test)
test('GSSC-MLLR-57 Lexical', async () => {
  const { root } = await setupFooter();
  const postal = root.querySelector<HTMLElement>('.gssc-footer__postal')!;
  expect(postal.classList.contains('font-normal')).toBe(true);
  expect(postal.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-57, scope=range_end, role=Test)

// @relation(GSSC-MLLR-58, scope=range_start, role=Test)
test('GSSC-MLLR-58 Semantic', async () => {
  const { fixture, root, contactOverlay } = await setupFooter();
  expect(contactOverlay.openCount()).toBe(0);
  root.querySelector<HTMLButtonElement>('.gssc-footer__contact')!.click();
  fixture.detectChanges();
  expect(contactOverlay.openCount()).toBe(1);
});
// @relation(GSSC-MLLR-58, scope=range_end, role=Test)

// @relation(GSSC-MLLR-59, scope=range_start, role=Test)
test('GSSC-MLLR-59 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const contact = root.querySelector('.gssc-footer__contact')!;
  expect(contact.tagName).toBe('BUTTON');
  expect(details.contains(contact)).toBe(true);
});
// @relation(GSSC-MLLR-59, scope=range_end, role=Test)

// @relation(GSSC-MLLR-60, scope=range_start, role=Test)
test('GSSC-MLLR-60 Lexical', async () => {
  const { root } = await setupFooter();
  const contact = root.querySelector<HTMLElement>('.gssc-footer__contact')!;
  expect(contact.classList.contains('text-gssc-white')).toBe(true);
  expect(contact.classList.contains('no-underline')).toBe(true);
  expect(contact.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-MLLR-60, scope=range_end, role=Test)

// @relation(GSSC-MLLR-501, scope=range_start, role=Test)
test('GSSC-MLLR-501 Semantic', async () => {
  const { root } = await setupFooter();
  const sitemap = root.querySelector<HTMLAnchorElement>('.gssc-footer__sitemap')!;
  expect(sitemap).not.toBeNull();
  expect(sitemap.getAttribute('href')).toBe('/sitemap');
  expect(sitemap.textContent?.trim()).toBe('Sitemap');
});
// @relation(GSSC-MLLR-501, scope=range_end, role=Test)

// @relation(GSSC-MLLR-502, scope=range_start, role=Test)
test('GSSC-MLLR-502 Syntactic', async () => {
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
// @relation(GSSC-MLLR-502, scope=range_end, role=Test)

// @relation(GSSC-MLLR-503, scope=range_start, role=Test)
test('GSSC-MLLR-503 Lexical', async () => {
  const { root } = await setupFooter();
  const sitemap = root.querySelector<HTMLElement>('.gssc-footer__sitemap')!;
  expect(sitemap.classList.contains('text-gssc-white')).toBe(true);
  expect(sitemap.classList.contains('no-underline')).toBe(true);
  expect(sitemap.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-MLLR-503, scope=range_end, role=Test)

// @relation(GSSC-MLLR-641, scope=range_start, role=Test)
test('GSSC-MLLR-641 Semantic', async () => {
  const { root } = await setupFooter();
  const home = root.querySelector<HTMLAnchorElement>('.gssc-footer__home')!;
  expect(home).not.toBeNull();
  expect(home.getAttribute('href')).toBe('/');
  expect(home.textContent?.trim()).toBe('Home');
});
// @relation(GSSC-MLLR-641, scope=range_end, role=Test)

// @relation(GSSC-MLLR-642, scope=range_start, role=Test)
test('GSSC-MLLR-642 Syntactic', async () => {
  const { root } = await setupFooter();
  const details = root.querySelector('.gssc-footer__contact-details')!;
  const sitemap = root.querySelector('.gssc-footer__sitemap')!;
  const home = root.querySelector('.gssc-footer__home')!;
  expect(details.contains(home)).toBe(true);
  expect(
    sitemap.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(home.tagName).toBe('A');
});
// @relation(GSSC-MLLR-642, scope=range_end, role=Test)

// @relation(GSSC-MLLR-643, scope=range_start, role=Test)
test('GSSC-MLLR-643 Lexical', async () => {
  const { root } = await setupFooter();
  const home = root.querySelector<HTMLElement>('.gssc-footer__home')!;
  expect(home.classList.contains('text-gssc-white')).toBe(true);
  expect(home.classList.contains('no-underline')).toBe(true);
  expect(home.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-MLLR-643, scope=range_end, role=Test)
