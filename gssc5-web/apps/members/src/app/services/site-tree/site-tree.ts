import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { backend } from '../backend';

/** One navigation node derived from the members site tree (GSSC5-107). */
export type SiteTreeNavNode = {
  cuid: string;
  label: string;
  path: string;
  children: SiteTreeNavNode[];
};

export type NestedSiteTreePayload = {
  frontend: 'public' | 'members';
  root: SiteTreeNavNode;
};

export type SiteTreeGet = (
  frontend: 'public' | 'members',
) => Promise<NestedSiteTreePayload | null>;

/** Default Unified Backend GET /site-trees/{frontend}. */
export const SITE_TREE_GET = new InjectionToken<SiteTreeGet>('SITE_TREE_GET', {
  providedIn: 'root',
  factory: () => defaultSiteTreeGet,
});

async function defaultSiteTreeGet(
  frontend: 'public' | 'members',
): Promise<NestedSiteTreePayload | null> {
  try {
    const result = await backend['site-trees']({ frontend }).get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data as NestedSiteTreePayload;
  } catch {
    return null;
  }
}

/**
 * Limit submenu depth beneath top-level entries.
 * depthLeft=2 keeps two submenu levels (MHLR-82 / MLLR-447).
 */
export function limitNavSubmenuDepth(
  nodes: SiteTreeNavNode[],
  depthLeft: number,
): SiteTreeNavNode[] {
  if (depthLeft < 0) return [];
  return nodes.map((node) => ({
    cuid: node.cuid,
    label: node.label,
    path: node.path,
    children:
      depthLeft === 0
        ? []
        : limitNavSubmenuDepth(node.children ?? [], depthLeft - 1),
  }));
}

/**
 * Build Navigation Menu top-level entries from a nested members tree:
 * root as Home/Dashboard (no children), then root children with ≤2 submenu levels.
 */
export function navItemsFromMembersTree(
  tree: NestedSiteTreePayload,
): SiteTreeNavNode[] {
  const home: SiteTreeNavNode = {
    cuid: tree.root.cuid,
    label: tree.root.label,
    path: tree.root.path,
    children: [],
  };
  const children = limitNavSubmenuDepth(tree.root.children ?? [], 2);
  return [home, ...children];
}

/** Loads and exposes the Members Navigation Menu items (GSSC5-107). */
@Injectable({ providedIn: 'root' })
export class SiteTree {
  private readonly getTree = inject(SITE_TREE_GET);
  private loadGeneration = 0;

  readonly navItems = signal<SiteTreeNavNode[]>([]);
  readonly loaded = signal(false);

  async refresh(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-MLLR-441, GSSC-MHLR-81, GSSC-MHLR-82, scope=range_start, role=Implementation)
    const tree = await this.getTree('members');
    if (generation !== this.loadGeneration) return;
    this.navItems.set(tree ? navItemsFromMembersTree(tree) : []);
    this.loaded.set(true);
    // @relation(GSSC-MLLR-441, GSSC-MHLR-81, GSSC-MHLR-82, scope=range_end, role=Implementation)
  }
}
