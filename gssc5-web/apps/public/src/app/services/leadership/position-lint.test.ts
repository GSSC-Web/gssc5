import { expect, test } from 'vitest';
import {
  formatPositionText,
  lintPositionSegments,
  positionIncludesOffice,
} from './position-lint';
import {
  cardsForRoster,
  committeeChairCards,
  OFFICER_OFFICES,
  type LeadershipEntry,
} from './leadership';

// @relation(GSSC-PLLR-389, scope=range_start, role=Test)
test('GSSC-PLLR-389 Multiple Position Semicolon Lint Semantic', () => {
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
  expect(lintPositionSegments(undefined)).toEqual([]);
  expect(formatPositionText('President; ; Historian')).toBe(
    'President; Historian',
  );
  expect(positionIncludesOffice('President; Historian', 'President')).toBe(
    true,
  );
  expect(positionIncludesOffice('President; Historian', 'Secretary')).toBe(
    false,
  );

  const leaders: LeadershipEntry[] = [
    {
      position: 'President; Historian',
      firstName: 'Karen',
      lastName: 'Souza',
      preferredContactMethod: 'Email',
      primaryEmail: 'karen@example.com',
      accountPhoto: 'user_karen',
    },
    {
      position: 'Budget; Programs',
      firstName: 'Pat',
      lastName: 'Lee',
      preferredContactMethod: 'Email',
      primaryEmail: 'pat@example.com',
    },
  ];

  const officers = cardsForRoster(OFFICER_OFFICES, leaders);
  const president = officers.find((card) => card.title === 'President')!;
  expect(president.name).toBe('Karen Souza');
  expect(president.photoUrl).toBe(
    'http://localhost:3000/account-photos/user_karen',
  );
  expect(officers.find((card) => card.title === 'Secretary')!.name).toBeNull();

  const chairs = committeeChairCards(leaders);
  expect(chairs.map((card) => card.title)).toEqual([
    'Budget',
    'Historian',
    'Programs',
  ]);
  expect(chairs.find((card) => card.title === 'Historian')!.name).toBe(
    'Karen Souza',
  );
  expect(chairs.find((card) => card.title === 'Budget')!.name).toBe('Pat Lee');
});
// @relation(GSSC-PLLR-389, scope=range_end, role=Test)
