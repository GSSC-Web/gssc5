import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';
import { SitemapTree } from './sitemap-tree';

/** Nested Members site-tree node from Unified Backend GET /site-trees/members. */
export type SitemapTreeNode = {
  cuid: string;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
  children: SitemapTreeNode[];
};

export type MembersSiteTreeGet = () => Promise<SitemapTreeNode | null>;

/** Default Unified Backend Members site tree used by SitemapPage. */
export const MEMBERS_SITE_TREE_GET = new InjectionToken<MembersSiteTreeGet>(
  'MEMBERS_SITE_TREE_GET',
  {
    providedIn: 'root',
    factory: () => defaultMembersSiteTreeGet,
  },
);

async function defaultMembersSiteTreeGet(): Promise<SitemapTreeNode | null> {
  try {
    const result = await backend['site-trees']({ frontend: 'members' }).get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    const root = (result.data as { root?: SitemapTreeNode }).root;
    return root ?? null;
  } catch {
    return null;
  }
}

/**
 * Members Sitemap page (GSSC5-108): full Members site tree as a nested listing
 * in normal page content, sourced from GET /site-trees/members.
 */
@Component({
  selector: 'gssc-sitemap-page',
  imports: [SitemapTree],
  templateUrl: './sitemap.html',
})
export class SitemapPage {
  private readonly treeGet = inject(MEMBERS_SITE_TREE_GET);

  /** Root Members site-tree node, or null when unavailable. */
  readonly root = signal<SitemapTreeNode | null>(null);

  constructor() {
    void this.loadTree();
  }

  private async loadTree(): Promise<void> {
    // @relation(GSSC-MLLR-504, scope=range_start, role=Implementation)
    const tree = await this.treeGet();
    this.root.set(tree);
    // @relation(GSSC-MLLR-504, scope=range_end, role=Implementation)
  }
}
