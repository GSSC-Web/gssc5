import { directoryIsDeleted, toDirectoryQuery } from './directory-api';

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
