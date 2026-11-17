import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';
import { SitemapTree } from './sitemap-tree';

/** Nested Public site-tree node from Unified Backend GET /site-trees/public. */
export type SitemapTreeNode = {
  cuid: string;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
  children: SitemapTreeNode[];
};

export type PublicSiteTreeGet = () => Promise<SitemapTreeNode | null>;

/** Default Unified Backend Public site tree used by SitemapPage. */
export const PUBLIC_SITE_TREE_GET = new InjectionToken<PublicSiteTreeGet>(
  'PUBLIC_SITE_TREE_GET',
  {
    providedIn: 'root',
    factory: () => defaultPublicSiteTreeGet,
  },
);

async function defaultPublicSiteTreeGet(): Promise<SitemapTreeNode | null> {
  try {
    const result = await backend['site-trees']({ frontend: 'public' }).get();
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
 * Public Sitemap page (GSSC5-41): full Public site tree as a nested listing
 * in normal page content, sourced from GET /site-trees/public.
 */
@Component({
  selector: 'gssc-sitemap-page',
  imports: [SitemapTree],
  templateUrl: './sitemap.html',
})
export class SitemapPage {
  private readonly treeGet = inject(PUBLIC_SITE_TREE_GET);

  /** Root Public site-tree node, or null when unavailable. */
  readonly root = signal<SitemapTreeNode | null>(null);

  constructor() {
    void this.loadTree();
  }

  private async loadTree(): Promise<void> {
    // @relation(GSSC-PLLR-348, scope=range_start, role=Implementation)
    const tree = await this.treeGet();
    this.root.set(tree);
    // @relation(GSSC-PLLR-348, scope=range_end, role=Implementation)
  }
}
