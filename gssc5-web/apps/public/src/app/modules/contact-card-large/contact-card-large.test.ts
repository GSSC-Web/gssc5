import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  ContactCardLarge,
  type ContactCardContents,
} from './contact-card-large';

const filled: ContactCardContents = {
  name: 'Karen Souza',
  title: 'President',
  photoUrl: 'https://example.com/photo.jpg',
  contactLabel: 'karen@example.com',
  contactHref: 'mailto:karen@example.com',
};

const vacant: ContactCardContents = {
  name: null,
  title: 'Secretary',
  photoUrl: null,
  contactLabel: null,
  contactHref: null,
};

async function setupCard(contents: ContactCardContents) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContactCardLarge],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContactCardLarge);
  fixture.componentRef.setInput('contents', contents);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-237, scope=range_start, role=Test)
test('GSSC-PLLR-237 Contact Card Large Semantic', async () => {
  const { root: withPhoto } = await setupCard(filled);
  expect(
    withPhoto.querySelector<HTMLImageElement>('.gssc-contact-card-large__photo-img')?.getAttribute(
      'src',
    ),
  ).toBe(filled.photoUrl);
  expect(textContent(withPhoto, '.gssc-contact-card-large__name')).toBe('Karen Souza');
  expect(textContent(withPhoto, '.gssc-contact-card-large__title')).toBe('President');
  const link = withPhoto.querySelector<HTMLAnchorElement>('.gssc-contact-card-large__contact')!;
  expect(link.textContent?.trim()).toBe('karen@example.com');
  expect(link.getAttribute('href')).toBe('mailto:karen@example.com');

  const { root: empty } = await setupCard(vacant);
  expect(empty.querySelector('.gssc-contact-card-large__photo-placeholder')).not.toBeNull();
  expect(textContent(empty, '.gssc-contact-card-large__vacant')).toBe('Vacant');
  expect(empty.querySelector('.gssc-contact-card-large__contact')).toBeNull();

  const { root: phone } = await setupCard({
    ...filled,
    contactLabel: '209-555-0100',
    contactHref: 'tel:209-555-0100',
  });
  expect(
    phone.querySelector<HTMLAnchorElement>('.gssc-contact-card-large__contact')?.getAttribute(
      'href',
    ),
  ).toBe('tel:209-555-0100');
});
// @relation(GSSC-PLLR-237, scope=range_end, role=Test)

// @relation(GSSC-PLLR-238, scope=range_start, role=Test)
test('GSSC-PLLR-238 Contact Card Large Syntactic', async () => {
  const { root } = await setupCard(filled);
  const card = root.querySelector('.gssc-contact-card-large')!;
  expect(card.classList.contains('flex-col')).toBe(true);
  expect(card.classList.contains('w-full')).toBe(true);
  const photo = root.querySelector('.gssc-contact-card-large__photo')!;
  const body = root.querySelector('.gssc-contact-card-large__body')!;
  expect(photo.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(photo.classList.contains('w-full')).toBe(true);
  expect(body.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-PLLR-238, scope=range_end, role=Test)

// @relation(GSSC-PLLR-239, scope=range_start, role=Test)
test('GSSC-PLLR-239 Contact Card Large Lexical', async () => {
  const { root } = await setupCard(filled);
  const card = root.querySelector<HTMLElement>('.gssc-contact-card-large')!;
  expect(card.classList.contains('bg-gssc-white')).toBe(true);
  expect(card.classList.contains('border-gssc-gray')).toBe(true);
  expect(card.classList.contains('font-sans')).toBe(true);

  const name = root.querySelector<HTMLElement>('.gssc-contact-card-large__name')!;
  expect(name.classList.contains('text-lg')).toBe(true);
  expect(name.classList.contains('text-gssc-black')).toBe(true);
  expect(root.querySelector('.gssc-contact-card-large__body')!.classList.contains('text-center')).toBe(
    true,
  );

  const title = root.querySelector<HTMLElement>('.gssc-contact-card-large__title')!;
  expect(title.classList.contains('font-bold')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);

  const contact = root.querySelector<HTMLElement>('.gssc-contact-card-large__contact')!;
  expect(contact.classList.contains('italic')).toBe(true);
  expect(contact.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-239, scope=range_end, role=Test)
