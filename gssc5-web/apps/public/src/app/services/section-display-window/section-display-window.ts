/** Inclusive calendar bounds from Unified Backend page_data / section payloads. */
export type SectionDisplayBounds = {
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
};

function completeDate(
  year: number | null,
  month: number | null,
  day: number | null,
): number | null {
  if (year === null || month === null || day === null) return null;
  return year * 10_000 + month * 100 + day;
}

function calendarOrdinal(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Whether a section with optional start/end bounds is visible on `onDate`.
 * Unset bounds do not restrict; a complete start requires onDate >= start;
 * a complete end requires onDate <= end (inclusive).
 */
// @relation(GSSC-PLLR-259, scope=range_start, role=Implementation)
export function isSectionVisibleOn(
  bounds: SectionDisplayBounds,
  onDate: Date = new Date(),
): boolean {
  const today = calendarOrdinal(onDate);
  const start = completeDate(bounds.startYear, bounds.startMonth, bounds.startDay);
  const end = completeDate(bounds.endYear, bounds.endMonth, bounds.endDay);
  if (start !== null && today < start) return false;
  if (end !== null && today > end) return false;
  return true;
}

/** Keep only sections whose display window includes `onDate`. */
export function filterSectionsVisibleOn<T extends SectionDisplayBounds>(
  sections: T[],
  onDate: Date = new Date(),
): T[] {
  return sections.filter((section) => isSectionVisibleOn(section, onDate));
}
// @relation(GSSC-PLLR-259, scope=range_end, role=Implementation)
