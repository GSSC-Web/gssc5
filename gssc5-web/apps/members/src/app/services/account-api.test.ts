import {
  evaluatePasswordCriteria,
  passwordCriteriaSatisfied,
  PASSWORD_MIN_LENGTH,
} from './account-api';

test('evaluatePasswordCriteria reports each rule', () => {
  const weak = evaluatePasswordCriteria('short', 'other');
  expect(weak.match).toBe(false);
  expect(weak.length).toBe(false);
  expect(weak.lower).toBe(true);
  expect(weak.upper).toBe(false);
  expect(weak.number).toBe(false);
  expect(weak.special).toBe(false);

  const strong = evaluatePasswordCriteria('Abcdef1!', 'Abcdef1!');
  expect(passwordCriteriaSatisfied(strong)).toBe(true);
  expect(strong.length).toBe(true);
  expect(PASSWORD_MIN_LENGTH).toBe(8);
});
