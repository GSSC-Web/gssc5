import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { SECTION_FEATURED_IMAGE_RESOLVE } from '../section/section';
import {
  CALENDAR_EVENTS_LIST_GET,
  Calendar,
  type CalendarEventsListGet,
} from './calendar';
import {
  eventSpan,
  eventTitle,
  filterEventsIntersectingMonth,
  visibleMonthDays,
  weekRowSegments,
  type CalendarEvent,
} from './calendar-model';

function sampleEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    cuid: 'evt_sample',
    name: 'Sample Event',
    month: 3,
    day: 15,
    year: 2026,
    announcementStartMonth: 3,
    announcementStartDay: 1,
    announcementStartYear: 2026,
    time: '10:00',
    duration: '1 hour',
    location: 'Hall',
    isPublic: true,
    pageDataCuid: 'pd_sample',
    header: 'Sample Header',
    body: 'Sample body content.',
    resources: ['https://example.com/guide'],
    imageFile: null,
    imagePosition: null,
    startMonth: 3,
    startDay: 15,
    startYear: 2026,
    endMonth: 3,
    endDay: 15,
    endYear: 2026,
    ...overrides,
  };
}

/** Multi-day Fri–Mon span that crosses a week boundary in March 2026 (Fri 13–Mon 16). */
const crossWeekEvent = sampleEvent({
  cuid: 'evt_cross_week',
  name: 'Cross Week Catalog',
  header: 'Cross Week Title',
  month: 3,
  day: 13,
  year: 2026,
  startMonth: 3,
  startDay: 13,
  startYear: 2026,
  endMonth: 3,
  endDay: 16,
  endYear: 2026,
  body: 'Spans Friday through Monday.',
  resources: ['https://example.com/a', 'https://example.com/b'],
  imageFile: 'img_featured',
  imagePosition: 'left',
});

const singleDayEvent = sampleEvent({
  cuid: 'evt_single',
  name: 'Single Day',
  header: '',
  month: 3,
  day: 20,
  year: 2026,
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
  body: 'Fallback single-day body.',
  resources: [],
  imageFile: null,
  imagePosition: 'none',
});

async function setupCalendar(
  listGet: CalendarEventsListGet,
  options?: {
    imageUrl?: string | null;
    visibleYear?: number;
    visibleMonth?: number;
  },
) {
  TestBed.resetTestingModule();
  const imageUrl =
    options?.imageUrl === undefined ? 'blob:calendar-test/featured' : options.imageUrl;
  await TestBed.configureTestingModule({
    imports: [Calendar],
    providers: [
      { provide: CALENDAR_EVENTS_LIST_GET, useValue: listGet },
      {
        provide: SECTION_FEATURED_IMAGE_RESOLVE,
        useValue: async () => imageUrl,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Calendar);
  const calendar = fixture.componentInstance;
  if (options?.visibleYear != null) calendar.visibleYear.set(options.visibleYear);
  if (options?.visibleMonth != null) calendar.visibleMonth.set(options.visibleMonth);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), calendar };
}

function dayCell(root: HTMLElement, day: number, inMonth = true): HTMLElement | null {
  const cells = [...root.querySelectorAll<HTMLElement>('.gssc-calendar__day')];
  return (
    cells.find(
      (cell) =>
        cell.getAttribute('data-day') === String(day) &&
        cell.getAttribute('data-in-month') === (inMonth ? 'true' : 'false'),
    ) ?? null
  );
}

function chipTitlesOnDay(root: HTMLElement, day: number): string[] {
  const cell = dayCell(root, day);
  if (cell == null) return [];
  return [...cell.querySelectorAll('.gssc-calendar__chip')].map(
    (el) => el.textContent?.trim() ?? '',
  );
}

async function openEvent(
  fixture: Awaited<ReturnType<typeof setupCalendar>>['fixture'],
  root: HTMLElement,
  cuid: string,
): Promise<HTMLElement> {
  const chip = root.querySelector<HTMLButtonElement>(
    `.gssc-calendar__chip[data-event-cuid="${cuid}"]`,
  )!;
  chip.click();
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return nativeElement(fixture);
}

// @relation(GSSC-PLLR-263, scope=range_start, role=Test)
test('GSSC-PLLR-263 Semantic', async () => {
  let listCalls = 0;
  const { fixture, root, calendar } = await setupCalendar(
    async () => {
      listCalls += 1;
      return [crossWeekEvent, singleDayEvent];
    },
    { visibleYear: 2026, visibleMonth: 3 },
  );

  expect(listCalls).toBe(1);
  expect(calendar.events()).toHaveLength(2);
  expect(root.querySelector('.gssc-calendar')).not.toBeNull();
  expect(root.querySelector('.gssc-calendar__prev')).not.toBeNull();
  expect(root.querySelector('.gssc-calendar__next')).not.toBeNull();
  expect(root.querySelector('.gssc-calendar__grid')).not.toBeNull();
  expect(chipTitlesOnDay(root, 13)).toContain('Cross Week Title');
  expect(chipTitlesOnDay(root, 20)).toContain('Single Day');

  expect(root.querySelector('.gssc-calendar-overlay')).toBeNull();
  await openEvent(fixture, root, 'evt_cross_week');
  expect(nativeElement(fixture).querySelector('.gssc-calendar-overlay')).not.toBeNull();
  expect(textContent(nativeElement(fixture), '.gssc-calendar-overlay__title')).toBe(
    'Cross Week Title',
  );
});
// @relation(GSSC-PLLR-263, scope=range_end, role=Test)

// @relation(GSSC-PLLR-264, scope=range_start, role=Test)
test('GSSC-PLLR-264 Syntactic', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const host = root.querySelector<HTMLElement>('.gssc-calendar')!;
  const selectors = root.querySelector<HTMLElement>('.gssc-calendar__selectors')!;
  const grid = root.querySelector<HTMLElement>('.gssc-calendar__grid')!;
  expect(host.classList.contains('w-full')).toBe(true);
  expect(selectors.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-264, scope=range_end, role=Test)

// @relation(GSSC-PLLR-265, scope=range_start, role=Test)
test('GSSC-PLLR-265 Lexical', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const host = root.querySelector<HTMLElement>('.gssc-calendar')!;
  expect(host.classList.contains('bg-gssc-white')).toBe(true);
  expect(host.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(host.classList.contains('border-gssc-gray')).toBe(true);
  expect(host.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-265, scope=range_end, role=Test)

// @relation(GSSC-PLLR-266, scope=range_start, role=Test)
test('GSSC-PLLR-266 Semantic', async () => {
  const { fixture, root, calendar } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  expect(textContent(root, '.gssc-calendar__month-label')).toBe('March 2026');

  root.querySelector<HTMLButtonElement>('.gssc-calendar__next')!.click();
  fixture.detectChanges();
  expect(calendar.visibleMonth()).toBe(4);
  expect(calendar.visibleYear()).toBe(2026);
  expect(textContent(nativeElement(fixture), '.gssc-calendar__month-label')).toBe('April 2026');

  nativeElement(fixture).querySelector<HTMLButtonElement>('.gssc-calendar__prev')!.click();
  fixture.detectChanges();
  expect(calendar.visibleMonth()).toBe(3);
  expect(textContent(nativeElement(fixture), '.gssc-calendar__month-label')).toBe('March 2026');

  calendar.visibleMonth.set(1);
  calendar.visibleYear.set(2026);
  fixture.detectChanges();
  nativeElement(fixture).querySelector<HTMLButtonElement>('.gssc-calendar__prev')!.click();
  fixture.detectChanges();
  expect(calendar.visibleMonth()).toBe(12);
  expect(calendar.visibleYear()).toBe(2025);
});
// @relation(GSSC-PLLR-266, scope=range_end, role=Test)

// @relation(GSSC-PLLR-267, scope=range_start, role=Test)
test('GSSC-PLLR-267 Syntactic', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const selectors = root.querySelector<HTMLElement>('.gssc-calendar__selectors')!;
  const prev = root.querySelector<HTMLElement>('.gssc-calendar__prev')!;
  const label = root.querySelector<HTMLElement>('.gssc-calendar__month-label')!;
  const next = root.querySelector<HTMLElement>('.gssc-calendar__next')!;
  const grid = root.querySelector<HTMLElement>('.gssc-calendar__grid')!;
  expect(selectors.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(selectors.classList.contains('justify-between')).toBe(true);
  expect(prev.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(label.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-267, scope=range_end, role=Test)

// @relation(GSSC-PLLR-268, scope=range_start, role=Test)
test('GSSC-PLLR-268 Lexical', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const selectors = root.querySelector<HTMLElement>('.gssc-calendar__selectors')!;
  const prev = root.querySelector<HTMLElement>('.gssc-calendar__prev')!;
  const next = root.querySelector<HTMLElement>('.gssc-calendar__next')!;
  const label = root.querySelector<HTMLElement>('.gssc-calendar__month-label')!;
  expect(selectors.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(selectors.classList.contains('font-sans')).toBe(true);
  expect(prev.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(prev.classList.contains('font-sans')).toBe(true);
  expect(next.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(label.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(label.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-268, scope=range_end, role=Test)

// @relation(GSSC-PLLR-269, scope=range_start, role=Test)
test('GSSC-PLLR-269 Semantic', async () => {
  const { root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const cell = dayCell(root, 14)!;
  expect(textContent(cell, '.gssc-calendar__day-number')).toBe('14');
  expect(chipTitlesOnDay(root, 13)).toEqual(['Cross Week Title']);
  expect(chipTitlesOnDay(root, 14)).toEqual(['Cross Week Title']);
  expect(chipTitlesOnDay(root, 15)).toEqual(['Cross Week Title']);
  expect(chipTitlesOnDay(root, 16)).toEqual(['Cross Week Title']);
  expect(chipTitlesOnDay(root, 17)).toEqual([]);
});
// @relation(GSSC-PLLR-269, scope=range_end, role=Test)

// @relation(GSSC-PLLR-270, scope=range_start, role=Test)
test('GSSC-PLLR-270 Syntactic', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const weekdays = [...root.querySelectorAll('.gssc-calendar__weekday')].map(
    (el) => el.textContent?.trim() ?? '',
  );
  expect(weekdays).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const weeks = root.querySelectorAll('.gssc-calendar__week');
  expect(weeks.length).toBeGreaterThan(0);
  for (const week of weeks) {
    expect(week.querySelectorAll('.gssc-calendar__day').length).toBe(7);
  }
  const outside = root.querySelector('.gssc-calendar__day[data-in-month="false"]');
  expect(outside).not.toBeNull();
  const inside = root.querySelector('.gssc-calendar__day[data-in-month="true"]');
  expect(inside).not.toBeNull();
  expect(visibleMonthDays(2026, 3).some((d) => !d.inMonth)).toBe(true);
});
// @relation(GSSC-PLLR-270, scope=range_end, role=Test)

// @relation(GSSC-PLLR-271, scope=range_start, role=Test)
test('GSSC-PLLR-271 Lexical', async () => {
  const { root } = await setupCalendar(async () => [], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const inMonth = root.querySelector<HTMLElement>(
    '.gssc-calendar__day[data-in-month="true"] .gssc-calendar__day-number',
  )!;
  const outside = root.querySelector<HTMLElement>(
    '.gssc-calendar__day[data-in-month="false"] .gssc-calendar__day-number',
  )!;
  expect(inMonth.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(outside.classList.contains('text-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-271, scope=range_end, role=Test)

// @relation(GSSC-PLLR-272, scope=range_start, role=Test)
test('GSSC-PLLR-272 Semantic', async () => {
  const { fixture, root, calendar } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });

  for (const day of [13, 14, 15, 16]) {
    expect(chipTitlesOnDay(root, day)).toContain('Cross Week Title');
  }

  const segments = weekRowSegments(crossWeekEvent, 2026, 3);
  expect(segments.length).toBeGreaterThanOrEqual(2);
  expect(segments.every((segment) => segment.title === 'Cross Week Title')).toBe(true);
  expect(new Set(segments.map((segment) => segment.weekIndex)).size).toBeGreaterThanOrEqual(2);
  expect(calendar.segmentsForEvent(crossWeekEvent).map((s) => s.title)).toEqual(
    segments.map((s) => s.title),
  );

  const chip = root.querySelector<HTMLButtonElement>(
    '.gssc-calendar__chip[data-event-cuid="evt_cross_week"]',
  )!;
  chip.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(calendar.selectedEvent()?.cuid).toBe('evt_cross_week');
});
// @relation(GSSC-PLLR-272, scope=range_end, role=Test)

// @relation(GSSC-PLLR-273, scope=range_start, role=Test)
test('GSSC-PLLR-273 Syntactic', async () => {
  const { root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const cell = dayCell(root, 13)!;
  const chips = cell.querySelector('.gssc-calendar__chips');
  const chip = cell.querySelector('.gssc-calendar__chip');
  expect(chips).not.toBeNull();
  expect(chip).not.toBeNull();
  expect(cell.contains(chips!)).toBe(true);
  expect(chips!.contains(chip!)).toBe(true);
});
// @relation(GSSC-PLLR-273, scope=range_end, role=Test)

// @relation(GSSC-PLLR-274, scope=range_start, role=Test)
test('GSSC-PLLR-274 Lexical', async () => {
  const { root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const chip = root.querySelector<HTMLElement>('.gssc-calendar__chip')!;
  expect(
    chip.classList.contains('bg-gssc-light-green') || chip.classList.contains('bg-gssc-cream'),
  ).toBe(true);
  expect(chip.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(chip.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-274, scope=range_end, role=Test)

// @relation(GSSC-PLLR-275, scope=range_start, role=Test)
test('GSSC-PLLR-275 Semantic', async () => {
  const { fixture, root, calendar } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  let openRoot = await openEvent(fixture, root, 'evt_cross_week');
  expect(textContent(openRoot, '.gssc-calendar-overlay__title')).toBe('Cross Week Title');
  expect(textContent(openRoot, '.gssc-calendar-overlay__body')).toBe(
    'Spans Friday through Monday.',
  );
  expect(openRoot.querySelector('.gssc-calendar-overlay__image')).not.toBeNull();
  expect(
    [...openRoot.querySelectorAll('.gssc-calendar-overlay__resource')].map(
      (el) => el.textContent?.trim() ?? '',
    ),
  ).toEqual(['https://example.com/a', 'https://example.com/b']);

  openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay')!.click();
  fixture.detectChanges();
  expect(calendar.selectedEvent()).not.toBeNull();

  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(calendar.selectedEvent()).toBeNull();
  expect(nativeElement(fixture).querySelector('.gssc-calendar-overlay')).toBeNull();

  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_cross_week');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  expect(calendar.selectedEvent()).toBeNull();
});
// @relation(GSSC-PLLR-275, scope=range_end, role=Test)

// @relation(GSSC-PLLR-276, scope=range_start, role=Test)
test('GSSC-PLLR-276 Syntactic', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const shell = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay')!;
  const panel = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__panel')!;
  expect(shell.classList.contains('fixed')).toBe(true);
  expect(shell.classList.contains('inset-0')).toBe(true);
  expect(panel.classList.contains('h-dvh')).toBe(true);
  expect(panel.classList.contains('w-dvw')).toBe(true);
  expect(panel.classList.contains('sm:max-h-[75dvh]')).toBe(true);
  expect(panel.classList.contains('sm:max-w-[75vw]')).toBe(true);
});
// @relation(GSSC-PLLR-276, scope=range_end, role=Test)

// @relation(GSSC-PLLR-277, scope=range_start, role=Test)
test('GSSC-PLLR-277 Lexical', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const shell = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay')!;
  const panel = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__panel')!;
  expect(shell.classList.contains('bg-gssc-gray/25')).toBe(true);
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(panel.classList.contains('border-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-277, scope=range_end, role=Test)

// @relation(GSSC-PLLR-278, scope=range_start, role=Test)
test('GSSC-PLLR-278 Semantic', async () => {
  const withHeader = sampleEvent({
    cuid: 'evt_header',
    name: 'Catalog Name',
    header: 'Detail Header',
    month: 3,
    day: 10,
    year: 2026,
    startMonth: 3,
    startDay: 10,
    startYear: 2026,
    endMonth: 3,
    endDay: 10,
    endYear: 2026,
  });
  const noHeader = sampleEvent({
    cuid: 'evt_name',
    name: 'Name Only',
    header: '   ',
    month: 3,
    day: 11,
    year: 2026,
    startMonth: 3,
    startDay: 11,
    startYear: 2026,
    endMonth: 3,
    endDay: 11,
    endYear: 2026,
  });
  expect(eventTitle(withHeader)).toBe('Detail Header');
  expect(eventTitle(noHeader)).toBe('Name Only');

  const { fixture, root } = await setupCalendar(async () => [withHeader, noHeader], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  let openRoot = await openEvent(fixture, root, 'evt_header');
  expect(textContent(openRoot, '.gssc-calendar-overlay__title')).toBe('Detail Header');
  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_name');
  expect(textContent(openRoot, '.gssc-calendar-overlay__title')).toBe('Name Only');
});
// @relation(GSSC-PLLR-278, scope=range_end, role=Test)

// @relation(GSSC-PLLR-279, scope=range_start, role=Test)
test('GSSC-PLLR-279 Syntactic', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const header = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__header')!;
  const title = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__title')!;
  const body = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__body')!;
  expect(header.contains(title)).toBe(true);
  expect(title.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-279, scope=range_end, role=Test)

// @relation(GSSC-PLLR-280, scope=range_start, role=Test)
test('GSSC-PLLR-280 Lexical', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const title = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__title')!;
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(title.classList.contains('font-semibold')).toBe(true);
  expect(title.classList.contains('text-[1.5em]')).toBe(true);
});
// @relation(GSSC-PLLR-280, scope=range_end, role=Test)

// @relation(GSSC-PLLR-281, scope=range_start, role=Test)
test('GSSC-PLLR-281 Semantic', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  expect(textContent(openRoot, '.gssc-calendar-overlay__body')).toBe(
    'Spans Friday through Monday.',
  );
});
// @relation(GSSC-PLLR-281, scope=range_end, role=Test)

// @relation(GSSC-PLLR-282, scope=range_start, role=Test)
test('GSSC-PLLR-282 Syntactic', async () => {
  const noImage = sampleEvent({
    cuid: 'evt_body_only',
    header: 'Body Only',
    body: 'Just body.',
    month: 3,
    day: 12,
    year: 2026,
    startMonth: 3,
    startDay: 12,
    startYear: 2026,
    endMonth: 3,
    endDay: 12,
    endYear: 2026,
    imageFile: null,
    imagePosition: null,
    resources: [],
  });
  const { fixture, root } = await setupCalendar(async () => [noImage], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_body_only');
  const title = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__title')!;
  const body = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__body')!;
  expect(title.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-282, scope=range_end, role=Test)

// @relation(GSSC-PLLR-283, scope=range_start, role=Test)
test('GSSC-PLLR-283 Lexical', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const body = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__body')!;
  expect(body.classList.contains('text-base')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-283, scope=range_end, role=Test)

// @relation(GSSC-PLLR-284, scope=range_start, role=Test)
test('GSSC-PLLR-284 Semantic', async () => {
  const left = sampleEvent({
    cuid: 'evt_img_left',
    header: 'Left Image',
    month: 3,
    day: 5,
    year: 2026,
    startMonth: 3,
    startDay: 5,
    startYear: 2026,
    endMonth: 3,
    endDay: 5,
    endYear: 2026,
    imageFile: 'img_left',
    imagePosition: 'left',
    resources: [],
  });
  const none = sampleEvent({
    cuid: 'evt_img_none',
    header: 'No Image',
    month: 3,
    day: 6,
    year: 2026,
    startMonth: 3,
    startDay: 6,
    startYear: 2026,
    endMonth: 3,
    endDay: 6,
    endYear: 2026,
    imageFile: 'img_none',
    imagePosition: 'none',
    resources: [],
  });
  const missing = sampleEvent({
    cuid: 'evt_img_missing',
    header: 'Missing File',
    month: 3,
    day: 7,
    year: 2026,
    startMonth: 3,
    startDay: 7,
    startYear: 2026,
    endMonth: 3,
    endDay: 7,
    endYear: 2026,
    imageFile: null,
    imagePosition: 'right',
    resources: [],
  });

  const { fixture, root } = await setupCalendar(async () => [left, none, missing], {
    visibleYear: 2026,
    visibleMonth: 3,
  });

  let openRoot = await openEvent(fixture, root, 'evt_img_left');
  expect(openRoot.querySelector('.gssc-calendar-overlay__image')).not.toBeNull();
  expect(
    openRoot.querySelector('.gssc-calendar-overlay__media')?.getAttribute('data-image-position'),
  ).toBe('left');
  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_img_none');
  expect(openRoot.querySelector('.gssc-calendar-overlay__image')).toBeNull();
  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_img_missing');
  expect(openRoot.querySelector('.gssc-calendar-overlay__image')).toBeNull();
});
// @relation(GSSC-PLLR-284, scope=range_end, role=Test)

// @relation(GSSC-PLLR-285, scope=range_start, role=Test)
test('GSSC-PLLR-285 Syntactic', async () => {
  const left = sampleEvent({
    cuid: 'evt_img_syn',
    header: 'Image Syn',
    month: 3,
    day: 8,
    year: 2026,
    startMonth: 3,
    startDay: 8,
    startYear: 2026,
    endMonth: 3,
    endDay: 8,
    endYear: 2026,
    imageFile: 'img_syn',
    imagePosition: 'left',
    resources: [],
  });
  const right = sampleEvent({
    ...left,
    cuid: 'evt_img_right',
    day: 9,
    startDay: 9,
    endDay: 9,
    imagePosition: 'right',
  });
  const { fixture, root } = await setupCalendar(async () => [left, right], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  let openRoot = await openEvent(fixture, root, 'evt_img_syn');
  const media = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__media')!;
  const image = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__image')!;
  expect(media.classList.contains('flex-col')).toBe(true);
  expect(media.classList.contains('sm:flex-row')).toBe(true);
  expect(image.classList.contains('max-w-[60%]')).toBe(true);
  expect(image.classList.contains('max-h-[40%]')).toBe(true);
  const title = openRoot.querySelector('.gssc-calendar-overlay__title')!;
  expect(title.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_img_right');
  expect(
    openRoot
      .querySelector<HTMLElement>('.gssc-calendar-overlay__media')!
      .classList.contains('sm:flex-row-reverse'),
  ).toBe(true);
});
// @relation(GSSC-PLLR-285, scope=range_end, role=Test)

// @relation(GSSC-PLLR-286, scope=range_start, role=Test)
test('GSSC-PLLR-286 Lexical', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const image = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__image')!;
  expect(image.classList.contains('object-contain')).toBe(true);
  expect(image.classList.contains('border')).toBe(false);
});
// @relation(GSSC-PLLR-286, scope=range_end, role=Test)

// @relation(GSSC-PLLR-287, scope=range_start, role=Test)
test('GSSC-PLLR-287 Semantic', async () => {
  const withResources = sampleEvent({
    cuid: 'evt_res',
    header: 'With Resources',
    month: 3,
    day: 18,
    year: 2026,
    startMonth: 3,
    startDay: 18,
    startYear: 2026,
    endMonth: 3,
    endDay: 18,
    endYear: 2026,
    resources: ['https://example.com/one', 'https://example.com/two'],
    imageFile: null,
    imagePosition: null,
  });
  const emptyResources = sampleEvent({
    cuid: 'evt_no_res',
    header: 'No Resources',
    month: 3,
    day: 19,
    year: 2026,
    startMonth: 3,
    startDay: 19,
    startYear: 2026,
    endMonth: 3,
    endDay: 19,
    endYear: 2026,
    resources: [],
    imageFile: null,
    imagePosition: null,
  });
  const { fixture, root } = await setupCalendar(async () => [withResources, emptyResources], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  let openRoot = await openEvent(fixture, root, 'evt_res');
  const links = [...openRoot.querySelectorAll<HTMLAnchorElement>('.gssc-calendar-overlay__resource')];
  expect(links.map((link) => link.textContent?.trim())).toEqual([
    'https://example.com/one',
    'https://example.com/two',
  ]);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    'https://example.com/one',
    'https://example.com/two',
  ]);
  openRoot.querySelector<HTMLButtonElement>('.gssc-calendar-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  openRoot = await openEvent(fixture, nativeElement(fixture), 'evt_no_res');
  expect(openRoot.querySelector('.gssc-calendar-overlay__resources')).toBeNull();
});
// @relation(GSSC-PLLR-287, scope=range_end, role=Test)

// @relation(GSSC-PLLR-288, scope=range_start, role=Test)
test('GSSC-PLLR-288 Syntactic', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const strip = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__resources')!;
  expect(strip.classList.contains('flex')).toBe(true);
  expect(strip.classList.contains('justify-start') || strip.classList.contains('items-center')).toBe(
    true,
  );
  expect(strip.querySelectorAll('.gssc-calendar-overlay__resource').length).toBe(2);
});
// @relation(GSSC-PLLR-288, scope=range_end, role=Test)

// @relation(GSSC-PLLR-289, scope=range_start, role=Test)
test('GSSC-PLLR-289 Lexical', async () => {
  const { fixture, root } = await setupCalendar(async () => [crossWeekEvent], {
    visibleYear: 2026,
    visibleMonth: 3,
  });
  const openRoot = await openEvent(fixture, root, 'evt_cross_week');
  const button = openRoot.querySelector<HTMLElement>('.gssc-calendar-overlay__resource')!;
  expect(button.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(button.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(button.classList.contains('bg-gssc-white')).toBe(true);
});
// @relation(GSSC-PLLR-289, scope=range_end, role=Test)

test('calendar model span fallback and month filter', () => {
  const fallback = sampleEvent({
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    month: 4,
    day: 2,
    year: 2026,
  });
  expect(eventSpan(fallback)).toEqual({
    start: { year: 2026, month: 4, day: 2 },
    end: { year: 2026, month: 4, day: 2 },
  });
  expect(filterEventsIntersectingMonth([crossWeekEvent, fallback], 2026, 3)).toEqual([
    crossWeekEvent,
  ]);
  expect(filterEventsIntersectingMonth([crossWeekEvent, fallback], 2026, 4)).toEqual([fallback]);
});
