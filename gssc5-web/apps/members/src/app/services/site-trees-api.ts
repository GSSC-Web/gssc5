import { backend } from './backend';

export type SiteTreeFrontend = 'public' | 'members';

export type SiteTreeNode = {
  cuid: string;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
  children: SiteTreeNode[];
};

export type NestedSiteTree = {
  frontend: SiteTreeFrontend;
  root: SiteTreeNode;
};

export type SiteTreeNodeEntry = {
  cuid: string;
  treeId: string;
  parentId: string | null;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
};

export type SiteTreeCreateBody = {
  label: string;
  path: string;
  sortOrder: number;
  parentId?: string | null;
  sectionTag?: string | null;
};

export type SiteTreeUpdateBody = {
  label?: string;
  path?: string;
  sortOrder?: number;
  parentId?: string | null;
  sectionTag?: string | null;
};

type TreeClient = {
  get: () => Promise<{ data: unknown; error: unknown }>;
  post: (body: SiteTreeCreateBody) => Promise<{ data: unknown; error: unknown }>;
  nodes: (params: { nodeId: string }) => {
    patch: (body: SiteTreeUpdateBody) => Promise<{ data: unknown; error: unknown }>;
    delete: () => Promise<{ data: unknown; error: unknown }>;
  };
};

function treeClient(frontend: SiteTreeFrontend): TreeClient {
  return backend['site-trees']({ frontend }) as unknown as TreeClient;
}

/**
 * Treaty calls for GSSC5-40 site trees (GSSC5-116 Members editor).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const siteTreesApi = {
  get: async (frontend: SiteTreeFrontend): Promise<NestedSiteTree | null> => {
    try {
      const result = await treeClient(frontend).get();
      if (result.error || result.data == null) return null;
      return result.data as NestedSiteTree;
    } catch {
      return null;
    }
  },

  create: async (
    frontend: SiteTreeFrontend,
    body: SiteTreeCreateBody,
  ): Promise<SiteTreeNodeEntry | null> => {
    try {
      const result = await treeClient(frontend).post(body);
      if (result.error || result.data == null || typeof result.data === 'string') {
        return null;
      }
      return result.data as SiteTreeNodeEntry;
    } catch {
      return null;
    }
  },

  update: async (
    frontend: SiteTreeFrontend,
    nodeId: string,
    body: SiteTreeUpdateBody,
  ): Promise<SiteTreeNodeEntry | null> => {
    try {
      const result = await treeClient(frontend).nodes({ nodeId }).patch(body);
      if (result.error || result.data == null || typeof result.data === 'string') {
        return null;
      }
      return result.data as SiteTreeNodeEntry;
    } catch {
      return null;
    }
  },

  remove: async (frontend: SiteTreeFrontend, nodeId: string): Promise<boolean> => {
    try {
      const result = await treeClient(frontend).nodes({ nodeId }).delete();
      return !result.error;
    } catch {
      return false;
    }
  },
};

/** Flatten nested tree into parent-aware rows for sibling reorder. */
export function flattenSiteTree(
  root: SiteTreeNode,
): Array<SiteTreeNode & { parentId: string | null }> {
  const rows: Array<SiteTreeNode & { parentId: string | null }> = [];
  const walk = (node: SiteTreeNode, parentId: string | null) => {
    rows.push({ ...node, parentId });
    for (const child of node.children ?? []) {
      walk(child, node.cuid);
    }
  };
  walk(root, null);
  return rows;
}

/** Adjacent sibling in direction -1 (up) or +1 (down), or null. */
export function adjacentSibling(
  root: SiteTreeNode,
  nodeId: string,
  direction: -1 | 1,
): SiteTreeNode | null {
  const flat = flattenSiteTree(root);
  const target = flat.find((row) => row.cuid === nodeId);
  if (!target || target.parentId == null) return null;
  const siblings = flat
    .filter((row) => row.parentId === target.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const index = siblings.findIndex((row) => row.cuid === nodeId);
  const neighbor = siblings[index + direction];
  return neighbor ?? null;
}
