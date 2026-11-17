import { InjectionToken } from '@angular/core';
import { backend } from '../backend';

/** Public search result kinds accepted by GET /search kind= (GSSC5-106). */
export const PUBLIC_SEARCH_KINDS = [
  'site-tree',
  'section',
  'announcement',
  'event',
  'publication',
  'research-tool',
  'newsletter',
] as const;

export type PublicSearchKind = (typeof PUBLIC_SEARCH_KINDS)[number];

export type SiteSearchResult = {
  title: string;
  snippet: string;
  href: string;
  kind: string;
};

export type SiteSearchQuery = {
  q: string;
  limit?: number;
  kind?: PublicSearchKind | '';
};

export type SiteSearchGet = (
  query: SiteSearchQuery,
) => Promise<SiteSearchResult[] | null>;

/** Default Unified Backend GET /search for the Public frontend. */
export const SITE_SEARCH_GET = new InjectionToken<SiteSearchGet>(
  'SITE_SEARCH_GET',
  {
    providedIn: 'root',
    factory: () => defaultSiteSearchGet,
  },
);

/** Short list size for Header Search Overlay quick results. */
export const SEARCH_OVERLAY_LIMIT = 8;

/** Fuller list size for the Public Search Page. */
export const SEARCH_PAGE_LIMIT = 50;

async function defaultSiteSearchGet(
  query: SiteSearchQuery,
): Promise<SiteSearchResult[] | null> {
  try {
    const params: Record<string, string> = {
      q: query.q,
      frontend: 'public',
      limit: String(query.limit ?? SEARCH_PAGE_LIMIT),
    };
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

/** Human-readable labels for Public search kind filter options. */
export function labelForSearchKind(kind: PublicSearchKind): string {
  switch (kind) {
    case 'site-tree':
      return 'Pages';
    case 'section':
      return 'Sections';
    case 'announcement':
      return 'Announcements';
    case 'event':
      return 'Events';
    case 'publication':
      return 'Publications';
    case 'research-tool':
      return 'Research tools';
    case 'newsletter':
      return 'Newsletters';
  }
}
