import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import type { ContactCardContents } from '../contact-card-large/contact-card-large';
import { ContactCardSmall } from './contact-card-small';

const filled: ContactCardContents = {
  name: 'Linda Turley',
  title: 'Director at Large 1',
  photoUrl: null,
  contactLabel: 'linda@example.com',
  contactHref: 'mailto:linda@example.com',
};

async function setupCard(contents: ContactCardContents) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContactCardSmall],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContactCardSmall);
  fixture.componentRef.setInput('contents', contents);
  fixture.detectChanges();
  await fixture.whenStable();
  return { root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-240, scope=range_start, role=Test)
test('GSSC-PLLR-240 Contact Card Small Semantic', async () => {
  const { root } = await setupCard(filled);
  expect(root.querySelector('.gssc-contact-card-small__photo-placeholder')).not.toBeNull();
  expect(textContent(root, '.gssc-contact-card-small__name')).toBe('Linda Turley');
  expect(textContent(root, '.gssc-contact-card-small__title')).toBe('Director at Large 1');
  const link = root.querySelector<HTMLAnchorElement>('.gssc-contact-card-small__contact')!;
  expect(link.getAttribute('href')).toBe('mailto:linda@example.com');

  const { root: vacant } = await setupCard({
    name: null,
    title: 'Director at Large 4',
    photoUrl: null,
    contactLabel: null,
    contactHref: null,
  });
  expect(textContent(vacant, '.gssc-contact-card-small__vacant')).toBe('Vacant');
});
// @relation(GSSC-PLLR-240, scope=range_end, role=Test)

// @relation(GSSC-PLLR-241, scope=range_start, role=Test)
test('GSSC-PLLR-241 Contact Card Small Syntactic', async () => {
  const { root } = await setupCard(filled);
  const card = root.querySelector('.gssc-contact-card-small')!;
  expect(card.classList.contains('flex-row')).toBe(true);
  expect(card.classList.contains('w-full')).toBe(true);
  const photo = root.querySelector('.gssc-contact-card-small__photo')!;
  const body = root.querySelector('.gssc-contact-card-small__body')!;
  expect(photo.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(photo.classList.contains('self-stretch')).toBe(true);
});
// @relation(GSSC-PLLR-241, scope=range_end, role=Test)

// @relation(GSSC-PLLR-242, scope=range_start, role=Test)
test('GSSC-PLLR-242 Contact Card Small Lexical', async () => {
  const { root } = await setupCard(filled);
  const card = root.querySelector<HTMLElement>('.gssc-contact-card-small')!;
  expect(card.classList.contains('bg-gssc-white')).toBe(true);
  expect(card.classList.contains('border-gssc-gray')).toBe(true);
  expect(card.classList.contains('font-sans')).toBe(true);

  const name = root.querySelector<HTMLElement>('.gssc-contact-card-small__name')!;
  expect(name.classList.contains('text-base')).toBe(true);
  expect(name.classList.contains('text-gssc-black')).toBe(true);

  const title = root.querySelector<HTMLElement>('.gssc-contact-card-small__title')!;
  expect(title.classList.contains('font-bold')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);

  const contact = root.querySelector<HTMLElement>('.gssc-contact-card-small__contact')!;
  expect(contact.classList.contains('italic')).toBe(true);

  const { root: vacantRoot } = await setupCard({
    name: null,
    title: 'Director at Large 4',
    photoUrl: null,
    contactLabel: null,
    contactHref: null,
  });
  const vacantCard = vacantRoot.querySelector<HTMLElement>('.gssc-contact-card-small')!;
  expect(vacantCard.classList.contains('bg-gssc-light-red')).toBe(true);
  expect(vacantCard.classList.contains('border-gssc-dark-red')).toBe(true);
  expect(
    vacantRoot
      .querySelector('.gssc-contact-card-small__title')!
      .classList.contains('text-gssc-dark-red'),
  ).toBe(true);
  expect(
    vacantRoot
      .querySelector('.gssc-contact-card-small__vacant')!
      .classList.contains('text-gssc-dark-red'),
  ).toBe(true);
});
// @relation(GSSC-PLLR-242, scope=range_end, role=Test)
