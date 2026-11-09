import { TestBed } from '@angular/core/testing';
import { nativeElement, setupPublicComponent } from '../../../test-harness';
import {
  PromptOverlay,
  type PromptFieldConfig,
  type PromptRequest,
} from '../../services/prompt-overlay/prompt-overlay';
import { PromptOverlayView } from './prompt-overlay';

const sampleFields: PromptFieldConfig[] = [
  { kind: 'text', id: 'name', label: 'Name', required: true },
  { kind: 'button', id: 'go', label: 'Submit', role: 'submit' },
];

function request(overrides: Partial<PromptRequest> = {}): PromptRequest {
  return { title: 'Sample prompt', fields: sampleFields, ...overrides };
}

async function setupOverlay(): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>;
  promptOverlay: PromptOverlay;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(PromptOverlayView);
  const promptOverlay = TestBed.inject(PromptOverlay);
  promptOverlay.close();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, promptOverlay, root: nativeElement(fixture) };
}

async function openWith(
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayView>>>,
  promptOverlay: PromptOverlay,
  req: PromptRequest = request(),
): Promise<HTMLElement> {
  promptOverlay.enqueue(req);
  fixture.detectChanges();
  await fixture.whenStable();
  return nativeElement(fixture);
}

// @relation(GSSC-PLLR-107, scope=range_start, role=Test)
test('GSSC-PLLR-107 Semantic', async () => {
  const { fixture, promptOverlay, root } = await setupOverlay();
  expect(root.querySelector('.gssc-prompt-overlay')).toBeNull();

  let submitted: Record<string, unknown> | null = null;
  const openRoot = await openWith(fixture, promptOverlay, {
    title: 'Sample prompt',
    fields: sampleFields,
    onSubmit: (values) => {
      submitted = values;
    },
  });
  expect(openRoot.querySelector('.gssc-prompt-overlay')).not.toBeNull();
  expect(openRoot.querySelector('gssc-prompt-form')).not.toBeNull();
  const first = openRoot.querySelector<HTMLElement>(
    'input, textarea, select, button.gssc-prompt-button-field',
  );
  expect(document.activeElement).toBe(first);

  const name = openRoot.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!;
  name.value = 'Ada';
  name.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  openRoot.querySelector<HTMLButtonElement>('.gssc-prompt-button-field')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(submitted).toEqual({ name: 'Ada' });
  expect(promptOverlay.isOpen()).toBe(false);

  await openWith(fixture, promptOverlay, request());
  expect(promptOverlay.isOpen()).toBe(true);
  promptOverlay.enqueue(
    request({ title: 'Next', fields: [{ kind: 'text', id: 'b', label: 'B' }] }),
  );
  nativeElement(fixture).querySelector<HTMLButtonElement>('.gssc-prompt-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(true);
  expect(promptOverlay.current()?.fields[0]?.id).toBe('b');
});
// @relation(GSSC-PLLR-107, scope=range_end, role=Test)

// @relation(GSSC-PLLR-108, scope=range_start, role=Test)
test('GSSC-PLLR-108 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const shell = root.querySelector<HTMLElement>('.gssc-prompt-overlay')!;
  const panel = root.querySelector<HTMLElement>('.gssc-prompt-overlay__panel')!;
  expect(shell.classList.contains('fixed')).toBe(true);
  expect(shell.classList.contains('inset-0')).toBe(true);
  expect(shell.classList.contains('flex')).toBe(true);
  expect(shell.classList.contains('items-center')).toBe(true);
  expect(shell.classList.contains('justify-center')).toBe(true);
  expect(panel.classList.contains('overflow-auto')).toBe(true);
  expect(panel.classList.contains('h-dvh')).toBe(true);
  expect(panel.classList.contains('w-dvw')).toBe(true);
  expect(panel.classList.contains('sm:max-h-[75dvh]')).toBe(true);
  expect(panel.classList.contains('sm:max-w-[75vw]')).toBe(true);
});
// @relation(GSSC-PLLR-108, scope=range_end, role=Test)

// @relation(GSSC-PLLR-109, scope=range_start, role=Test)
test('GSSC-PLLR-109 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const shell = root.querySelector<HTMLElement>('.gssc-prompt-overlay')!;
  const panel = root.querySelector<HTMLElement>('.gssc-prompt-overlay__panel')!;
  expect(shell.classList.contains('bg-gssc-gray/25')).toBe(true);
  expect(shell.classList.contains('font-sans')).toBe(true);
  expect(shell.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(panel.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-109, scope=range_end, role=Test)

// @relation(GSSC-PLLR-110, scope=range_start, role=Test)
test('GSSC-PLLR-110 Semantic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  let cancelled = false;
  const root = await openWith(fixture, promptOverlay, {
    title: 'Cancel me',
    fields: sampleFields,
    onCancel: () => {
      cancelled = true;
    },
  });
  root.querySelector<HTMLElement>('.gssc-prompt-overlay')!.click();
  fixture.detectChanges();
  expect(promptOverlay.isOpen()).toBe(true);

  root.querySelector<HTMLButtonElement>('.gssc-prompt-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(cancelled).toBe(true);
  expect(promptOverlay.isOpen()).toBe(false);

  await openWith(fixture, promptOverlay);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(false);
});
// @relation(GSSC-PLLR-110, scope=range_end, role=Test)

// @relation(GSSC-PLLR-111, scope=range_start, role=Test)
test('GSSC-PLLR-111 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const header = root.querySelector<HTMLElement>('.gssc-prompt-overlay__header')!;
  const dismiss = root.querySelector<HTMLElement>('.gssc-prompt-overlay__dismiss')!;
  expect(header.classList.contains('justify-between')).toBe(true);
  expect(header.contains(dismiss)).toBe(true);
  expect(dismiss.classList.contains('shrink-0')).toBe(true);
});
// @relation(GSSC-PLLR-111, scope=range_end, role=Test)

// @relation(GSSC-PLLR-112, scope=range_start, role=Test)
test('GSSC-PLLR-112 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const dismiss = root.querySelector<HTMLElement>('.gssc-prompt-overlay__dismiss')!;
  expect(dismiss.classList.contains('bg-transparent')).toBe(true);
  expect(dismiss.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(dismiss.classList.contains('rounded')).toBe(true);
  expect(dismiss.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(dismiss.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-112, scope=range_end, role=Test)

// @relation(GSSC-PLLR-113, scope=range_start, role=Test)
test('GSSC-PLLR-113 Semantic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay, {
    title: 'Configured title',
    fields: [
      { kind: 'text', id: 'a', label: 'A', default: 'Prefill' },
      {
        kind: 'options-list',
        id: 'b',
        label: 'B',
        choices: [{ value: '1', label: 'One' }],
        default: '1',
      },
      { kind: 'select', id: 's', label: 'S', default: true },
      { kind: 'button', id: 'c', label: 'Go', role: 'submit' },
    ],
  });
  const form = root.querySelector('gssc-prompt-form')!;
  expect(form.querySelector('gssc-prompt-text-field')).not.toBeNull();
  expect(form.querySelector('gssc-prompt-options-list-field')).not.toBeNull();
  expect(form.querySelector('gssc-prompt-button-field')).not.toBeNull();
  expect(root.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!.value).toBe(
    'Prefill',
  );
  expect(
    root.querySelector<HTMLSelectElement>('.gssc-prompt-options-list-field__control')!.value,
  ).toBe('1');
  expect(root.querySelector('.gssc-prompt-select-field')!.getAttribute('aria-pressed')).toBe('true');
});
// @relation(GSSC-PLLR-113, scope=range_end, role=Test)

// @relation(GSSC-PLLR-114, scope=range_start, role=Test)
test('GSSC-PLLR-114 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const form = root.querySelector<HTMLElement>('.gssc-prompt-form')!;
  expect(form.classList.contains('grid')).toBe(true);
  expect(form.classList.contains('grid-cols-1')).toBe(true);
  expect(form.classList.contains('sm:grid-cols-2')).toBe(true);
});
// @relation(GSSC-PLLR-114, scope=range_end, role=Test)

// @relation(GSSC-PLLR-115, scope=range_start, role=Test)
test('GSSC-PLLR-115 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const form = root.querySelector<HTMLElement>('.gssc-prompt-form')!;
  const panel = root.querySelector<HTMLElement>('.gssc-prompt-overlay__panel')!;
  expect(form.classList.contains('font-sans')).toBe(true);
  expect(form.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(panel.classList.contains('font-sans') || form.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-115, scope=range_end, role=Test)

// @relation(GSSC-PLLR-134, scope=range_start, role=Test)
test('GSSC-PLLR-134 Semantic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay, request({ title: 'Ask the society' }));
  expect(root.querySelector('.gssc-prompt-form__title')?.textContent?.trim()).toBe(
    'Ask the society',
  );
});
// @relation(GSSC-PLLR-134, scope=range_end, role=Test)

// @relation(GSSC-PLLR-135, scope=range_start, role=Test)
test('GSSC-PLLR-135 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const header = root.querySelector<HTMLElement>('.gssc-prompt-overlay__header')!;
  const title = root.querySelector<HTMLElement>('.gssc-prompt-form__title')!;
  const dismiss = root.querySelector<HTMLElement>('.gssc-prompt-overlay__dismiss')!;
  expect(header.contains(title)).toBe(true);
  expect(header.contains(dismiss)).toBe(true);
  expect(title.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-135, scope=range_end, role=Test)

// @relation(GSSC-PLLR-136, scope=range_start, role=Test)
test('GSSC-PLLR-136 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openWith(fixture, promptOverlay);
  const title = root.querySelector<HTMLElement>('.gssc-prompt-form__title')!;
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('font-medium')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-136, scope=range_end, role=Test)
