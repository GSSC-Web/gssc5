import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptSelectField } from './select-field';

@Component({
  imports: [PromptSelectField],
  template: `
    <gssc-prompt-select-field
      label="Notify"
      [required]="true"
      [enabled]="enabled()"
      [invalid]="invalid()"
      [(value)]="value"
    />
  `,
})
class Host {
  value = signal(false);
  enabled = signal(true);
  invalid = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-119, scope=range_start, role=Test)
test('GSSC-PLLR-119 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const control = root.querySelector<HTMLButtonElement>('.gssc-prompt-select-field')!;
  expect(control.getAttribute('aria-pressed')).toBe('false');

  host.value.set(true);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-select-field')!.getAttribute('aria-pressed')).toBe('true');

  control.click();
  fixture.detectChanges();
  expect(host.value()).toBe(false);
  expect(root.querySelector('.gssc-prompt-select-field__label')?.textContent).toContain('Notify');
  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector<HTMLButtonElement>('.gssc-prompt-select-field')!.disabled).toBe(true);
});
// @relation(GSSC-PLLR-119, scope=range_end, role=Test)

// @relation(GSSC-PLLR-120, scope=range_start, role=Test)
test('GSSC-PLLR-120 Syntactic', async () => {
  const { root } = await setup();
  const control = root.querySelector<HTMLElement>('.gssc-prompt-select-field')!;
  const label = root.querySelector('.gssc-prompt-select-field__label')!;
  expect(control.contains(label)).toBe(true);
});
// @relation(GSSC-PLLR-120, scope=range_end, role=Test)

// @relation(GSSC-PLLR-121, scope=range_start, role=Test)
test('GSSC-PLLR-121 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const control = root.querySelector<HTMLElement>('.gssc-prompt-select-field')!;
  const label = root.querySelector<HTMLElement>('.gssc-prompt-select-field__label')!;
  expect(control.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(control.classList.contains('bg-gssc-white')).toBe(true);
  expect(label.classList.contains('font-normal')).toBe(true);
  host.invalid.set(true);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-select-field')!.classList.contains('border-red-500')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-121, scope=range_end, role=Test)
