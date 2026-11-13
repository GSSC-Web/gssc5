import { TestBed } from '@angular/core/testing';
import { nativeElement, setupPublicComponent } from '../../../test-harness';
import { PromptOverlayView } from '../../modules/prompt-overlay/prompt-overlay';
import { MemberSession } from '../member-session';
import { PromptOverlay } from '../prompt-overlay/prompt-overlay';
import { ContactOverlay, contactFormRequest } from './contact-overlay';

async function setupContactOverlay(): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>;
  contactOverlay: ContactOverlay;
  promptOverlay: PromptOverlay;
  memberSession: MemberSession;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(PromptOverlayView);
  const contactOverlay = TestBed.inject(ContactOverlay);
  const promptOverlay = TestBed.inject(PromptOverlay);
  const memberSession = TestBed.inject(MemberSession);
  // Reset local UI session without backend (logout only clears after successful end).
  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
    globalThis.localStorage?.removeItem('gssc.memberEmailAddress');
  } catch {
    // ignore
  }
  memberSession.loggedIn.set(false);
  memberSession.displayName.set('');
  memberSession.emailAddress.set('');
  memberSession.isAdministrator.set(false);
  promptOverlay.close();
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    contactOverlay,
    promptOverlay,
    memberSession,
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

// @relation(GSSC-PLLR-155, scope=range_start, role=Test)
test('GSSC-PLLR-155 Open', async () => {
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
// @relation(GSSC-PLLR-155, scope=range_end, role=Test)

// @relation(GSSC-PLLR-156, scope=range_start, role=Test)
test('GSSC-PLLR-156 Semantic', async () => {
  const { fixture, contactOverlay, promptOverlay, memberSession } =
    await setupContactOverlay();
  let root = await openContact(fixture, contactOverlay);

  const reason = root.querySelector<HTMLSelectElement>(
    '.gssc-prompt-options-list-field__control',
  )!;
  expect(reason.value).toBe('general');

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
      expect.objectContaining({
        id: 'reason',
        required: true,
        default: 'general',
      }),
      expect.objectContaining({ id: 'content', required: true }),
    ]),
  );

  memberSession.setSession('Ada Lovelace');
  memberSession.setEmailAddress('ada@example.com');
  root = await openContact(fixture, contactOverlay);
  const texts = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '.gssc-prompt-text-field__control',
  );
  expect(texts[0]!.value).toBe('Ada Lovelace');
  expect(texts[1]!.value).toBe('ada@example.com');
  expect(
    root.querySelector<HTMLSelectElement>('.gssc-prompt-options-list-field__control')!
      .value,
  ).toBe('general');
});
// @relation(GSSC-PLLR-156, scope=range_end, role=Test)

// @relation(GSSC-PLLR-157, scope=range_start, role=Test)
test('GSSC-PLLR-157 Syntactic', async () => {
  const { fixture, contactOverlay, promptOverlay, root } =
    await setupContactOverlay();
  expect(root.querySelector('gssc-prompt-form')).toBeNull();

  const openRoot = await openContact(fixture, contactOverlay);
  expect(promptOverlay.isOpen()).toBe(true);
  expect(openRoot.querySelector('.gssc-prompt-overlay')).not.toBeNull();
  expect(openRoot.querySelector('gssc-prompt-form')).not.toBeNull();
  expect(promptOverlay.current()?.title).toBe(contactFormRequest().title);
});
// @relation(GSSC-PLLR-157, scope=range_end, role=Test)

// @relation(GSSC-PLLR-158, scope=range_start, role=Test)
test('GSSC-PLLR-158 Lexical', async () => {
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
    'General Inquiry',
    'Membership',
    'Research Help',
    'Website Issue',
    'Other',
  ]);

  expect(
    root.querySelector('.gssc-prompt-button-field__label')?.textContent?.trim(),
  ).toBe('Submit');
  expect(root.querySelectorAll('gssc-prompt-text-field').length).toBe(3);
  expect(root.querySelector('gssc-prompt-options-list-field')).not.toBeNull();
  expect(root.querySelector('gssc-prompt-button-field')).not.toBeNull();
});
// @relation(GSSC-PLLR-158, scope=range_end, role=Test)
