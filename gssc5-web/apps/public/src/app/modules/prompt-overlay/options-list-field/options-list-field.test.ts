import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptOptionsListField } from './options-list-field';

@Component({
  imports: [PromptOptionsListField],
  template: `
    <gssc-prompt-options-list-field
      label="Reason"
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
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];
  value = signal('');
  enabled = signal(true);
  invalid = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-131, scope=range_start, role=Test)
test('GSSC-PLLR-131 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const select = root.querySelector<HTMLSelectElement>('.gssc-prompt-options-list-field__control')!;
  expect(select.options.length).toBeGreaterThan(2);
  expect(root.querySelector('.gssc-prompt-options-list-field__label')?.textContent).toContain(
    'Reason',
  );

  host.value.set('a');
  fixture.detectChanges();
  expect(
    root.querySelector<HTMLSelectElement>('.gssc-prompt-options-list-field__control')!.value,
  ).toBe('a');

  select.value = 'b';
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  expect(host.value()).toBe('b');
  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector<HTMLSelectElement>('.gssc-prompt-options-list-field__control')!.disabled).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-131, scope=range_end, role=Test)

// @relation(GSSC-PLLR-132, scope=range_start, role=Test)
test('GSSC-PLLR-132 Syntactic', async () => {
  const { root } = await setup();
  const label = root.querySelector<HTMLElement>('.gssc-prompt-options-list-field__label')!;
  expect(label.classList.contains('absolute')).toBe(true);
  expect(label.classList.contains('-top-2')).toBe(true);
});
// @relation(GSSC-PLLR-132, scope=range_end, role=Test)

// @relation(GSSC-PLLR-133, scope=range_start, role=Test)
test('GSSC-PLLR-133 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const field = root.querySelector<HTMLElement>('.gssc-prompt-options-list-field')!;
  expect(field.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(field.classList.contains('bg-gssc-white')).toBe(true);
  expect(
    root.querySelector('.gssc-prompt-options-list-field__label')!.classList.contains('italic'),
  ).toBe(true);
  host.invalid.set(true);
  fixture.detectChanges();
  expect(
    root.querySelector('.gssc-prompt-options-list-field')!.classList.contains('border-gssc-dark-red'),
  ).toBe(true);
});
// @relation(GSSC-PLLR-133, scope=range_end, role=Test)
