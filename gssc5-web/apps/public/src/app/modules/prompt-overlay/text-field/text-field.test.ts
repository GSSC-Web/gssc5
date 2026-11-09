import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptTextField } from './text-field';

@Component({
  imports: [PromptTextField],
  template: `
    <gssc-prompt-text-field
      label="Name"
      [required]="true"
      [enabled]="enabled()"
      [invalid]="invalid()"
      [inputType]="inputType()"
      [multiline]="multiline()"
      [peekable]="peekable()"
      [(value)]="value"
    />
  `,
})
class Host {
  value = signal('');
  enabled = signal(true);
  invalid = signal(false);
  inputType = signal<'text' | 'email' | 'password'>('text');
  multiline = signal(false);
  peekable = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-116, scope=range_start, role=Test)
test('GSSC-PLLR-116 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const input = root.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!;
  expect(input.type).toBe('text');
  expect(root.querySelector('.gssc-prompt-text-field__label')?.textContent).toContain('Name');

  host.value.set('Ada');
  fixture.detectChanges();
  expect(root.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!.value).toBe('Ada');

  host.inputType.set('email');
  fixture.detectChanges();
  expect(root.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!.type).toBe('email');

  host.inputType.set('password');
  host.peekable.set(true);
  fixture.detectChanges();
  expect(root.querySelector<HTMLInputElement>('.gssc-prompt-text-field__control')!.type).toBe(
    'password',
  );

  host.multiline.set(true);
  fixture.detectChanges();
  expect(root.querySelector('textarea.gssc-prompt-text-field__control')).not.toBeNull();
  expect(root.querySelector<HTMLTextAreaElement>('.gssc-prompt-text-field__control')!.value).toBe(
    'Ada',
  );

  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector<HTMLTextAreaElement>('.gssc-prompt-text-field__control')!.disabled).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-116, scope=range_end, role=Test)

// @relation(GSSC-PLLR-117, scope=range_start, role=Test)
test('GSSC-PLLR-117 Syntactic', async () => {
  const { root } = await setup();
  const field = root.querySelector<HTMLElement>('.gssc-prompt-text-field')!;
  const label = root.querySelector<HTMLElement>('.gssc-prompt-text-field__label')!;
  expect(label.classList.contains('absolute')).toBe(true);
  expect(label.classList.contains('-top-2')).toBe(true);
  expect(label.classList.contains('start-2')).toBe(true);
  expect(field.contains(label)).toBe(true);
});
// @relation(GSSC-PLLR-117, scope=range_end, role=Test)

// @relation(GSSC-PLLR-118, scope=range_start, role=Test)
test('GSSC-PLLR-118 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const field = root.querySelector<HTMLElement>('.gssc-prompt-text-field')!;
  const label = root.querySelector<HTMLElement>('.gssc-prompt-text-field__label')!;
  expect(field.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(field.classList.contains('bg-gssc-white')).toBe(true);
  expect(label.classList.contains('italic')).toBe(true);
  expect(label.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(field.classList.contains('font-sans')).toBe(true);

  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-text-field')!.classList.contains('bg-gssc-gray')).toBe(
    true,
  );

  host.enabled.set(true);
  host.invalid.set(true);
  fixture.detectChanges();
  const invalidField = root.querySelector<HTMLElement>('.gssc-prompt-text-field')!;
  expect(invalidField.classList.contains('border-red-500')).toBe(true);
  expect(root.querySelector('.gssc-prompt-text-field__label')!.classList.contains('text-red-500')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-118, scope=range_end, role=Test)
