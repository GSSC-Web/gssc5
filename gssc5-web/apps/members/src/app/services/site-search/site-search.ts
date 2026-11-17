import { InjectionToken } from '@angular/core';
import { backend } from '../backend';

/** Result kinds returned by Unified Backend GET /search (GSSC5-106). */
export const SITE_SEARCH_KINDS = [
  'site-tree',
  'section',
  'announcement',
  'event',
  'publication',
  'research-tool',
  'newsletter',
  'directory',
] as const;

export type SiteSearchKind = (typeof SITE_SEARCH_KINDS)[number];

export type SiteSearchResult = {
  title: string;
  snippet: string;
  href: string;
  kind: SiteSearchKind;
};

export type SiteSearchQuery = {
  q: string;
  limit?: number;
  kind?: SiteSearchKind | '';
};

export type SiteSearchGet = (
  query: SiteSearchQuery,
) => Promise<SiteSearchResult[] | null>;

export const QUICK_SEARCH_LIMIT = 5;
export const PAGE_SEARCH_LIMIT = 50;

/** Default Unified Backend GET /search?frontend=members. */
export const SITE_SEARCH_GET = new InjectionToken<SiteSearchGet>(
  'SITE_SEARCH_GET',
  {
    providedIn: 'root',
    factory: () => defaultSiteSearchGet,
  },
);

async function defaultSiteSearchGet(
  query: SiteSearchQuery,
): Promise<SiteSearchResult[] | null> {
  try {
    const params: Record<string, string> = {
      frontend: 'members',
      q: query.q,
    };
    if (query.limit !== undefined) {
      params['limit'] = String(query.limit);
    }
    if (query.kind) {
      params['kind'] = query.kind;
    }
    const result = await backend.search.get({ query: params });
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data as SiteSearchResult[];
  } catch {
    return null;
  }
}
