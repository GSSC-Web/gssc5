import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { backend } from './backend';
import {
  filterSectionsVisibleOn,
  type SectionDisplayBounds,
} from './section-display-window/section-display-window';

/** Tag that marks a public announcement as urgent for the Announcements Bar. */
export const URGENT_ANNOUNCEMENT_TAG = 'urgent';

export type UrgentAnnouncement = {
  id: string;
  title: string;
  text: string;
};

/** One public announcement list entry used to populate urgent bar contents. */
export type UrgentAnnouncementListEntry = SectionDisplayBounds & {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
};

export type UrgentAnnouncementsList = () => Promise<UrgentAnnouncementListEntry[]>;

/** Default Unified Backend public announcement list filtered by the urgent tag. */
export const URGENT_ANNOUNCEMENTS_LIST =
  new InjectionToken<UrgentAnnouncementsList>('URGENT_ANNOUNCEMENTS_LIST', {
    providedIn: 'root',
    factory: () => defaultUrgentAnnouncementsList,
  });

async function defaultUrgentAnnouncementsList(): Promise<
  UrgentAnnouncementListEntry[]
> {
  try {
    const result = await backend.announcements.get({
      query: { tag: URGENT_ANNOUNCEMENT_TAG },
    });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    const announcements = (result.data.announcements ??
      []) as UrgentAnnouncementListEntry[];
    return filterSectionsVisibleOn(announcements);
  } catch {
    return [];
  }
}

function toUrgentAnnouncement(
  entry: UrgentAnnouncementListEntry,
): UrgentAnnouncement {
  return {
    id: entry.cuid,
    title: entry.header ?? '',
    text: entry.body,
  };
}

/** Holds urgent announcements for the Announcements Bar. */
@Injectable({ providedIn: 'root' })
export class UrgentAnnouncements {
  private readonly list = inject(URGENT_ANNOUNCEMENTS_LIST);
  private loadGeneration = 0;

  // @relation(GSSC-PLLR-15, scope=range_start, role=Implementation)
  readonly announcements = signal<UrgentAnnouncement[]>([]);

  /** Test/helper override that replaces the current urgent announcement list. */
  setAnnouncements(announcements: UrgentAnnouncement[]): void {
    this.announcements.set(announcements);
  }

  /** Retrieve visible urgent announcements from the Unified Backend. */
  async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    const entries = await this.list();
    if (generation !== this.loadGeneration) return;
    this.announcements.set(entries.map(toUrgentAnnouncement));
  }
  // @relation(GSSC-PLLR-15, scope=range_end, role=Implementation)
}
