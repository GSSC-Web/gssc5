import { Component, signal } from '@angular/core';
import { nativeElement, setupPublicComponent } from '../../../../test-harness';
import { PromptFileField } from './file-field';

@Component({
  imports: [PromptFileField],
  template: `
    <gssc-prompt-file-field
      label="Attachment"
      [required]="true"
      [enabled]="enabled()"
      [invalid]="invalid()"
      [(value)]="value"
    />
  `,
})
class Host {
  value = signal<File | null>(null);
  enabled = signal(true);
  invalid = signal(false);
}

async function setup() {
  const fixture = await setupPublicComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-128, scope=range_start, role=Test)
test('GSSC-PLLR-128 Semantic', async () => {
  const { fixture, host, root } = await setup();
  expect(root.querySelector('input[type="file"]')).not.toBeNull();
  expect(root.querySelector('.gssc-prompt-file-field__label')?.textContent).toContain('Attachment');
  host.enabled.set(false);
  fixture.detectChanges();
  expect(root.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(true);
});
// @relation(GSSC-PLLR-128, scope=range_end, role=Test)

// @relation(GSSC-PLLR-129, scope=range_start, role=Test)
test('GSSC-PLLR-129 Syntactic', async () => {
  const { root } = await setup();
  const label = root.querySelector<HTMLElement>('.gssc-prompt-file-field__label')!;
  expect(label.classList.contains('absolute')).toBe(true);
  expect(label.classList.contains('-top-2')).toBe(true);
});
// @relation(GSSC-PLLR-129, scope=range_end, role=Test)

// @relation(GSSC-PLLR-130, scope=range_start, role=Test)
test('GSSC-PLLR-130 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const field = root.querySelector<HTMLElement>('.gssc-prompt-file-field')!;
  expect(field.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(field.classList.contains('bg-gssc-white')).toBe(true);
  expect(root.querySelector('.gssc-prompt-file-field__label')!.classList.contains('italic')).toBe(
    true,
  );
  host.invalid.set(true);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-prompt-file-field')!.classList.contains('border-red-500')).toBe(
    true,
  );
});
// @relation(GSSC-PLLR-130, scope=range_end, role=Test)
