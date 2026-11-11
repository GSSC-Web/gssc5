import { InjectionToken } from '@angular/core';
import type { ContactCardContents } from '../../modules/contact-card-large/contact-card-large';
import { backend } from '../backend';

/** Backend tag that binds public Leadership Intro sections to this page. */
export const LEADERSHIP_INTRO_TAG = 'leadership';

/** One entry from Unified Backend GET /leadership. */
export type LeadershipEntry = {
  position: string;
  firstName: string | null;
  lastName: string | null;
  preferredContactMethod: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  accountPhoto?: string | null;
};

/** One public section list entry from Unified Backend GET /sections. */
export type LeadershipSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
};

export type LeadershipListGet = () => Promise<LeadershipEntry[]>;

export type LeadershipSectionListByTag = (
  tag: string,
) => Promise<LeadershipSectionListEntry[]>;

/** Default Unified Backend public leadership list GET. */
export const LEADERSHIP_LIST_GET = new InjectionToken<LeadershipListGet>(
  'LEADERSHIP_LIST_GET',
  {
    providedIn: 'root',
    factory: () => defaultLeadershipListGet,
  },
);

/** Default Unified Backend public section list filtered by tag. */
export const LEADERSHIP_SECTION_LIST_BY_TAG =
  new InjectionToken<LeadershipSectionListByTag>('LEADERSHIP_SECTION_LIST_BY_TAG', {
    providedIn: 'root',
    factory: () => defaultLeadershipSectionListByTag,
  });

async function defaultLeadershipListGet(): Promise<LeadershipEntry[]> {
  try {
    const result = await backend.leadership.get();
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return result.data;
  } catch {
    return [];
  }
}

async function defaultLeadershipSectionListByTag(
  tag: string,
): Promise<LeadershipSectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return result.data;
  } catch {
    return [];
  }
}

/** Officer Position titles (Lexical). */
export const OFFICER_OFFICES = [
  'President',
  '1st Vice President',
  '2nd Vice President',
  'Secretary',
  'Treasurer',
  'Past President',
] as const;

/** Director at Large Position titles in seat order (Lexical). */
export const DIRECTOR_AT_LARGE_OFFICES = [
  'Director at Large 1',
  'Director at Large 2',
  'Director at Large 3',
  'Director at Large 4',
  'Director at Large 5',
] as const;

/** Officer + Director at Large Positions excluded from dynamic Committee Chairs. */
const FIXED_LEADERSHIP_OFFICES = new Set<string>([
  ...OFFICER_OFFICES,
  ...DIRECTOR_AT_LARGE_OFFICES,
]);

export function leaderDisplayName(entry: LeadershipEntry): string | null {
  const parts = [entry.firstName, entry.lastName].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== '',
  );
  if (parts.length === 0) return null;
  return parts.join(' ');
}

export function preferredContact(
  entry: LeadershipEntry,
): { label: string; href: string } | null {
  if (entry.preferredContactMethod === 'Email') {
    const email =
      typeof entry.primaryEmail === 'string' && entry.primaryEmail.trim() !== ''
        ? entry.primaryEmail.trim()
        : null;
    if (email === null) return null;
    return { label: email, href: `mailto:${email}` };
  }
  if (entry.preferredContactMethod === 'Phone') {
    const phone =
      typeof entry.primaryPhone === 'string' && entry.primaryPhone.trim() !== ''
        ? entry.primaryPhone.trim()
        : null;
    if (phone === null) return null;
    return { label: phone, href: `tel:${phone}` };
  }
  return null;
}

/** Map a canonical roster onto leadership list entries by exact Position. */
export function cardsForRoster(
  roster: readonly string[],
  leaders: readonly LeadershipEntry[],
): ContactCardContents[] {
  return roster.map((office) => {
    const match = leaders.find((leader) => leader.position === office);
    if (!match) {
      return {
        name: null,
        title: office,
        photoUrl: null,
        contactLabel: null,
        contactHref: null,
      };
    }
    const name = leaderDisplayName(match);
    if (name === null) {
      return {
        name: null,
        title: office,
        photoUrl: null,
        contactLabel: null,
        contactHref: null,
      };
    }
    const contact = preferredContact(match);
    const photoUrl =
      typeof match.accountPhoto === 'string' && match.accountPhoto.trim() !== ''
        ? match.accountPhoto
        : null;
    return {
      name,
      title: office,
      photoUrl,
      contactLabel: contact?.label ?? null,
      contactHref: contact?.href ?? null,
    };
  });
}

/**
 * Committee chair cards from leadership list entries that are not Officers or
 * Directors at Large. Only named entries; alphabetical by Position. No Vacant.
 */
export function committeeChairCards(
  leaders: readonly LeadershipEntry[],
): ContactCardContents[] {
  return leaders
    .filter((leader) => {
      if (FIXED_LEADERSHIP_OFFICES.has(leader.position)) return false;
      return leaderDisplayName(leader) !== null;
    })
    .slice()
    .sort((a, b) => a.position.localeCompare(b.position))
    .map((match) => {
      const contact = preferredContact(match);
      const photoUrl =
        typeof match.accountPhoto === 'string' && match.accountPhoto.trim() !== ''
          ? match.accountPhoto
          : null;
      return {
        name: leaderDisplayName(match)!,
        title: match.position,
        photoUrl,
        contactLabel: contact?.label ?? null,
        contactHref: contact?.href ?? null,
      };
    });
}

/** Sort list entries by backend index ascending (stable for equal index). */
export function sortLeadershipSectionsByIndex(
  entries: readonly LeadershipSectionListEntry[],
): LeadershipSectionListEntry[] {
  return [...entries].sort(
    (a, b) => a.index - b.index || a.cuid.localeCompare(b.cuid),
  );
}
