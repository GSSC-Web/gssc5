import { publicationFileUrl } from './publications-api';

test('publicationFileUrl maps cuid and publications paths; passes through absolute http(s)', () => {
  expect(publicationFileUrl('pub-abc')).toBe(
    'http://localhost:3000/publications/pub-abc/file',
  );
  expect(publicationFileUrl('publications/pub-abc')).toBe(
    'http://localhost:3000/publications/pub-abc/file',
  );
  expect(publicationFileUrl('/publications/pub-abc/file')).toBe(
    'http://localhost:3000/publications/pub-abc/file',
  );
  expect(publicationFileUrl('https://example.org/x.pdf')).toBe(
    'https://example.org/x.pdf',
  );
});
