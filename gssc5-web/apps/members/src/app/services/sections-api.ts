import { InjectionToken } from '@angular/core';
import { backend } from './backend';
import type { SectionImagePosition } from '../modules/section/section';

/** One public page option for the Page/Section Content Editor. */
export type PublicPageOption = {
  value: string;
  label: string;
};

/**
 * Public page tags used by public FE page assembly (GSSC5-93 page selector).
 * Publications/tools catalogs are Wave 7 GSSC5-97, not listed here.
 */
export const PUBLIC_PAGE_OPTIONS: readonly PublicPageOption[] = [
  { value: 'home', label: 'Home' },
  { value: 'membership-info', label: 'Membership' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'newsletter', label: 'Newsletters' },
];

/** Section list row from Unified Backend GET /sections. */
export type SectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
  imageFile?: string | null;
  imagePosition?: SectionImagePosition | null;
};

/** Section detail from GET/PATCH /sections/{cuid}. */
export type SectionDetail = {
  cuid: string;
  header: string | null;
  body: string;
  resources: string[];
  tags: string[];
  index: number;
  imageFile?: string | null;
  imagePosition?: SectionImagePosition | null;
};

export type SectionPatchBody = {
  header?: string | null;
  body?: string;
  resources?: string[];
  tags?: string[];
  index?: number;
  imageFile?: string | null;
  imagePosition?: SectionImagePosition | null;
};

export type SectionsListByTag = (tag: string) => Promise<SectionListEntry[]>;
export type SectionGetByCuid = (cuid: string) => Promise<SectionDetail | null>;
export type SectionPatchByCuid = (
  cuid: string,
  body: SectionPatchBody,
) => Promise<{ ok: true; detail: SectionDetail } | { ok: false; forbidden: boolean }>;

export const SECTIONS_LIST_BY_TAG = new InjectionToken<SectionsListByTag>(
  'SECTIONS_LIST_BY_TAG',
  {
    providedIn: 'root',
    factory: () => defaultSectionsListByTag,
  },
);

export const SECTION_GET_BY_CUID = new InjectionToken<SectionGetByCuid>(
  'SECTION_GET_BY_CUID',
  {
    providedIn: 'root',
    factory: () => defaultSectionGetByCuid,
  },
);

export const SECTION_PATCH_BY_CUID = new InjectionToken<SectionPatchByCuid>(
  'SECTION_PATCH_BY_CUID',
  {
    providedIn: 'root',
    factory: () => defaultSectionPatchByCuid,
  },
);

function parseImagePosition(value: string | null | undefined): SectionImagePosition | null {
  if (value === 'none' || value === 'left' || value === 'right') return value;
  return null;
}

function asSectionListEntry(raw: SectionListEntry): SectionListEntry {
  return {
    cuid: raw.cuid,
    header: raw.header ?? null,
    body: raw.body,
    tags: raw.tags ?? [],
    index: raw.index,
    imageFile: raw.imageFile ?? null,
    imagePosition: parseImagePosition(raw.imagePosition ?? null),
  };
}

function asSectionDetail(raw: SectionDetail): SectionDetail {
  return {
    ...asSectionListEntry(raw),
    resources: raw.resources ?? [],
  };
}

async function defaultSectionsListByTag(tag: string): Promise<SectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    return rows.map((row) => asSectionListEntry(row as SectionListEntry));
  } catch {
    return [];
  }
}

async function defaultSectionGetByCuid(cuid: string): Promise<SectionDetail | null> {
  try {
    const result = await backend.sections({ cuid }).get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return asSectionDetail(result.data as SectionDetail);
  } catch {
    return null;
  }
}

async function defaultSectionPatchByCuid(
  cuid: string,
  body: SectionPatchBody,
): Promise<{ ok: true; detail: SectionDetail } | { ok: false; forbidden: boolean }> {
  try {
    // Eden Treaty patch body typing requires optional Prismabox fields; cast for partial updates.
    const result = await backend.sections({ cuid }).patch(body as never);
    if (result.error) {
      const status =
        typeof result.error === 'object' &&
        result.error !== null &&
        'status' in result.error
          ? Number((result.error as { status?: number }).status)
          : undefined;
      return { ok: false, forbidden: status === 403 };
    }
    if (result.data === null || result.data === undefined) {
      return { ok: false, forbidden: false };
    }
    return { ok: true, detail: asSectionDetail(result.data as SectionDetail) };
  } catch {
    return { ok: false, forbidden: false };
  }
}
