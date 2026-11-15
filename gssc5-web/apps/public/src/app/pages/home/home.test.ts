import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { nativeElement } from '../../../test-harness';
import {
  CAROUSEL_AUTO_ADVANCE_INTERVAL_MS,
} from '../../modules/carousel/carousel';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import { SECTION_FEATURED_IMAGE_RESOLVE } from '../../modules/section/section';
import {
  announcementToCarouselItem,
  eventOccurrenceDate,
  eventToSectionContents,
  HOME_ANNOUNCEMENTS_LIST,
  HOME_EVENTS_LIST,
  HOME_SECTION_LIST_BY_TAG,
  HOME_SECTIONS_TAG,
  HomePage,
  isWithinOneMonthOfOccurrence,
  type HomeAnnouncementListEntry,
  type HomeEventEntry,
  type HomeSectionListEntry,
} from './home';

const unsetBounds = {
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
} as const;

const firstAnnouncement: HomeAnnouncementListEntry = {
  cuid: 'ann_home_1',
  header: 'Meeting Program',
  body: 'General meeting program details from the backend.',
  resources: ['/calendar'],
  tags: ['urgent'],
  index: 1,
  ...unsetBounds,
  imageFile: null,
  imagePosition: null,
};

const secondAnnouncement: HomeAnnouncementListEntry = {
  cuid: 'ann_home_2',
  header: 'Library Notice',
  body: 'Library hours change notice.',
  resources: [],
  tags: [],
  index: 2,
  ...unsetBounds,
  imageFile: null,
  imagePosition: null,
};

const nearEvent: HomeEventEntry = {
  cuid: 'evt_near',
  name: 'Special Festival',
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
  year: new Date().getFullYear(),
  header: 'Festival Weekend',
  body: 'Special event body within one month.',
  resources: ['/events'],
  imageFile: null,
  imagePosition: 'left',
};

const farEvent: HomeEventEntry = {
  cuid: 'evt_far',
  name: 'Distant Reunion',
  month: 1,
  day: 15,
  year: new Date().getFullYear() + 2,
  header: 'Far Event',
  body: 'Should not appear on home.',
  resources: [],
};

const firstSection: BackendSectionData = {
  cuid: 'home_cuid_1',
  header: 'Purpose of the Society',
  body: 'Society purpose authored as a home-tagged section.',
  resources: [],
  tags: [HOME_SECTIONS_TAG],
  index: 1,
  ...unsetBounds,
};

const secondSection: BackendSectionData = {
  cuid: 'home_cuid_2',
  header: 'Cookbook Offer',
  body: 'Cookbook promotion from the backend.',
  resources: ['/publications'],
  tags: [HOME_SECTIONS_TAG],
  index: 2,
  ...unsetBounds,
};

const firstListEntry: HomeSectionListEntry = {
  cuid: firstSection.cuid,
  header: firstSection.header,
  body: firstSection.body,
  tags: firstSection.tags,
  index: firstSection.index,
  ...unsetBounds,
};

const secondListEntry: HomeSectionListEntry = {
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

async function setupHomePage(options?: {
  announcements?: () => Promise<HomeAnnouncementListEntry[]>;
  events?: () => Promise<HomeEventEntry[]>;
  listByTag?: (tag: string) => Promise<HomeSectionListEntry[]>;
  backendGet?: (cuid: string) => Promise<BackendSectionData | null>;
  query?: Record<string, string>;
}) {
  const announcements =
    options?.announcements ??
    (async () => [firstAnnouncement, secondAnnouncement]);
  const events = options?.events ?? (async () => [nearEvent, farEvent]);
  const listByTag =
    options?.listByTag ??
    (async (tag: string) => {
      if (tag === HOME_SECTIONS_TAG) return [firstListEntry, secondListEntry];
      return [];
    });
  const backendGet =
    options?.backendGet ??
    (async (cuid: string) => sectionsByCuid[cuid] ?? null);

  const { of } = await import('rxjs');
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [
      { provide: HOME_ANNOUNCEMENTS_LIST, useValue: announcements },
      { provide: HOME_EVENTS_LIST, useValue: events },
      { provide: HOME_SECTION_LIST_BY_TAG, useValue: listByTag },
      { provide: SECTION_BACKEND_GET, useValue: backendGet },
      { provide: SECTION_FEATURED_IMAGE_RESOLVE, useValue: async () => null },
      { provide: CAROUSEL_AUTO_ADVANCE_INTERVAL_MS, useValue: 0 },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(options?.query ?? {}) },
          queryParamMap: of(convertToParamMap(options?.query ?? {})),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(HomePage);
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

test('home helpers map announcements and filter events within one month', () => {
  const item = announcementToCarouselItem(firstAnnouncement);
  expect(item.id).toBe(firstAnnouncement.cuid);
  expect(item.body).toBe(firstAnnouncement.body);
  expect(item.resources).toEqual(['/calendar']);

  const today = new Date();
  expect(
    isWithinOneMonthOfOccurrence(
      { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() },
      today,
    ),
  ).toBe(true);
  expect(
    isWithinOneMonthOfOccurrence(
      { year: today.getFullYear() + 2, month: 1, day: 1 },
      today,
    ),
  ).toBe(false);

  const occurrence = eventOccurrenceDate(nearEvent);
  expect(occurrence.year).toBe(nearEvent.year);
  const contents = eventToSectionContents(nearEvent);
  expect(contents.header).toBe('Festival Weekend');
  expect(contents.body).toBe(nearEvent.body);
});

// @relation(GSSC-PLLR-311, scope=range_start, role=Test)
test('GSSC-PLLR-311 Semantic', async () => {
  const { root, page } = await setupHomePage({
    query: { focusAnnouncement: firstAnnouncement.cuid },
  });

  expect(page.announcementItems().map((item) => item.id)).toEqual([
    firstAnnouncement.cuid,
    secondAnnouncement.cuid,
  ]);
  expect(page.focusedAnnouncementId()).toBe(firstAnnouncement.cuid);
  expect(root.querySelector('gssc-carousel')).not.toBeNull();
  expect(root.querySelector('.gssc-carousel__title')?.textContent?.trim()).toBe(
    firstAnnouncement.header,
  );
  expect(root.querySelector('.gssc-carousel__description')?.textContent?.trim()).toBe(
    firstAnnouncement.body,
  );
});
// @relation(GSSC-PLLR-311, scope=range_end, role=Test)

// @relation(GSSC-PLLR-312, scope=range_start, role=Test)
test('GSSC-PLLR-312 Syntactic', async () => {
  const { root: full } = await setupHomePage();
  const announcements = full.querySelector('.gssc-home-page__announcements');
  expect(announcements).not.toBeNull();
  expect(announcements!.classList.contains('w-full')).toBe(true);
  expect(full.querySelector('.gssc-home-page')!.classList.contains('w-full')).toBe(
    true,
  );
  const pageChildren = [...full.querySelector('.gssc-home-page')!.children];
  expect(pageChildren[0]?.classList.contains('gssc-home-page__announcements')).toBe(
    true,
  );

  const { root: empty } = await setupHomePage({
    announcements: async () => [],
  });
  expect(empty.querySelector('.gssc-home-page__announcements')).toBeNull();
  expect(empty.querySelector('gssc-carousel')).toBeNull();
});
// @relation(GSSC-PLLR-312, scope=range_end, role=Test)

// @relation(GSSC-PLLR-313, scope=range_start, role=Test)
test('GSSC-PLLR-313 Lexical', async () => {
  const { root } = await setupHomePage();
  const page = root.querySelector<HTMLElement>('.gssc-home-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(page.classList.contains('text-gssc-dark-green')).toBe(true);

  const carousel = root.querySelector<HTMLElement>('.gssc-carousel')!;
  expect(carousel.classList.contains('bg-gssc-white')).toBe(true);
  expect(carousel.classList.contains('border-gssc-gray')).toBe(true);
  expect(carousel.classList.contains('font-sans')).toBe(true);
  expect(carousel.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-313, scope=range_end, role=Test)

// @relation(GSSC-PLLR-314, scope=range_start, role=Test)
test('GSSC-PLLR-314 Semantic', async () => {
  const { root, page } = await setupHomePage();
  expect(page.specialEventSections().length).toBe(1);
  expect(page.specialEventSections()[0]?.header).toBe('Festival Weekend');
  expect(page.specialEventSections()[0]?.body).toBe(nearEvent.body);

  const special = root.querySelector('.gssc-home-page__special-events')!;
  expect(special.querySelectorAll('gssc-section').length).toBe(1);
  expect(special.querySelector('.gssc-section__header')?.textContent?.trim()).toBe(
    'Festival Weekend',
  );
  expect(special.querySelector('.gssc-section__body')?.textContent?.trim()).toBe(
    nearEvent.body,
  );
});
// @relation(GSSC-PLLR-314, scope=range_end, role=Test)

// @relation(GSSC-PLLR-315, scope=range_start, role=Test)
test('GSSC-PLLR-315 Syntactic', async () => {
  const { root: full } = await setupHomePage();
  const children = [...full.querySelector('.gssc-home-page')!.children];
  expect(children[0]?.classList.contains('gssc-home-page__announcements')).toBe(
    true,
  );
  expect(children[1]?.classList.contains('gssc-home-page__special-events')).toBe(
    true,
  );
  expect(
    full
      .querySelector('.gssc-home-page__special-events')!
      .classList.contains('w-full'),
  ).toBe(true);

  const { root: empty } = await setupHomePage({
    events: async () => [farEvent],
  });
  expect(empty.querySelector('.gssc-home-page__special-events')).toBeNull();
});
// @relation(GSSC-PLLR-315, scope=range_end, role=Test)

// @relation(GSSC-PLLR-316, scope=range_start, role=Test)
test('GSSC-PLLR-316 Lexical', async () => {
  const { root } = await setupHomePage();
  const special = root.querySelector('.gssc-home-page__special-events')!;
  const container = special.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-316, scope=range_end, role=Test)

// @relation(GSSC-PLLR-317, scope=range_start, role=Test)
test('GSSC-PLLR-317 Semantic', async () => {
  const tags: string[] = [];
  const cuids: string[] = [];
  const { root, page } = await setupHomePage({
    listByTag: async (tag) => {
      tags.push(tag);
      if (tag === HOME_SECTIONS_TAG) return [firstListEntry, secondListEntry];
      return [];
    },
    backendGet: async (cuid) => {
      cuids.push(cuid);
      return sectionsByCuid[cuid] ?? null;
    },
  });

  expect(tags).toEqual([HOME_SECTIONS_TAG]);
  expect(page.sectionCuids()).toEqual([firstSection.cuid, secondSection.cuid]);
  expect(cuids).toEqual(
    expect.arrayContaining([firstSection.cuid, secondSection.cuid]),
  );
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);

  const sections = root.querySelector('.gssc-home-page__sections')!;
  const headers = [...sections.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim(),
  );
  expect(headers).toEqual([firstSection.header, secondSection.header]);
});
// @relation(GSSC-PLLR-317, scope=range_end, role=Test)

// @relation(GSSC-PLLR-318, scope=range_start, role=Test)
test('GSSC-PLLR-318 Syntactic', async () => {
  const { root: full, page } = await setupHomePage({
    listByTag: async (tag) => {
      if (tag !== HOME_SECTIONS_TAG) return [];
      return [secondListEntry, firstListEntry];
    },
  });
  expect(page.sectionCuids()).toEqual([secondSection.cuid, firstSection.cuid]);
  const children = [...full.querySelector('.gssc-home-page')!.children];
  expect(children.at(-1)?.classList.contains('gssc-home-page__sections')).toBe(
    true,
  );
  expect(
    full.querySelector('.gssc-home-page__sections')!.classList.contains('w-full'),
  ).toBe(true);

  const { root: empty } = await setupHomePage({
    listByTag: async () => [],
  });
  expect(empty.querySelector('.gssc-home-page__sections')).toBeNull();
});
// @relation(GSSC-PLLR-318, scope=range_end, role=Test)

// @relation(GSSC-PLLR-319, scope=range_start, role=Test)
test('GSSC-PLLR-319 Lexical', async () => {
  const { root } = await setupHomePage();
  const page = root.querySelector<HTMLElement>('.gssc-home-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(page.classList.contains('text-gssc-dark-green')).toBe(true);

  const sections = root.querySelector('.gssc-home-page__sections')!;
  const container = sections.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-319, scope=range_end, role=Test)
