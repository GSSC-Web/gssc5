import {
  isPublicToPublicationTarget,
  publicationTargetToIsPublic,
} from './announcements-api';

test('publicationTargetToIsPublic maps MHLR targets onto isPublic', () => {
  expect(publicationTargetToIsPublic('members')).toBe(false);
  expect(publicationTargetToIsPublic('public')).toBe(true);
  expect(publicationTargetToIsPublic('both')).toBe(true);
});

test('isPublicToPublicationTarget maps wire visibility for create defaults', () => {
  expect(isPublicToPublicationTarget(false)).toBe('members');
  expect(isPublicToPublicationTarget(true)).toBe('both');
});
