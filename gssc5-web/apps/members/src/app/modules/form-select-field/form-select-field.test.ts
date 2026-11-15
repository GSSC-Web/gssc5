import { Component, signal } from '@angular/core';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { FormSelectField, type FormSelectOption } from './form-select-field';

const options: FormSelectOption[] = [
  { value: 'Email', label: 'Email' },
  { value: 'Phone', label: 'Phone' },
  { value: 'None', label: 'None' },
];

@Component({
  imports: [FormSelectField],
  template: `
    <gssc-form-select-field
      [label]="label()"
      [options]="options"
      [required]="required()"
      [(value)]="value"
    />
  `,
})
class Host {
  label = signal('Preferred Contact');
  required = signal(true);
  options = options;
  value = signal('None');
}

async function setup() {
  const fixture = await setupMembersComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-171, scope=range_start, role=Test)
test('GSSC-MLLR-171 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const label = root.querySelector('.gssc-form-select-field__label')!;
  expect(label.textContent).toContain('Preferred Contact');
  expect(label.textContent).toContain('*');
  const select = root.querySelector<HTMLSelectElement>('.gssc-form-select-field__control')!;
  expect([...select.options].map((o) => o.value)).toEqual(['Email', 'Phone', 'None']);
  select.value = 'Email';
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  expect(host.value()).toBe('Email');
});
// @relation(GSSC-MLLR-171, scope=range_end, role=Test)

// @relation(GSSC-MLLR-172, scope=range_start, role=Test)
test('GSSC-MLLR-172 Syntactic', async () => {
  const { root } = await setup();
  const field = root.querySelector('.gssc-form-select-field')!;
  const label = root.querySelector('.gssc-form-select-field__label')!;
  expect(field.className).toContain('w-full');
  expect(label.className).toContain('absolute');
  expect(label.className).toContain('-top-2');
});
// @relation(GSSC-MLLR-172, scope=range_end, role=Test)

// @relation(GSSC-MLLR-173, scope=range_start, role=Test)
test('GSSC-MLLR-173 Lexical', async () => {
  const { root } = await setup();
  const field = root.querySelector('.gssc-form-select-field')!;
  const label = root.querySelector('.gssc-form-select-field__label')!;
  const control = root.querySelector('.gssc-form-select-field__control')!;
  expect(field.className).toContain('rounded-md');
  expect(field.className).toContain('border-gssc-dark-green');
  expect(field.className).toContain('bg-gssc-white');
  expect(label.className).toContain('font-extralight');
  expect(label.className).toContain('italic');
  expect(control.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-173, scope=range_end, role=Test)
