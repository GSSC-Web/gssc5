import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptOptionsField } from './options-field';

@Component({
  imports: [PromptOptionsField],
  template: `
    <gssc-prompt-options-field
      label="Color"
      [choices]="choices"
      [required]="true"
      [enabled]="enabled()"
      [invalid]="invalid()"
      [(value)]="value"
    />
  `,
})
class Host {
  choices = [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
  ];
  value = signal('');
  enabled = signal(true);
  invalid = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-122, scope=range_start, role=Test)
test('GSSC-PLLR-122 Semantic', async () => {
  const { fixture, host, root } = await setup();
  expect(root.querySelectorAll('input[type="radio"]').length).toBe(2);
  expect(root.querySelector('.gssc-prompt-options-field__label')?.textContent).toContain('Color');
  root.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!.click();
  fixture.detectChanges();
  expect(host.value()).toBe('blue');
  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector('fieldset')!.disabled).toBe(true);
});
// @relation(GSSC-PLLR-122, scope=range_end, role=Test)

// @relation(GSSC-PLLR-123, scope=range_start, role=Test)
test('GSSC-PLLR-123 Syntactic', async () => {
  const { root } = await setup();
  expect(root.querySelector('.gssc-prompt-options-field__label')).not.toBeNull();
  expect(root.querySelector('.gssc-prompt-options-field__choice')).not.toBeNull();
});
// @relation(GSSC-PLLR-123, scope=range_end, role=Test)

// @relation(GSSC-PLLR-124, scope=range_start, role=Test)
test('GSSC-PLLR-124 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const field = root.querySelector<HTMLElement>('.gssc-prompt-options-field')!;
  const label = root.querySelector<HTMLElement>('.gssc-prompt-options-field__label')!;
  expect(field.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(field.classList.contains('bg-gssc-white')).toBe(true);
  expect(label.classList.contains('italic')).toBe(true);
  host.invalid.set(true);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-options-field')!.classList.contains('border-red-500')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-124, scope=range_end, role=Test)
