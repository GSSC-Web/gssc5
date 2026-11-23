import {
  directoryDisplayName,
  directoryHasUsableName,
  directoryIsDeleted,
  toContactRowContents,
  toDirectoryQuery,
} from './directory-api';

test('toDirectoryQuery drops blank filters', () => {
  expect(toDirectoryQuery({ name: ' Ada ', email: '  ', phone: '', address: undefined })).toEqual({
    name: 'Ada',
  });
});

test('directoryIsDeleted accepts string, Date, and number markers', () => {
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: null })).toBe(false);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: undefined })).toBe(false);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: '' })).toBe(false);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: '   ' })).toBe(false);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: '2026-11-15T00:00:00.000Z' })).toBe(true);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: new Date('2026-11-15T00:00:00.000Z') })).toBe(
    true,
  );
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: new Date('invalid') })).toBe(false);
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: Date.parse('2026-11-15T00:00:00.000Z') })).toBe(
    true,
  );
  expect(directoryIsDeleted({ cuid: 'u1', deletedAt: Number.NaN })).toBe(false);
});


// @relation(GSSC-MLLR-228, GSSC-MLLR-768, scope=range_start, role=Test)
test('GSSC-MLLR-768 Directory Card Name From Name Parts', () => {
  const named = {
    cuid: 'u1',
    firstName: 'Grace',
    middleName: 'M',
    lastName: 'Hopper',
    username: 'ghopper',
  };
  expect(directoryDisplayName(named)).toBe('Grace M Hopper');
  expect(toContactRowContents(named).displayName).toBe('Grace M Hopper');
  expect(toContactRowContents(named).displayName).not.toContain('ghopper');

  const emptyName = {
    cuid: 'u2',
    firstName: '',
    middleName: null,
    lastName: '  ',
    username: 'onlyuser',
  };
  expect(directoryDisplayName(emptyName)).toBe('');
  expect(toContactRowContents(emptyName).displayName).toBe('');
  expect(toContactRowContents(emptyName).displayName).not.toBe('onlyuser');
  expect(toContactRowContents(emptyName).displayName).not.toBe('u2');
  expect(directoryHasUsableName(emptyName)).toBe(false);
  expect(directoryHasUsableName({ firstName: 'Ada' })).toBe(true);
});
// @relation(GSSC-MLLR-228, GSSC-MLLR-768, scope=range_end, role=Test)
