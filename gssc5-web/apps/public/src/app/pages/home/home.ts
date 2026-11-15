import { Component, inject, InjectionToken, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import {
  Carousel,
  type CarouselItem,
} from '../../modules/carousel/carousel';
import { Section, type SectionContents } from '../../modules/section/section';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';
import { backend } from '../../services/backend';
import { filterSectionsVisibleOn } from '../../services/section-display-window/section-display-window';

/** Backend tag that binds public home dynamic sections to this page. */
export const HOME_SECTIONS_TAG = 'home';

/** One public announcement list entry from Unified Backend GET /announcements. */
export type HomeAnnouncementListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  resources: string[];
  tags: string[];
  index: number;
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
  imageFile?: string | null;
  imagePosition?: 'none' | 'left' | 'right' | null;
};

/** One public section list entry from Unified Backend GET /sections. */
export type HomeSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
};

/** Public event row with optional linked page_data fields (GSSC5-30 expand). */
export type HomeEventEntry = {
  cuid: string;
  name: string;
  month: number;
  day: number;
  year: number;
  header?: string | null;
  body?: string | null;
  resources?: readonly string[] | null;
  imageFile?: string | null;
  imagePosition?: 'none' | 'left' | 'right' | null;
  startMonth?: number | null;
  startDay?: number | null;
  startYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  endYear?: number | null;
};

export type HomeAnnouncementsList = () => Promise<HomeAnnouncementListEntry[]>;
export type HomeEventsList = () => Promise<HomeEventEntry[]>;
export type HomeSectionListByTag = (
  tag: string,
) => Promise<HomeSectionListEntry[]>;

/** Default Unified Backend public announcement list. */
export const HOME_ANNOUNCEMENTS_LIST = new InjectionToken<HomeAnnouncementsList>(
  'HOME_ANNOUNCEMENTS_LIST',
  {
    providedIn: 'root',
    factory: () => defaultHomeAnnouncementsList,
  },
);

/** Default Unified Backend public events list. */
export const HOME_EVENTS_LIST = new InjectionToken<HomeEventsList>(
  'HOME_EVENTS_LIST',
  {
    providedIn: 'root',
    factory: () => defaultHomeEventsList,
  },
);

/** Default Unified Backend public section list filtered by tag. */
export const HOME_SECTION_LIST_BY_TAG =
  new InjectionToken<HomeSectionListByTag>('HOME_SECTION_LIST_BY_TAG', {
    providedIn: 'root',
    factory: () => defaultHomeSectionListByTag,
  });

async function defaultHomeAnnouncementsList(): Promise<
  HomeAnnouncementListEntry[]
> {
  try {
    const result = await backend.announcements.get();
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    const announcements = (result.data.announcements ??
      []) as HomeAnnouncementListEntry[];
    return filterSectionsVisibleOn(announcements);
  } catch {
    return [];
  }
}

async function defaultHomeEventsList(): Promise<HomeEventEntry[]> {
  try {
    const result = await backend.events.get();
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return (Array.isArray(result.data) ? result.data : []) as HomeEventEntry[];
  } catch {
    return [];
  }
}

async function defaultHomeSectionListByTag(
  tag: string,
): Promise<HomeSectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return filterSectionsVisibleOn(result.data as HomeSectionListEntry[]);
  } catch {
    return [];
  }
}

function hasCompleteSpan(event: HomeEventEntry): boolean {
  return (
    event.startMonth != null &&
    event.startDay != null &&
    event.startYear != null &&
    event.endMonth != null &&
    event.endDay != null &&
    event.endYear != null
  );
}

/** Occurrence date: complete details span start, else catalog Y/M/D. */
export function eventOccurrenceDate(event: HomeEventEntry): {
  year: number;
  month: number;
  day: number;
} {
  if (hasCompleteSpan(event)) {
    return {
      year: event.startYear!,
      month: event.startMonth!,
      day: event.startDay!,
    };
  }
  return { year: event.year, month: event.month, day: event.day };
}

/**
 * Whether an event occurrence falls within one calendar month before or after
 * `onDate` (inclusive).
 */
export function isWithinOneMonthOfOccurrence(
  occurrence: { year: number; month: number; day: number },
  onDate: Date = new Date(),
): boolean {
  const today = new Date(onDate.getFullYear(), onDate.getMonth(), onDate.getDate());
  const event = new Date(occurrence.year, occurrence.month - 1, occurrence.day);
  const before = new Date(today);
  before.setMonth(before.getMonth() - 1);
  const after = new Date(today);
  after.setMonth(after.getMonth() + 1);
  return event >= before && event <= after;
}

export function announcementToCarouselItem(
  entry: HomeAnnouncementListEntry,
): CarouselItem {
  return {
    id: entry.cuid,
    header: entry.header,
    body: entry.body,
    resources: entry.resources,
    imageFile: entry.imageFile ?? null,
    imagePosition: entry.imagePosition ?? null,
  };
}

export function eventToSectionContents(event: HomeEventEntry): SectionContents {
  const header =
    event.header != null && event.header.trim().length > 0
      ? event.header
      : event.name;
  const resources = (event.resources ?? [])
    .filter((resource) => resource.length > 0)
    .map((resource) => ({ name: resource, href: resource }));
  return {
    header,
    body: event.body ?? '',
    resources: resources.length > 0 ? resources : null,
    imageFile: event.imageFile ?? null,
    imagePosition: event.imagePosition ?? null,
  };
}

/**
 * Public Home Page (GSSC5-14): announcements carousel, special-event sections
 * within one month, and tagged home dynamic sections (including purpose when
 * authored). Featured Photos deferred — no BHLR-170 endpoint.
 */
// @relation(GSSC-PLLR-8, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-home-page',
  imports: [Carousel, Section, SectionFromCuid],
  templateUrl: './home.html',
})
export class HomePage {
  private readonly announcementsList = inject(HOME_ANNOUNCEMENTS_LIST);
  private readonly eventsList = inject(HOME_EVENTS_LIST);
  private readonly sectionListByTag = inject(HOME_SECTION_LIST_BY_TAG);
  private readonly route = inject(ActivatedRoute);
  private loadGeneration = 0;

  /** Focused announcement cuid from Announcements Bar deep link. */
  readonly focusedAnnouncementId = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('focusAnnouncement')),
    ),
    { initialValue: this.route.snapshot.queryParamMap.get('focusAnnouncement') },
  );

  /** Carousel Contents from visible public announcements. */
  readonly announcementItems = signal<CarouselItem[]>([]);

  /** Special-event Section Contents within one month of occurrence. */
  readonly specialEventSections = signal<SectionContents[]>([]);

  /** Home dynamic section cuids in Unified Backend section order. */
  readonly sectionCuids = signal<string[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-PLLR-311, GSSC-PLLR-314, GSSC-PLLR-317, scope=range_start, role=Implementation)
    const [announcements, events, sections] = await Promise.all([
      this.announcementsList(),
      this.eventsList(),
      this.sectionListByTag(HOME_SECTIONS_TAG),
    ]);
    if (generation !== this.loadGeneration) return;

    this.announcementItems.set(announcements.map(announcementToCarouselItem));

    const nearEvents = events.filter((event) =>
      isWithinOneMonthOfOccurrence(eventOccurrenceDate(event)),
    );
    this.specialEventSections.set(nearEvents.map(eventToSectionContents));

    // Backend GET /sections already returns index order; do not invent FE ordering.
    this.sectionCuids.set(sections.map((entry) => entry.cuid));
    // @relation(GSSC-PLLR-311, GSSC-PLLR-314, GSSC-PLLR-317, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-8, scope=range_end, role=Implementation)
