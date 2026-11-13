import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptButtonField } from './button-field';

@Component({
  imports: [PromptButtonField],
  template: `
    <gssc-prompt-button-field
      label="Submit"
      [role]="role()"
      [enabled]="enabled()"
      [invalid]="invalid()"
      (activate)="activated = true"
    />
  `,
})
class Host {
  activated = false;
  role = signal<'submit' | 'action'>('submit');
  enabled = signal(true);
  invalid = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-125, scope=range_start, role=Test)
test('GSSC-PLLR-125 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const button = root.querySelector<HTMLButtonElement>('.gssc-prompt-button-field')!;
  expect(button.type).toBe('submit');
  expect(button.textContent).toContain('Submit');
  button.click();
  fixture.detectChanges();
  expect(host.activated).toBe(true);
  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector<HTMLButtonElement>('.gssc-prompt-button-field')!.disabled).toBe(true);
});
// @relation(GSSC-PLLR-125, scope=range_end, role=Test)

// @relation(GSSC-PLLR-126, scope=range_start, role=Test)
test('GSSC-PLLR-126 Syntactic', async () => {
  const { root } = await setup();
  const button = root.querySelector('.gssc-prompt-button-field')!;
  expect(button.querySelector('.gssc-prompt-button-field__label')).not.toBeNull();
});
// @relation(GSSC-PLLR-126, scope=range_end, role=Test)

// @relation(GSSC-PLLR-127, scope=range_start, role=Test)
test('GSSC-PLLR-127 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const button = root.querySelector<HTMLElement>('.gssc-prompt-button-field')!;
  expect(button.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(button.classList.contains('bg-gssc-white')).toBe(true);
  expect(button.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(button.classList.contains('font-normal')).toBe(true);
  host.invalid.set(true);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-button-field')!.classList.contains('border-gssc-dark-red')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-127, scope=range_end, role=Test)
