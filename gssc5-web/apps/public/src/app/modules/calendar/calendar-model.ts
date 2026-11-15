/** Featured-image side from event page_data (same vocabulary as Section). */
export type CalendarImagePosition = 'none' | 'left' | 'right';

/** One calendar day in the visible month grid (may be outside the month). */
export type CalendarDay = {
  year: number;
  month: number;
  day: number;
  inMonth: boolean;
};

/** Y/M/D parts for inclusive span math (month is 1–12). */
export type DateParts = {
  year: number;
  month: number;
  day: number;
};

/**
 * Public event row from Unified Backend GET /events, including linked page_data
 * fields when the list payload is expanded (GSSC5-30).
 */
export type CalendarEvent = {
  cuid: string;
  name: string;
  month: number;
  day: number;
  year: number;
  announcementStartMonth: number;
  announcementStartDay: number;
  announcementStartYear: number;
  time: string;
  duration: string;
  location: string;
  isPublic: boolean;
  pageDataCuid: string;
  header?: string | null;
  body?: string | null;
  resources?: readonly string[] | null;
  imageFile?: string | null;
  imagePosition?: CalendarImagePosition | null;
  startMonth?: number | null;
  startDay?: number | null;
  startYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  endYear?: number | null;
};

/** One week-row segment of a (possibly multi-day) event within the visible grid. */
export type WeekRowSegment = {
  eventCuid: string;
  title: string;
  start: DateParts;
  end: DateParts;
  weekIndex: number;
};

/** Chip/overlay title: prefer non-empty header, else catalog name. */
export function eventTitle(event: CalendarEvent): string {
  const header = event.header?.trim();
  if (header != null && header.length > 0) return header;
  return event.name;
}

function hasCompletePageDataSpan(event: CalendarEvent): boolean {
  return (
    event.startMonth != null &&
    event.startDay != null &&
    event.startYear != null &&
    event.endMonth != null &&
    event.endDay != null &&
    event.endYear != null
  );
}

/**
 * Inclusive placement span: page_data start→end when all six fields are set;
 * otherwise the single catalog event date.
 */
export function eventSpan(event: CalendarEvent): { start: DateParts; end: DateParts } {
  if (hasCompletePageDataSpan(event)) {
    return {
      start: {
        year: event.startYear!,
        month: event.startMonth!,
        day: event.startDay!,
      },
      end: {
        year: event.endYear!,
        month: event.endMonth!,
        day: event.endDay!,
      },
    };
  }
  const single: DateParts = {
    year: event.year,
    month: event.month,
    day: event.day,
  };
  return { start: single, end: single };
}

function dateKey(parts: DateParts): number {
  return parts.year * 10_000 + parts.month * 100 + parts.day;
}

export function dateInInclusiveSpan(
  day: DateParts,
  start: DateParts,
  end: DateParts,
): boolean {
  const key = dateKey(day);
  return key >= dateKey(start) && key <= dateKey(end);
}

/** Sunday-start week grid for `year`/`month` (1–12), including outside-month padding. */
export function visibleMonthDays(year: number, month: number): CalendarDay[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    days.push({
      year: prevYear,
      month: prevMonth,
      day: daysInPrev - i,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ year, month, day, inMonth: true });
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  let nextDay = 1;
  while (days.length % 7 !== 0) {
    days.push({
      year: nextYear,
      month: nextMonth,
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }

  return days;
}

/** Events whose inclusive span intersects any day of the visible calendar month. */
export function filterEventsIntersectingMonth(
  events: readonly CalendarEvent[],
  year: number,
  month: number,
): CalendarEvent[] {
  const monthStart: DateParts = { year, month, day: 1 };
  const monthEnd: DateParts = {
    year,
    month,
    day: new Date(year, month, 0).getDate(),
  };
  return events.filter((event) => {
    const { start, end } = eventSpan(event);
    return dateKey(start) <= dateKey(monthEnd) && dateKey(end) >= dateKey(monthStart);
  });
}

/** Events whose inclusive span includes the given calendar day. */
export function eventsOnDay(
  events: readonly CalendarEvent[],
  day: CalendarDay,
): CalendarEvent[] {
  const parts: DateParts = { year: day.year, month: day.month, day: day.day };
  return events.filter((event) => {
    const { start, end } = eventSpan(event);
    return dateInInclusiveSpan(parts, start, end);
  });
}

/**
 * Week-row segments for a multi-day (or single-day) event inside the visible
 * grid. Title is repeated on each segment when the span crosses week rows.
 */
export function weekRowSegments(
  event: CalendarEvent,
  visibleYear: number,
  visibleMonth: number,
): WeekRowSegment[] {
  const days = visibleMonthDays(visibleYear, visibleMonth);
  const { start, end } = eventSpan(event);
  const title = eventTitle(event);
  const indices: number[] = [];
  for (let i = 0; i < days.length; i += 1) {
    const cell = days[i]!;
    if (
      dateInInclusiveSpan(
        { year: cell.year, month: cell.month, day: cell.day },
        start,
        end,
      )
    ) {
      indices.push(i);
    }
  }
  if (indices.length === 0) return [];

  const segments: WeekRowSegment[] = [];
  let segStartIdx = indices[0]!;
  let prevIdx = indices[0]!;

  const flush = (fromIdx: number, toIdx: number) => {
    const from = days[fromIdx]!;
    const to = days[toIdx]!;
    segments.push({
      eventCuid: event.cuid,
      title,
      start: { year: from.year, month: from.month, day: from.day },
      end: { year: to.year, month: to.month, day: to.day },
      weekIndex: Math.floor(fromIdx / 7),
    });
  };

  for (let k = 1; k < indices.length; k += 1) {
    const curIdx = indices[k]!;
    const sameWeek = Math.floor(curIdx / 7) === Math.floor(prevIdx / 7);
    const contiguous = curIdx === prevIdx + 1;
    if (!sameWeek || !contiguous) {
      flush(segStartIdx, prevIdx);
      segStartIdx = curIdx;
    }
    prevIdx = curIdx;
  }
  flush(segStartIdx, prevIdx);
  return segments;
}

/** Month+year label for the month selectors chrome. */
export function monthYearLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Map page_data resource strings to Section-style name/href pairs. */
export function resourcesFromStrings(
  resources: readonly string[] | null | undefined,
): { name: string; href: string }[] {
  if (resources == null || resources.length === 0) return [];
  return resources.map((resource) => ({ name: resource, href: resource }));
}
