import { Component, signal } from '@angular/core';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { FormTextField } from './form-text-field';

@Component({
  imports: [FormTextField],
  template: `
    <gssc-form-text-field
      [label]="label()"
      [required]="required()"
      [enabled]="enabled()"
      [inputType]="inputType()"
      [invalid]="invalid()"
      [(value)]="value"
    />
  `,
})
class Host {
  label = signal('First Name');
  required = signal(true);
  enabled = signal(true);
  invalid = signal(false);
  inputType = signal<'text' | 'email' | 'password' | 'tel'>('text');
  value = signal('');
}

async function setup() {
  const fixture = await setupMembersComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-168, scope=range_start, role=Test)
test('GSSC-MLLR-168 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const label = root.querySelector('.gssc-form-text-field__label')!;
  expect(label.textContent).toContain('First Name');
  expect(label.textContent).toContain('*');
  const input = root.querySelector<HTMLInputElement>('.gssc-form-text-field__control')!;
  input.value = 'Ada';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  expect(host.value()).toBe('Ada');

  host.required.set(false);
  fixture.detectChanges();
  expect(root.querySelector('.gssc-form-text-field__label')!.textContent).not.toContain('*');

  host.invalid.set(true);
  fixture.detectChanges();
  expect(
    root.querySelector<HTMLInputElement>('.gssc-form-text-field__control')!.getAttribute(
      'aria-invalid',
    ),
  ).toBe('true');
});
// @relation(GSSC-MLLR-168, scope=range_end, role=Test)

// @relation(GSSC-MLLR-169, scope=range_start, role=Test)
test('GSSC-MLLR-169 Syntactic', async () => {
  const { root } = await setup();
  const field = root.querySelector('.gssc-form-text-field')!;
  const label = root.querySelector('.gssc-form-text-field__label')!;
  expect(field.className).toContain('w-full');
  expect(label.className).toContain('absolute');
  expect(label.className).toContain('-top-2');
});
// @relation(GSSC-MLLR-169, scope=range_end, role=Test)

// @relation(GSSC-MLLR-170, scope=range_start, role=Test)
test('GSSC-MLLR-170 Lexical', async () => {
  const { fixture, host, root } = await setup();
  const field = root.querySelector('.gssc-form-text-field')!;
  const label = root.querySelector('.gssc-form-text-field__label')!;
  const control = root.querySelector('.gssc-form-text-field__control')!;
  expect(field.className).toContain('rounded-md');
  expect(field.className).toContain('border-gssc-dark-green');
  expect(field.className).toContain('bg-gssc-white');
  expect(label.className).toContain('font-extralight');
  expect(label.className).toContain('italic');
  expect(label.className).toContain('text-gssc-dark-green');
  expect(control.className).toContain('font-sans');
  expect(control.className).toContain('text-gssc-dark-green');

  host.invalid.set(true);
  fixture.detectChanges();
  expect(field.className).toContain('border-gssc-dark-red');
  expect(field.className).toContain('bg-gssc-light-red');
  expect(field.className).not.toContain('border-gssc-dark-green');
  expect(control.getAttribute('aria-invalid')).toBe('true');
});
// @relation(GSSC-MLLR-170, scope=range_end, role=Test)
