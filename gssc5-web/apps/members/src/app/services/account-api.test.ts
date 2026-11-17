import {
  accountApi,
  accountPhotoUrl,
  accountPhotosTreaty,
  evaluatePasswordCriteria,
  isValidEmail,
  isValidPhone,
  isValidState,
  isValidZip5,
  passwordCriteriaSatisfied,
  PASSWORD_MIN_LENGTH,
  validateMemberInfoFields,
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

test('format validators accept and reject account field values', () => {
  expect(isValidEmail('ada@example.com')).toBe(true);
  expect(isValidEmail('bad')).toBe(false);
  expect(isValidPhone('555-0100')).toBe(true);
  expect(isValidPhone('x')).toBe(false);
  expect(isValidZip5('12345')).toBe(true);
  expect(isValidZip5('12')).toBe(false);
  expect(isValidState('CA')).toBe(true);
  expect(isValidState('California')).toBe(false);
});

test('validateMemberInfoFields flags empty required and bad formats', () => {
  const failed = validateMemberInfoFields({
    firstName: '',
    lastName: 'Lovelace',
    primaryEmail: 'bad',
    secondaryEmail: '',
    primaryPhone: '555-0100',
    secondaryPhone: '',
    preferredContactMethod: 'Email',
    homeLine1: '1 Way',
    homeCity: 'London',
    homeState: 'EN',
    homeZip: '12345',
    homeZipExtension: '',
    mailingLine1: '1 Way',
    mailingCity: 'London',
    mailingState: 'EN',
    mailingZip: '12345',
    mailingZipExtension: '',
  });
  expect(failed.has('firstName')).toBe(true);
  expect(failed.has('primaryEmail')).toBe(true);
});

test('accountPhotoUrl builds dedicated account-photos GET path', () => {
  expect(accountPhotoUrl('abc')).toBe('http://localhost:3000/account-photos/abc');
  expect(accountPhotoUrl('')).toBeNull();
});

test('uploadAccountPhoto posts file + userCuid through Eden Treaty', async () => {
  const originalPost = accountPhotosTreaty.post;
  let seenFile: File | null = null;
  let seenUserCuid: string | null = null;
  accountPhotosTreaty.post = (async (body: { file: File; userCuid: string }) => {
    seenFile = body.file;
    seenUserCuid = body.userCuid;
    return {
      data: { cuid: body.userCuid, path: `account-photos/${body.userCuid}` },
      error: null,
    };
  }) as typeof accountPhotosTreaty.post;

  try {
    const file = new File([new Uint8Array([1])], 'avatar.png', { type: 'image/png' });
    const result = await accountApi.uploadAccountPhoto(file, 'user_42');
    expect(seenUserCuid).toBe('user_42');
    expect(seenFile).toBe(file);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ cuid: 'user_42', path: 'account-photos/user_42' });
  } finally {
    accountPhotosTreaty.post = originalPost;
  }
});
