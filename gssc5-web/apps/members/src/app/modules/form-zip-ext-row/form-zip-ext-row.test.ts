import { Component, signal } from '@angular/core';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { FormZipExtRow } from './form-zip-ext-row';

@Component({
  imports: [FormZipExtRow],
  template: `
    <gssc-form-zip-ext-row
      [(zip)]="zip"
      [(zipExtension)]="zipExtension"
      [zipRequired]="true"
    />
  `,
})
class Host {
  zip = signal('');
  zipExtension = signal('');
}

async function setup() {
  const fixture = await setupMembersComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-174, scope=range_start, role=Test)
test('GSSC-MLLR-174 Semantic', async () => {
  const { fixture, host, root } = await setup();
  const labels = [...root.querySelectorAll('.gssc-form-text-field__label')].map(
    (el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
  expect(labels.some((t) => t.startsWith('Zip') && t.includes('*'))).toBe(true);
  expect(labels.some((t) => t.includes('Zip Extension'))).toBe(true);
  expect(root.querySelector('.gssc-form-zip-ext-row__plus')?.textContent?.trim()).toBe('+');

  const zipInput = root.querySelector<HTMLInputElement>('#gssc-form-zip')!;
  const extInput = root.querySelector<HTMLInputElement>('#gssc-form-zip-ext')!;
  zipInput.value = '95350';
  zipInput.dispatchEvent(new Event('input'));
  extInput.value = '1234';
  extInput.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  expect(host.zip()).toBe('95350');
  expect(host.zipExtension()).toBe('1234');
});
// @relation(GSSC-MLLR-174, scope=range_end, role=Test)

// @relation(GSSC-MLLR-175, scope=range_start, role=Test)
test('GSSC-MLLR-175 Syntactic', async () => {
  const { root } = await setup();
  const row = root.querySelector('.gssc-form-zip-ext-row')!;
  expect(row.className).toContain('flex');
  expect(row.className).toContain('items-center');
  expect(row.className).toContain('w-full');
  const plus = root.querySelector('.gssc-form-zip-ext-row__plus')!;
  const zipHost = root.querySelector('.gssc-form-zip-ext-row__zip')!;
  const extHost = root.querySelector('.gssc-form-zip-ext-row__ext')!;
  expect(zipHost.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(plus.compareDocumentPosition(extHost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-175, scope=range_end, role=Test)

// @relation(GSSC-MLLR-176, scope=range_start, role=Test)
test('GSSC-MLLR-176 Lexical', async () => {
  const { root } = await setup();
  const fields = root.querySelectorAll('.gssc-form-text-field');
  expect(fields.length).toBe(2);
  for (const field of fields) {
    expect(field.className).toContain('border-gssc-dark-green');
    expect(field.className).toContain('rounded-md');
  }
  const plus = root.querySelector('.gssc-form-zip-ext-row__plus')!;
  expect(plus.className).toContain('font-sans');
  expect(plus.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-176, scope=range_end, role=Test)
