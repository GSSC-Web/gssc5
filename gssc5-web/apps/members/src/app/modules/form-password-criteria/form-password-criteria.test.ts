import { Component, signal } from '@angular/core';
import { nativeElement, setupMembersComponent } from '../../../test-harness';
import { FormPasswordCriteria, type PasswordCriterion } from './form-password-criteria';

@Component({
  imports: [FormPasswordCriteria],
  template: `<gssc-form-password-criteria [criteria]="criteria()" />`,
})
class Host {
  criteria = signal<PasswordCriterion[]>([
    { id: 'match', label: 'Passwords Match', satisfied: true },
    { id: 'length', label: 'At Least 8 Characters', satisfied: false },
  ]);
}

async function setup() {
  const fixture = await setupMembersComponent(Host);
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-177, scope=range_start, role=Test)
test('GSSC-MLLR-177 Semantic', async () => {
  const { root } = await setup();
  const rules = [...root.querySelectorAll('.gssc-form-password-criteria__rule')];
  expect(rules).toHaveLength(2);
  expect(rules[0]!.querySelector('.gssc-form-password-criteria__label')?.textContent?.trim()).toBe(
    'Passwords Match',
  );
  expect(rules[0]!.querySelector('.nf-fa-check')).toBeTruthy();
  expect(rules[1]!.querySelector('.nf-fa-times')).toBeTruthy();
});
// @relation(GSSC-MLLR-177, scope=range_end, role=Test)

// @relation(GSSC-MLLR-178, scope=range_start, role=Test)
test('GSSC-MLLR-178 Syntactic', async () => {
  const { root } = await setup();
  const list = root.querySelector('.gssc-form-password-criteria')!;
  expect(list.className).toContain('flex-col');
  const rule = root.querySelector('.gssc-form-password-criteria__rule')!;
  expect(rule.className).toContain('flex');
  expect(rule.className).toContain('items-center');
  const icon = rule.querySelector('.gssc-form-password-criteria__icon')!;
  const label = rule.querySelector('.gssc-form-password-criteria__label')!;
  expect(icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-178, scope=range_end, role=Test)

// @relation(GSSC-MLLR-179, scope=range_start, role=Test)
test('GSSC-MLLR-179 Lexical', async () => {
  const { root } = await setup();
  const match = root.querySelector('[data-criterion="match"]')!;
  const length = root.querySelector('[data-criterion="length"]')!;
  expect(match.className).toContain('text-gssc-dark-green');
  expect(length.className).toContain('text-gssc-dark-red');
  expect(match.querySelector('.nf-fa-check')).toBeTruthy();
  expect(length.querySelector('.nf-fa-times')).toBeTruthy();
});
// @relation(GSSC-MLLR-179, scope=range_end, role=Test)
