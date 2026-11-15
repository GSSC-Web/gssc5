import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';
import {
  SECTION_FEATURED_IMAGE_RESOLVE,
  type SectionImagePosition,
} from '../section/section';
import {
  eventsOnDay,
  eventTitle,
  filterEventsIntersectingMonth,
  monthYearLabel,
  resourcesFromStrings,
  visibleMonthDays,
  weekRowSegments,
  type CalendarDay,
  type CalendarEvent,
  type CalendarImagePosition,
} from './calendar-model';

export type CalendarEventsListGet = () => Promise<CalendarEvent[] | null>;

/** Default Unified Backend events list used by the Public Calendar. */
export const CALENDAR_EVENTS_LIST_GET = new InjectionToken<CalendarEventsListGet>(
  'CALENDAR_EVENTS_LIST_GET',
  {
    providedIn: 'root',
    factory: () => defaultCalendarEventsListGet,
  },
);

async function defaultCalendarEventsListGet(): Promise<CalendarEvent[] | null> {
  try {
    const result = await backend.events.get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data as CalendarEvent[];
  } catch {
    return null;
  }
}

function parseImagePosition(
  value: string | null | undefined,
): CalendarImagePosition | null {
  if (value === 'none' || value === 'left' || value === 'right') return value;
  return null;
}

/**
 * Public month calendar (GSSC5-30): prev/next month chrome, week grid with
 * event chips, and an event detail overlay matching Prompt Overlay dismiss chrome.
 */
@Component({
  selector: 'gssc-calendar',
  templateUrl: './calendar.html',
})
export class Calendar {
  private readonly listGet = inject(CALENDAR_EVENTS_LIST_GET);
  private readonly imageResolve = inject(SECTION_FEATURED_IMAGE_RESOLVE);
  private readonly destroyRef = inject(DestroyRef);
  private imageLoadGeneration = 0;
  private objectUrlToRevoke: string | null = null;

  private readonly now = new Date();

  /** Visible calendar year (local). */
  readonly visibleYear = signal(this.now.getFullYear());

  /** Visible calendar month 1–12 (local). */
  readonly visibleMonth = signal(this.now.getMonth() + 1);

  /** All events loaded from the Unified Backend list. */
  readonly events = signal<CalendarEvent[]>([]);

  /** Selected event for the detail overlay; null when closed. */
  readonly selectedEvent = signal<CalendarEvent | null>(null);

  /** Resolved object URL for the selected event featured image. */
  readonly featuredImageUrl = signal<string | null>(null);

  readonly monthLabel = computed(() =>
    monthYearLabel(this.visibleYear(), this.visibleMonth()),
  );

  readonly gridDays = computed(() =>
    visibleMonthDays(this.visibleYear(), this.visibleMonth()),
  );

  readonly monthEvents = computed(() =>
    filterEventsIntersectingMonth(
      this.events(),
      this.visibleYear(),
      this.visibleMonth(),
    ),
  );

  readonly weekRows = computed(() => {
    const days = this.gridDays();
    const rows: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  });

  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

  readonly selectedTitle = computed(() => {
    const event = this.selectedEvent();
    return event == null ? '' : eventTitle(event);
  });

  readonly selectedBody = computed(() => this.selectedEvent()?.body ?? '');

  readonly selectedResources = computed(() =>
    resourcesFromStrings(this.selectedEvent()?.resources),
  );

  readonly selectedImagePosition = computed((): SectionImagePosition | null =>
    parseImagePosition(this.selectedEvent()?.imagePosition),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeObjectUrl());

    void this.loadEvents();

    effect(() => {
      const event = this.selectedEvent();
      void this.resolveFeaturedImage(event);
    });
  }

  // @relation(GSSC-PLLR-263, scope=range_start, role=Implementation)
  private async loadEvents(): Promise<void> {
    const entries = await this.listGet();
    this.events.set(entries === null ? [] : entries);
  }

  protected chipsForDay(day: CalendarDay): CalendarEvent[] {
    return eventsOnDay(this.monthEvents(), day);
  }

  protected chipTitle(event: CalendarEvent): string {
    return eventTitle(event);
  }

  /** Exposed for tests asserting multi-day week-row title repeat. */
  segmentsForEvent(event: CalendarEvent) {
    return weekRowSegments(event, this.visibleYear(), this.visibleMonth());
  }

  protected selectEvent(event: CalendarEvent): void {
    this.selectedEvent.set(event);
  }
  // @relation(GSSC-PLLR-263, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-266, scope=range_start, role=Implementation)
  protected goPrevMonth(): void {
    const month = this.visibleMonth();
    if (month === 1) {
      this.visibleMonth.set(12);
      this.visibleYear.update((year) => year - 1);
    } else {
      this.visibleMonth.set(month - 1);
    }
  }

  protected goNextMonth(): void {
    const month = this.visibleMonth();
    if (month === 12) {
      this.visibleMonth.set(1);
      this.visibleYear.update((year) => year + 1);
    } else {
      this.visibleMonth.set(month + 1);
    }
  }
  // @relation(GSSC-PLLR-266, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-275, scope=range_start, role=Implementation)
  protected dismissOverlay(): void {
    this.selectedEvent.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.selectedEvent() != null) this.dismissOverlay();
  }
  // @relation(GSSC-PLLR-275, scope=range_end, role=Implementation)

  protected showFeaturedImage(): boolean {
    const position = this.selectedImagePosition();
    const file = this.selectedEvent()?.imageFile;
    if (position !== 'left' && position !== 'right') return false;
    if (file == null || file.length === 0) return false;
    return this.featuredImageUrl() != null;
  }

  protected hasSelectedResources(): boolean {
    return this.selectedResources().length > 0;
  }

  private async resolveFeaturedImage(event: CalendarEvent | null): Promise<void> {
    const generation = ++this.imageLoadGeneration;
    const position = parseImagePosition(event?.imagePosition);
    const file = event?.imageFile;
    if (
      event == null ||
      (position !== 'left' && position !== 'right') ||
      file == null ||
      file.length === 0
    ) {
      this.revokeObjectUrl();
      this.featuredImageUrl.set(null);
      return;
    }
    const url = await this.imageResolve(file);
    if (generation !== this.imageLoadGeneration) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      return;
    }
    this.revokeObjectUrl();
    if (url?.startsWith('blob:')) this.objectUrlToRevoke = url;
    this.featuredImageUrl.set(url);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrlToRevoke != null) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }
}
