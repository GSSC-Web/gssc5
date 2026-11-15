import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  CALENDAR_EVENTS_LIST_GET,
} from '../../modules/calendar/calendar';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import {
  CALENDAR_PAGE_NOTICE_TAG,
  CALENDAR_PAGE_SECTION_LIST_BY_TAG,
  CalendarPage,
  type CalendarPageSectionListEntry,
} from './calendar-page';

const unsetBounds = {
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
} as const;

const firstSection: BackendSectionData = {
  cuid: 'calendar_notice_cuid_1',
  header: 'Calendar Notice',
  body: 'Miscellaneous calendar-page notice supplied by the backend section body.',
  resources: [],
  tags: [CALENDAR_PAGE_NOTICE_TAG],
  index: 1,
  ...unsetBounds,
};

const secondSection: BackendSectionData = {
  cuid: 'calendar_notice_cuid_2',
  header: 'Holiday Closure',
  body: 'Library closed for the holiday; calendar still lists society events.',
  resources: ['/membership'],
  tags: [CALENDAR_PAGE_NOTICE_TAG],
  index: 2,
  ...unsetBounds,
};

const firstListEntry: CalendarPageSectionListEntry = {
  cuid: firstSection.cuid,
  header: firstSection.header,
  body: firstSection.body,
  tags: firstSection.tags,
  index: firstSection.index,
  ...unsetBounds,
};

const secondListEntry: CalendarPageSectionListEntry = {
  cuid: secondSection.cuid,
  header: secondSection.header,
  body: secondSection.body,
  tags: secondSection.tags,
  index: secondSection.index,
  ...unsetBounds,
};

const sectionsByCuid: Record<string, BackendSectionData> = {
  [firstSection.cuid]: firstSection,
  [secondSection.cuid]: secondSection,
};

async function setupCalendarPage(options?: {
  listByTag?: (tag: string) => Promise<CalendarPageSectionListEntry[]>;
  backendGet?: (cuid: string) => Promise<BackendSectionData | null>;
}) {
  const listByTag =
    options?.listByTag ??
    (async (tag: string) => {
      if (tag === CALENDAR_PAGE_NOTICE_TAG) return [firstListEntry, secondListEntry];
      return [];
    });
  const backendGet =
    options?.backendGet ??
    (async (cuid: string) => sectionsByCuid[cuid] ?? null);

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [CalendarPage],
    providers: [
      { provide: CALENDAR_PAGE_SECTION_LIST_BY_TAG, useValue: listByTag },
      { provide: SECTION_BACKEND_GET, useValue: backendGet },
      { provide: CALENDAR_EVENTS_LIST_GET, useValue: async () => [] },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CalendarPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), page: fixture.componentInstance };
}

// @relation(GSSC-PLLR-320, scope=range_start, role=Test)
test('GSSC-PLLR-320 Semantic', async () => {
  const tags: string[] = [];
  const cuids: string[] = [];
  const { root, page } = await setupCalendarPage({
    listByTag: async (tag) => {
      tags.push(tag);
      if (tag === CALENDAR_PAGE_NOTICE_TAG) return [firstListEntry, secondListEntry];
      return [];
    },
    backendGet: async (cuid) => {
      cuids.push(cuid);
      return sectionsByCuid[cuid] ?? null;
    },
  });

  expect(tags).toEqual([CALENDAR_PAGE_NOTICE_TAG]);
  expect(page.noticeCuids()).toEqual([firstSection.cuid, secondSection.cuid]);
  expect(cuids).toEqual(
    expect.arrayContaining([firstSection.cuid, secondSection.cuid]),
  );
  expect(root.querySelector('gssc-calendar')).not.toBeNull();
  expect(root.querySelector('.gssc-calendar')).not.toBeNull();
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(root.querySelectorAll('gssc-section').length).toBe(2);
});
// @relation(GSSC-PLLR-320, scope=range_end, role=Test)

// @relation(GSSC-PLLR-321, scope=range_start, role=Test)
test('GSSC-PLLR-321 Syntactic', async () => {
  const { root: full, page } = await setupCalendarPage();
  const notices = full.querySelector('.gssc-calendar-page__notices');
  const calendar = full.querySelector('gssc-calendar');
  expect(notices).not.toBeNull();
  expect(calendar).not.toBeNull();
  expect(full.querySelector('.gssc-calendar-page')!.classList.contains('w-full')).toBe(
    true,
  );
  expect(calendar!.classList.contains('w-full')).toBe(true);
  expect(page.noticeCuids()).toEqual([firstSection.cuid, secondSection.cuid]);
  expect(
    notices!.compareDocumentPosition(calendar!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const { root: empty } = await setupCalendarPage({
    listByTag: async () => [],
  });
  expect(empty.querySelector('.gssc-calendar-page__notices')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();
  expect(empty.querySelector('gssc-calendar')).not.toBeNull();
});
// @relation(GSSC-PLLR-321, scope=range_end, role=Test)

// @relation(GSSC-PLLR-322, scope=range_start, role=Test)
test('GSSC-PLLR-322 Lexical', async () => {
  const { root } = await setupCalendarPage();
  const page = root.querySelector<HTMLElement>('.gssc-calendar-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(page.classList.contains('text-gssc-dark-green')).toBe(true);

  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);

  const calendar = root.querySelector<HTMLElement>('.gssc-calendar')!;
  expect(calendar.classList.contains('bg-gssc-white')).toBe(true);
  expect(calendar.classList.contains('border-gssc-gray')).toBe(true);
  expect(calendar.classList.contains('font-sans')).toBe(true);
  expect(calendar.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-322, scope=range_end, role=Test)

// @relation(GSSC-PLLR-323, scope=range_start, role=Test)
test('GSSC-PLLR-323 Semantic', async () => {
  const { root } = await setupCalendarPage();
  const notices = root.querySelector('.gssc-calendar-page__notices')!;
  const bodies = [...notices.querySelectorAll('.gssc-section__body')].map(
    (el) => el.textContent?.trim(),
  );
  expect(bodies).toEqual([firstSection.body, secondSection.body]);
  const headers = [...notices.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim(),
  );
  expect(headers).toEqual([firstSection.header, secondSection.header]);
});
// @relation(GSSC-PLLR-323, scope=range_end, role=Test)

// @relation(GSSC-PLLR-324, scope=range_start, role=Test)
test('GSSC-PLLR-324 Syntactic', async () => {
  const { root, page } = await setupCalendarPage({
    listByTag: async (tag) => {
      if (tag !== CALENDAR_PAGE_NOTICE_TAG) return [];
      return [secondListEntry, firstListEntry];
    },
  });

  expect(page.noticeCuids()).toEqual([secondSection.cuid, firstSection.cuid]);
  const notices = root.querySelector('.gssc-calendar-page__notices')!;
  const headers = [...notices.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim(),
  );
  expect(headers).toEqual([secondSection.header, firstSection.header]);
  expect(notices.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
});
// @relation(GSSC-PLLR-324, scope=range_end, role=Test)

// @relation(GSSC-PLLR-325, scope=range_start, role=Test)
test('GSSC-PLLR-325 Lexical', async () => {
  const { root } = await setupCalendarPage();
  const notices = root.querySelector('.gssc-calendar-page__notices')!;
  const container = notices.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const header = notices.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = notices.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-325, scope=range_end, role=Test)

// @relation(GSSC-PLLR-326, scope=range_start, role=Test)
test('GSSC-PLLR-326 Semantic', async () => {
  const { root } = await setupCalendarPage();
  const hosts = [...root.querySelectorAll('gssc-section-from-cuid')];
  expect(hosts.length).toBe(2);
  expect(textContent(hosts[0]!, '.gssc-section__body')).toBe(firstSection.body);
  expect(textContent(hosts[1]!, '.gssc-section__body')).toBe(secondSection.body);
  expect(textContent(hosts[0]!, '.gssc-section__header')).toBe(firstSection.header);
  expect(textContent(hosts[1]!, '.gssc-section__header')).toBe(secondSection.header);
});
// @relation(GSSC-PLLR-326, scope=range_end, role=Test)

// @relation(GSSC-PLLR-327, scope=range_start, role=Test)
test('GSSC-PLLR-327 Syntactic', async () => {
  const { root } = await setupCalendarPage();
  const notices = root.querySelector('.gssc-calendar-page__notices')!;
  const hosts = [...notices.querySelectorAll('gssc-section-from-cuid')];
  expect(hosts.length).toBe(2);
  expect(hosts[0]!.querySelector('gssc-section')).not.toBeNull();
  expect(hosts[1]!.querySelector('gssc-section')).not.toBeNull();
  expect(
    hosts[0]!.compareDocumentPosition(hosts[1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-327, scope=range_end, role=Test)

// @relation(GSSC-PLLR-328, scope=range_start, role=Test)
test('GSSC-PLLR-328 Lexical', async () => {
  const { root } = await setupCalendarPage();
  const secondHost = root.querySelectorAll('gssc-section-from-cuid')[1]!;
  const container = secondHost.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const resource = secondHost.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(resource.classList.contains('bg-gssc-white')).toBe(true);
  expect(resource.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(resource.classList.contains('border-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-328, scope=range_end, role=Test)
