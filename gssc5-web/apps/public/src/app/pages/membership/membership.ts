import { Component, InjectionToken, inject, signal } from '@angular/core';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';
import { backend } from '../../services/backend';

/** Backend tag that binds public Meeting Information sections to this page. */
export const MEMBERSHIP_MEETING_TAG = 'membership-meeting';

/** Backend tag that binds public Membership Benefits sections to this page. */
export const MEMBERSHIP_BENEFITS_TAG = 'membership-benefits';

/** One public section list entry from Unified Backend GET /sections. */
export type MembershipSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
};

export type MembershipSectionListByTag = (
  tag: string,
) => Promise<MembershipSectionListEntry[]>;

/** Default Unified Backend public section list filtered by tag. */
export const MEMBERSHIP_SECTION_LIST_BY_TAG =
  new InjectionToken<MembershipSectionListByTag>(
    'MEMBERSHIP_SECTION_LIST_BY_TAG',
    {
      providedIn: 'root',
      factory: () => defaultMembershipSectionListByTag,
    },
  );

async function defaultMembershipSectionListByTag(
  tag: string,
): Promise<MembershipSectionListEntry[]> {
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

/** Sort list entries by backend index ascending (stable for equal index). */
export function sortMembershipSectionsByIndex(
  entries: readonly MembershipSectionListEntry[],
): MembershipSectionListEntry[] {
  return [...entries].sort((a, b) => a.index - b.index || a.cuid.localeCompare(b.cuid));
}

/**
 * Public Membership Information Page (GSSC5-15): Meeting Information and
 * Membership Benefits via tagged backend sections + Section From CUID.
 */
// @relation(GSSC-PLLR-9, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-membership-page',
  imports: [SectionFromCuid],
  templateUrl: './membership.html',
})
export class MembershipPage {
  private readonly listByTag = inject(MEMBERSHIP_SECTION_LIST_BY_TAG);
  private loadGeneration = 0;

  /** Meeting Information section cuids in backend index order. */
  readonly meetingCuids = signal<string[]>([]);

  /** Membership Benefits section cuids in backend index order. */
  readonly benefitsCuids = signal<string[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-PLLR-198, GSSC-PLLR-201, GSSC-PLLR-204, scope=range_start, role=Implementation)
    const [meeting, benefits] = await Promise.all([
      this.listByTag(MEMBERSHIP_MEETING_TAG),
      this.listByTag(MEMBERSHIP_BENEFITS_TAG),
    ]);
    if (generation !== this.loadGeneration) return;
    this.meetingCuids.set(
      sortMembershipSectionsByIndex(meeting).map((entry) => entry.cuid),
    );
    this.benefitsCuids.set(
      sortMembershipSectionsByIndex(benefits).map((entry) => entry.cuid),
    );
    // @relation(GSSC-PLLR-198, GSSC-PLLR-201, GSSC-PLLR-204, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-9, scope=range_end, role=Implementation)
