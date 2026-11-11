import { TestBed } from '@angular/core/testing';
import { nativeElement, setupPublicComponent } from '../../../test-harness';
import { PromptOverlayView } from '../../modules/prompt-overlay/prompt-overlay';
import { PromptOverlay } from '../prompt-overlay/prompt-overlay';
import { ContactOverlay, contactFormRequest } from './contact-overlay';

async function setupContactOverlay(): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>;
  contactOverlay: ContactOverlay;
  promptOverlay: PromptOverlay;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(PromptOverlayView);
  const contactOverlay = TestBed.inject(ContactOverlay);
  const promptOverlay = TestBed.inject(PromptOverlay);
  promptOverlay.close();
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    contactOverlay,
    promptOverlay,
    root: nativeElement(fixture),
  };
}

async function openContact(
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>,
  contactOverlay: ContactOverlay,
): Promise<HTMLElement> {
  contactOverlay.open();
  fixture.detectChanges();
  await fixture.whenStable();
  return nativeElement(fixture);
}

function fillContactForm(
  root: HTMLElement,
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>,
): void {
  const texts = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '.gssc-prompt-text-field__control',
  );
  expect(texts.length).toBe(3);
  texts[0]!.value = 'Ada Lovelace';
  texts[0]!.dispatchEvent(new Event('input'));
  texts[1]!.value = 'ada@example.com';
  texts[1]!.dispatchEvent(new Event('input'));
  texts[2]!.value = 'Please help with research.';
  texts[2]!.dispatchEvent(new Event('input'));

  const reason = root.querySelector<HTMLSelectElement>(
    '.gssc-prompt-options-list-field__control',
  )!;
  reason.value = 'research';
  reason.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

// @relation(GSSC-PLLR-152, scope=range_start, role=Test)
test('GSSC-PLLR-152 Open', async () => {
  const { fixture, contactOverlay, promptOverlay, root } =
    await setupContactOverlay();
  expect(promptOverlay.isOpen()).toBe(false);
  expect(root.querySelector('.gssc-prompt-overlay')).toBeNull();

  await openContact(fixture, contactOverlay);
  expect(promptOverlay.isOpen()).toBe(true);
  expect(promptOverlay.current()?.title).toBe('Contact');
  expect(contactOverlay.openCount()).toBe(1);
  expect(nativeElement(fixture).querySelector('.gssc-prompt-overlay')).not.toBeNull();
});
// @relation(GSSC-PLLR-152, scope=range_end, role=Test)

// @relation(GSSC-PLLR-153, scope=range_start, role=Test)
test('GSSC-PLLR-153 Semantic', async () => {
  const { fixture, contactOverlay, promptOverlay } = await setupContactOverlay();
  let root = await openContact(fixture, contactOverlay);

  nativeElement(fixture)
    .querySelector<HTMLButtonElement>('.gssc-prompt-button-field')!
    .click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(true);

  fillContactForm(root, fixture);
  nativeElement(fixture)
    .querySelector<HTMLButtonElement>('.gssc-prompt-button-field')!
    .click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(false);

  const request = contactFormRequest();
  expect(request.fields.filter((field) => field.kind !== 'button')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'name', required: true }),
      expect.objectContaining({ id: 'email', required: true }),
      expect.objectContaining({ id: 'reason', required: true }),
      expect.objectContaining({ id: 'content', required: true }),
    ]),
  );
});
// @relation(GSSC-PLLR-153, scope=range_end, role=Test)

// @relation(GSSC-PLLR-154, scope=range_start, role=Test)
test('GSSC-PLLR-154 Syntactic', async () => {
  const { fixture, contactOverlay, promptOverlay, root } =
    await setupContactOverlay();
  expect(root.querySelector('gssc-prompt-form')).toBeNull();

  const openRoot = await openContact(fixture, contactOverlay);
  expect(promptOverlay.isOpen()).toBe(true);
  expect(openRoot.querySelector('.gssc-prompt-overlay')).not.toBeNull();
  expect(openRoot.querySelector('gssc-prompt-form')).not.toBeNull();
  expect(promptOverlay.current()?.title).toBe(contactFormRequest().title);
});
// @relation(GSSC-PLLR-154, scope=range_end, role=Test)

// @relation(GSSC-PLLR-155, scope=range_start, role=Test)
test('GSSC-PLLR-155 Lexical', async () => {
  const { fixture, contactOverlay } = await setupContactOverlay();
  const root = await openContact(fixture, contactOverlay);

  expect(root.querySelector('.gssc-prompt-form__title')?.textContent?.trim()).toBe(
    'Contact',
  );

  const labels = [
    ...root.querySelectorAll(
      '.gssc-prompt-text-field__label, .gssc-prompt-options-list-field__label',
    ),
  ].map((node) => node.textContent?.replace(/\s*\*$/, '').trim());
  expect(labels).toEqual(['Name', 'Email', 'Contact reason', 'Message']);

  const reason = root.querySelector<HTMLSelectElement>(
    '.gssc-prompt-options-list-field__control',
  )!;
  const choices = [...reason.options]
    .filter((option) => option.value !== '')
    .map((option) => option.textContent?.trim());
  expect(choices).toEqual([
    'General inquiry',
    'Membership',
    'Research help',
    'Other',
  ]);

  expect(
    root.querySelector('.gssc-prompt-button-field__label')?.textContent?.trim(),
  ).toBe('Submit');
  expect(root.querySelectorAll('gssc-prompt-text-field').length).toBe(3);
  expect(root.querySelector('gssc-prompt-options-list-field')).not.toBeNull();
  expect(root.querySelector('gssc-prompt-button-field')).not.toBeNull();
});
// @relation(GSSC-PLLR-155, scope=range_end, role=Test)
