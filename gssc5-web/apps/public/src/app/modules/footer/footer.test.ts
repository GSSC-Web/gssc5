import { TestBed } from '@angular/core/testing';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import {
  SOCIETY_EMAIL_KEY,
  SOCIETY_PHONE_KEY,
  SOCIETY_POSTAL_KEY,
  SocietyContact,
} from '../../services/society-contact/society-contact';
import { KvStore } from '../../services/kv-store/kv-store';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { Footer } from './footer';

const sampleContact = {
  phoneNumber: '(209) 529-9430',
  emailAddress: 'gsscfounded1968@gmail.com',
  postalAddress: 'P.O. Box 1352 Modesto, CA 95353-1352',
};

class FakeKvStore {
  private readonly values = new Map<string, string>([
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
    providers: [{ provide: KvStore, useClass: FakeKvStore }],
  });
  await fixture.whenStable();
  fixture.detectChanges();
  const societyContact = TestBed.inject(SocietyContact);
  const contactOverlay = TestBed.inject(ContactOverlay);
  const root = nativeElement(fixture);
  return { fixture, societyContact, contactOverlay, root };
}

// @relation(GSSC-PLLR-28, scope=range_start, role=Test)
test('GSSC-PLLR-28 Semantic', async () => {
  const { root } = await setupFooter();
  expect(root.querySelector('.gssc-footer__organization-name')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__phone')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__email')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__postal')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__contact')).not.toBeNull();
});
// @relation(GSSC-PLLR-28, scope=range_end, role=Test)

// @relation(GSSC-PLLR-30, scope=range_start, role=Test)
test('GSSC-PLLR-30 Lexical', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(getComputedStyle(footer).backgroundColor).toBe('var(--gssc-black)');
  expect(getComputedStyle(footer).color).toBe('var(--gssc-white)');
});
// @relation(GSSC-PLLR-30, scope=range_end, role=Test)

// @relation(GSSC-PLLR-31, scope=range_start, role=Test)
test('GSSC-PLLR-31 Semantic', async () => {
  const { root } = await setupFooter();
  const full = root.querySelector<HTMLElement>('.gssc-footer__organization-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-footer__organization-name--short')!;
  const visible =
    getComputedStyle(full).display === 'none' ? short : full;
  const label = visible.textContent?.trim() ?? '';
  expect(['Genealogical Society of Stanislaus County', 'GSSC']).toContain(label);
  // Default / wide viewport shows the full name (acronym is the narrow alternative).
  expect(label).toBe('Genealogical Society of Stanislaus County');
});
// @relation(GSSC-PLLR-31, scope=range_end, role=Test)

// @relation(GSSC-PLLR-32, scope=range_start, role=Test)
test('GSSC-PLLR-32 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const firstContent = [...footer.children].find((child) => child instanceof HTMLElement);
  expect(firstContent?.classList.contains('gssc-footer__organization-name')).toBe(true);
});
// @relation(GSSC-PLLR-32, scope=range_end, role=Test)

// @relation(GSSC-PLLR-33, scope=range_start, role=Test)
test('GSSC-PLLR-33 Lexical', async () => {
  const { root } = await setupFooter();
  const name = root.querySelector<HTMLElement>('.gssc-footer__organization-name')!;
  const full = root.querySelector<HTMLElement>('.gssc-footer__organization-name--full')!;
  const short = root.querySelector<HTMLElement>('.gssc-footer__organization-name--short')!;
  expect(getComputedStyle(name).fontWeight).toBe('600');
  expect(getComputedStyle(name).color).toBe('var(--gssc-white)');
  // Default / wide: full name visible, acronym hidden.
  expect(getComputedStyle(full).display).toBe('inline');
  expect(getComputedStyle(short).display).toBe('none');
  const cssText = [...name.ownerDocument.querySelectorAll('style')]
    .map((el) => el.textContent ?? '')
    .join('\n');
  expect(cssText).toContain('max-width: 39.999rem');
  expect(cssText).toMatch(
    /organization-name--full[^}]*display:\s*none|max-width:\s*39\.999rem[\s\S]*organization-name--full[\s\S]*display:\s*none/,
  );
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
  expect(getComputedStyle(phone).fontWeight).toBe('400');
  expect(getComputedStyle(phone).color).toBe('var(--gssc-white)');
  expect(getComputedStyle(phone).textDecorationLine).toBe('none');
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
  expect(getComputedStyle(email).fontWeight).toBe('400');
  expect(getComputedStyle(email).color).toBe('var(--gssc-white)');
  expect(getComputedStyle(email).textDecorationLine).toBe('none');
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
  expect(getComputedStyle(postal).fontWeight).toBe('400');
  expect(getComputedStyle(postal).color).toBe('var(--gssc-white)');
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
  expect(getComputedStyle(contact).color).toBe('var(--gssc-white)');
  expect(getComputedStyle(contact).textDecorationLine).toBe('none');
});
// @relation(GSSC-PLLR-45, scope=range_end, role=Test)
