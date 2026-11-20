/**
 * Permission gates for Members site-tree destinations (GSSC5-127).
 * Hides editor/tool nodes the current member cannot use (e.g. newsletters).
 */

export type SiteTreePermissionFlags = {
  isAdmin: boolean;
  isNewsletterEditor: boolean;
  isPublicationEditor: boolean;
  isToolEditor: boolean;
};

type PathTreeNode<T> = {
  path: string;
  children: T[];
};

/** Normalize a site-tree path for permission matching. */
export function normalizeSiteTreePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length === 0 || trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
}

/**
 * Whether the member may use (see) a Members site-tree destination.
 * Unknown paths stay visible; only known gated editors/tools are hidden.
 */
// @relation(GSSC-MLLR-562, scope=range_start, role=Implementation)
export function memberMayUseSiteTreePath(
  path: string,
  flags: SiteTreePermissionFlags,
): boolean {
  const normalized = normalizeSiteTreePath(path);

  if (normalized === '/newsletters' || normalized.startsWith('/newsletters/')) {
    return flags.isAdmin || flags.isNewsletterEditor;
  }
  if (normalized === '/publications' || normalized.startsWith('/publications/')) {
    return flags.isAdmin || flags.isPublicationEditor;
  }
  if (
    normalized === '/research-tools' ||
    normalized.startsWith('/research-tools/')
  ) {
    return flags.isAdmin || flags.isToolEditor;
  }
  if (normalized === '/site-trees' || normalized.startsWith('/site-trees/')) {
    return flags.isAdmin;
  }
  if (normalized === '/templates' || normalized.startsWith('/templates/')) {
    return flags.isAdmin;
  }
  if (normalized === '/kvs' || normalized.startsWith('/kvs/')) {
    return flags.isAdmin;
  }

  return true;
}

/** Filter a nested tree root; returns null when the root itself is not permitted. */
export function filterSiteTreeRootByPermissions<T extends PathTreeNode<T>>(
  root: T,
  flags: SiteTreePermissionFlags,
): T | null {
  if (!memberMayUseSiteTreePath(root.path, flags)) return null;
  return {
    ...root,
    children: filterSiteTreeChildrenByPermissions(root.children ?? [], flags),
  };
}

/** Filter sibling lists, dropping nodes the member may not use. */
export function filterSiteTreeChildrenByPermissions<T extends PathTreeNode<T>>(
  nodes: T[],
  flags: SiteTreePermissionFlags,
): T[] {
  const next: T[] = [];
  for (const node of nodes) {
    if (!memberMayUseSiteTreePath(node.path, flags)) continue;
    next.push({
      ...node,
      children: filterSiteTreeChildrenByPermissions(node.children ?? [], flags),
    });
  }
  return next;
}
// @relation(GSSC-MLLR-562, scope=range_end, role=Implementation)
