import { expect, test } from 'vitest';
import {
  accountPhotoUrl,
  cardsForRoster,
  committeeChairCards,
  DIRECTOR_AT_LARGE_OFFICES,
  OFFICER_OFFICES,
  type LeadershipEntry,
} from './leadership';

// @relation(GSSC-PLLR-382, scope=range_start, role=Test)
test('GSSC-PLLR-382 Leadership Account Photo Semantic', () => {
  expect(accountPhotoUrl('user_karen')).toBe(
    'http://localhost:3000/account-photos/user_karen',
  );
  expect(accountPhotoUrl('/account-photos/user_karen')).toBe(
    'http://localhost:3000/account-photos/user_karen',
  );
  expect(accountPhotoUrl('https://cdn.example/karen.jpg')).toBe(
    'https://cdn.example/karen.jpg',
  );
  expect(accountPhotoUrl('')).toBeNull();
  expect(accountPhotoUrl(null)).toBeNull();
  expect(accountPhotoUrl(undefined)).toBeNull();

  const officerLeaders: LeadershipEntry[] = [
    {
      position: 'President',
      firstName: 'Karen',
      lastName: 'Souza',
      preferredContactMethod: 'Email',
      primaryEmail: 'president@example.com',
      accountPhoto: 'user_karen',
    },
    {
      position: 'Secretary',
      firstName: null,
      lastName: null,
      preferredContactMethod: 'Email',
      primaryEmail: 'empty@example.com',
      accountPhoto: 'should-not-show',
    },
    {
      position: 'Treasurer',
      firstName: 'Pat',
      lastName: 'Lee',
      preferredContactMethod: 'Email',
      primaryEmail: 'treasurer@example.com',
    },
  ];
  const officerCards = cardsForRoster(OFFICER_OFFICES, officerLeaders);
  expect(officerCards.find((card) => card.title === 'President')!.photoUrl).toBe(
    'http://localhost:3000/account-photos/user_karen',
  );
  expect(officerCards.find((card) => card.title === 'Secretary')!.photoUrl).toBeNull();
  expect(officerCards.find((card) => card.title === 'Treasurer')!.photoUrl).toBeNull();

  const directorLeaders: LeadershipEntry[] = [
    {
      position: 'Director at Large 1',
      firstName: 'Linda',
      lastName: 'Turley',
      preferredContactMethod: 'Phone',
      primaryPhone: '209-555-0100',
      accountPhoto: 'user_linda',
    },
  ];
  const directorCards = cardsForRoster(DIRECTOR_AT_LARGE_OFFICES, directorLeaders);
  expect(
    directorCards.find((card) => card.title === 'Director at Large 1')!.photoUrl,
  ).toBe('http://localhost:3000/account-photos/user_linda');

  const chairLeaders: LeadershipEntry[] = [
    {
      position: 'Historian',
      firstName: 'Judy',
      lastName: 'Byrne',
      preferredContactMethod: 'Email',
      primaryEmail: 'historian@example.com',
      accountPhoto: 'user_judy',
    },
  ];
  const chairCards = committeeChairCards(chairLeaders);
  expect(chairCards).toHaveLength(1);
  expect(chairCards[0]!.photoUrl).toBe('http://localhost:3000/account-photos/user_judy');
});
// @relation(GSSC-PLLR-382, scope=range_end, role=Test)
