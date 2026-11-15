import { Component, InjectionToken, inject, signal } from '@angular/core';
import { Calendar } from '../../modules/calendar/calendar';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';
import { backend } from '../../services/backend';
import { filterSectionsVisibleOn } from '../../services/section-display-window/section-display-window';

/** Backend tag that binds public calendar-page notice sections to this page. */
export const CALENDAR_PAGE_NOTICE_TAG = 'calendar';

/** One public section list entry from Unified Backend GET /sections. */
export type CalendarPageSectionListEntry = {
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

export type CalendarPageSectionListByTag = (
  tag: string,
) => Promise<CalendarPageSectionListEntry[]>;

/** Default Unified Backend public section list filtered by tag. */
export const CALENDAR_PAGE_SECTION_LIST_BY_TAG =
  new InjectionToken<CalendarPageSectionListByTag>(
    'CALENDAR_PAGE_SECTION_LIST_BY_TAG',
    {
      providedIn: 'root',
      factory: () => defaultCalendarPageSectionListByTag,
    },
  );

async function defaultCalendarPageSectionListByTag(
  tag: string,
): Promise<CalendarPageSectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return filterSectionsVisibleOn(result.data);
  } catch {
    return [];
  }
}

/**
 * Public Calendar Page (GSSC5-17): calendar-tagged notice sections via Section
 * From CUID above the Public Calendar month view (GSSC5-30).
 */
// @relation(GSSC-PLLR-11, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-calendar-page',
  imports: [SectionFromCuid, Calendar],
  templateUrl: './calendar-page.html',
})
export class CalendarPage {
  private readonly listByTag = inject(CALENDAR_PAGE_SECTION_LIST_BY_TAG);
  private loadGeneration = 0;

  /** Calendar-page notice section cuids in Unified Backend section order. */
  readonly noticeCuids = signal<string[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-PLLR-320, GSSC-PLLR-323, GSSC-PLLR-326, scope=range_start, role=Implementation)
    const sections = await this.listByTag(CALENDAR_PAGE_NOTICE_TAG);
    if (generation !== this.loadGeneration) return;
    // Backend GET /sections already returns index order; do not invent FE ordering.
    this.noticeCuids.set(sections.map((entry) => entry.cuid));
    // @relation(GSSC-PLLR-320, GSSC-PLLR-323, GSSC-PLLR-326, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-11, scope=range_end, role=Implementation)
