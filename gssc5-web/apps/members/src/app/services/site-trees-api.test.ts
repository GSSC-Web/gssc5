import {
  adjacentSibling,
  flattenSiteTree,
  type SiteTreeNode,
} from './site-trees-api';

const sampleRoot: SiteTreeNode = {
  cuid: 'root',
  label: 'Home',
  path: '/',
  sortOrder: 0,
  sectionTag: null,
  children: [
    {
      cuid: 'a',
      label: 'A',
      path: '/a',
      sortOrder: 0,
      sectionTag: null,
      children: [],
    },
    {
      cuid: 'b',
      label: 'B',
      path: '/b',
      sortOrder: 1,
      sectionTag: null,
      children: [],
    },
  ],
};

test('flattenSiteTree walks parent links', () => {
  const rows = flattenSiteTree(sampleRoot);
  expect(rows.map((row) => [row.cuid, row.parentId])).toEqual([
    ['root', null],
    ['a', 'root'],
    ['b', 'root'],
  ]);
});

test('adjacentSibling finds up and down neighbors', () => {
  expect(adjacentSibling(sampleRoot, 'b', -1)?.cuid).toBe('a');
  expect(adjacentSibling(sampleRoot, 'a', 1)?.cuid).toBe('b');
  expect(adjacentSibling(sampleRoot, 'a', -1)).toBeNull();
  expect(adjacentSibling(sampleRoot, 'root', 1)).toBeNull();
});
