import {
  labelForSearchKind,
  PUBLIC_SEARCH_KINDS,
  SEARCH_OVERLAY_LIMIT,
  SEARCH_PAGE_LIMIT,
} from './site-search';

test('PUBLIC_SEARCH_KINDS lists public corpus kinds without directory', () => {
  expect(PUBLIC_SEARCH_KINDS).toEqual([
    'site-tree',
    'section',
    'announcement',
    'event',
    'publication',
    'research-tool',
    'newsletter',
  ]);
  expect(SEARCH_OVERLAY_LIMIT).toBe(8);
  expect(SEARCH_PAGE_LIMIT).toBe(50);
});

test('labelForSearchKind covers each public kind', () => {
  for (const kind of PUBLIC_SEARCH_KINDS) {
    expect(labelForSearchKind(kind).length).toBeGreaterThan(0);
  }
});
