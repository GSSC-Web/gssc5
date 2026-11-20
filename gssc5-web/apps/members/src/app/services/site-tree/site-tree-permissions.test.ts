import {
  filterSiteTreeRootByPermissions,
  memberMayUseSiteTreePath,
  normalizeSiteTreePath,
  type SiteTreePermissionFlags,
} from './site-tree-permissions';

type Node = {
  path: string;
  label: string;
  children: Node[];
};

const memberFlags: SiteTreePermissionFlags = {
  isAdmin: false,
  isNewsletterEditor: false,
  isPublicationEditor: false,
  isToolEditor: false,
};

const adminFlags: SiteTreePermissionFlags = {
  isAdmin: true,
  isNewsletterEditor: false,
  isPublicationEditor: false,
  isToolEditor: false,
};

// @relation(GSSC-MLLR-562, scope=range_start, role=Test)
test('GSSC-MLLR-562 Semantic path gates', () => {
  expect(normalizeSiteTreePath('/newsletters/')).toBe('/newsletters');
  expect(memberMayUseSiteTreePath('/newsletters', memberFlags)).toBe(false);
  expect(memberMayUseSiteTreePath('/newsletters', adminFlags)).toBe(true);
  expect(
    memberMayUseSiteTreePath('/newsletters', {
      ...memberFlags,
      isNewsletterEditor: true,
    }),
  ).toBe(true);
  expect(memberMayUseSiteTreePath('/directory', memberFlags)).toBe(true);
  expect(memberMayUseSiteTreePath('/site-trees', memberFlags)).toBe(false);
  expect(memberMayUseSiteTreePath('/templates', memberFlags)).toBe(false);
  expect(memberMayUseSiteTreePath('/kvs', memberFlags)).toBe(false);
  expect(memberMayUseSiteTreePath('/kvs', adminFlags)).toBe(true);
  expect(memberMayUseSiteTreePath('/publications', memberFlags)).toBe(false);
  expect(memberMayUseSiteTreePath('/research-tools', memberFlags)).toBe(false);
});

test('GSSC-MLLR-562 Semantic filters nested Members nodes', () => {
  const root: Node = {
    path: '/',
    label: 'Dashboard',
    children: [
      { path: '/directory', label: 'Directory', children: [] },
      { path: '/newsletters', label: 'Newsletters', children: [] },
      {
        path: '/account',
        label: 'Account',
        children: [{ path: '/templates', label: 'Templates', children: [] }],
      },
    ],
  };

  const filtered = filterSiteTreeRootByPermissions(root, memberFlags);
  expect(filtered).not.toBeNull();
  expect(filtered!.children.map((child) => child.path)).toEqual([
    '/directory',
    '/account',
  ]);
  expect(filtered!.children[1]?.children).toEqual([]);

  const asAdmin = filterSiteTreeRootByPermissions(root, adminFlags);
  expect(asAdmin!.children.map((child) => child.path)).toEqual([
    '/directory',
    '/newsletters',
    '/account',
  ]);
  expect(asAdmin!.children[2]?.children.map((child) => child.path)).toEqual([
    '/templates',
  ]);
});
// @relation(GSSC-MLLR-562, scope=range_end, role=Test)
