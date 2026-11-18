import { expect, test } from 'vitest';
import { formatPositionText, lintPositionSegments } from './position-lint';
import { toContactRowContents } from './directory-api';
import type { AccountRecord } from './account-api';

// @relation(GSSC-MLLR-661, scope=range_start, role=Test)
test('GSSC-MLLR-661 Directory Position List Semantic', () => {
  expect(lintPositionSegments('President; Historian')).toEqual([
    'President',
    'Historian',
  ]);
  expect(lintPositionSegments('  President ; ; Historian ; ')).toEqual([
    'President',
    'Historian',
  ]);
  expect(lintPositionSegments('')).toEqual([]);
  expect(lintPositionSegments(null)).toEqual([]);

  const entry: AccountRecord = {
    cuid: 'user_1',
    firstName: 'Karen',
    lastName: 'Souza',
    primaryEmail: 'karen@example.com',
    position: 'President; ; Historian ;',
  };
  const contents = toContactRowContents(entry);
  expect(contents.positions).toEqual(['President', 'Historian']);
  expect(contents.displayName).toBe('Karen Souza');

  const without: AccountRecord = {
    cuid: 'user_2',
    firstName: 'Pat',
    lastName: 'Lee',
    position: null,
  };
  expect(toContactRowContents(without).positions).toBeUndefined();
});
// @relation(GSSC-MLLR-661, scope=range_end, role=Test)

// @relation(GSSC-MLLR-664, scope=range_start, role=Test)
test('GSSC-MLLR-664 Account Position Lint Semantic', () => {
  expect(formatPositionText('President; ; Historian')).toBe(
    'President; Historian',
  );
  expect(formatPositionText('')).toBe('');
  expect(formatPositionText(null)).toBe('');
  expect(formatPositionText('  Secretary  ')).toBe('Secretary');
});
// @relation(GSSC-MLLR-664, scope=range_end, role=Test)
