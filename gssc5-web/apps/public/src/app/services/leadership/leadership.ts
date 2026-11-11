import { InjectionToken } from '@angular/core';
import { backend } from '../backend';

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

/** One presented row on the public leadership page. */
export type LeadershipRow = {
  office: string;
  /** Display name when filled; null means Vacant. */
  name: string | null;
  /** Primary Email when the leadership entry includes it. */
  email: string | null;
};

export type LeadershipListGet = () => Promise<LeadershipEntry[]>;

/** Default Unified Backend public leadership list GET. */
export const LEADERSHIP_LIST_GET = new InjectionToken<LeadershipListGet>(
  'LEADERSHIP_LIST_GET',
  {
    providedIn: 'root',
    factory: () => defaultLeadershipListGet,
  },
);

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

/** Officer and Director at Large Position titles (Lexical). */
export const OFFICER_AND_DIRECTOR_OFFICES = [
  'President',
  '1st Vice President',
  '2nd Vice President',
  'Secretary',
  'Treasurer',
  'Director at Large 1',
  'Director at Large 2',
  'Director at Large 3',
  'Director at Large 4',
  'Director at Large 5',
  'Past President',
] as const;

/** Committee chair Position titles (Lexical). */
export const COMMITTEE_CHAIR_OFFICES = [
  'Acquisitions',
  'Audit',
  'Budget',
  'Historian',
  'Membership',
  'Memorial Day',
  'Mentor',
  'Newsletter & Website',
  'Planning',
  'Programs',
  'Publicity',
  'Queries',
  'Refreshments',
  'Registrar',
  'Research & Publications',
  'Research Day Trips',
  'Seminar',
  'Seminar & Workshops',
  'Social Media',
  'Special Collections',
  'Sunshine',
] as const;

export function leaderDisplayName(entry: LeadershipEntry): string | null {
  const parts = [entry.firstName, entry.lastName].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== '',
  );
  if (parts.length === 0) return null;
  return parts.join(' ');
}

/** Map a canonical roster onto leadership list entries by exact Position. */
export function rowsForRoster(
  roster: readonly string[],
  leaders: readonly LeadershipEntry[],
): LeadershipRow[] {
  return roster.map((office) => {
    const match = leaders.find((leader) => leader.position === office);
    if (!match) {
      return { office, name: null, email: null };
    }
    const name = leaderDisplayName(match);
    if (name === null) {
      return { office, name: null, email: null };
    }
    const email =
      typeof match.primaryEmail === 'string' && match.primaryEmail.trim() !== ''
        ? match.primaryEmail
        : null;
    return { office, name, email };
  });
}
