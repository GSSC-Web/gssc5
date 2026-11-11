import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import {
  DIRECTOR_AT_LARGE_OFFICES,
  LEADERSHIP_INTRO_TAG,
  LEADERSHIP_LIST_GET,
  LEADERSHIP_SECTION_LIST_BY_TAG,
  OFFICER_OFFICES,
  type LeadershipEntry,
  type LeadershipSectionListEntry,
} from '../../services/leadership/leadership';
import { LeadershipPage } from './leadership';

const sampleLeaders: LeadershipEntry[] = [
  {
    position: 'President',
    firstName: 'Karen',
    lastName: 'Souza',
    preferredContactMethod: 'Email',
    primaryEmail: 'president@example.com',
    accountPhoto: 'https://example.com/karen.jpg',
  },
  {
    position: 'Director at Large 1',
    firstName: 'Linda',
    lastName: 'Turley',
    preferredContactMethod: 'Phone',
    primaryPhone: '209-555-0100',
  },
  {
    position: 'Programs',
    firstName: 'Lauren',
    lastName: 'Hastings',
    preferredContactMethod: 'Email',
    primaryEmail: 'programs@example.com',
  },
  {
    position: 'Historian',
    firstName: 'Judy',
    lastName: 'Byrne',
    preferredContactMethod: 'Email',
    primaryEmail: 'historian@example.com',
  },
  {
    position: 'Budget',
    firstName: null,
    lastName: null,
    preferredContactMethod: 'Email',
    primaryEmail: 'budget-empty@example.com',
  },
  {
    position: '2nd Vice President',
    firstName: null,
    lastName: null,
    preferredContactMethod: 'Email',
    primaryEmail: 'empty@example.com',
  },
];

const introSections: LeadershipSectionListEntry[] = [
  {
    cuid: 'lead_intro_b',
    header: 'About Leadership B',
    body: 'Second intro',
    tags: [LEADERSHIP_INTRO_TAG],
    index: 2,
  },
  {
    cuid: 'lead_intro_a',
    header: 'About Leadership A',
    body: 'First intro',
    tags: [LEADERSHIP_INTRO_TAG],
    index: 1,
  },
];

const sectionBodies: Record<string, BackendSectionData> = {
  lead_intro_a: {
    cuid: 'lead_intro_a',
    header: 'About Leadership A',
    body: 'First intro',
    resources: [],
    tags: [LEADERSHIP_INTRO_TAG],
    index: 1,
  },
  lead_intro_b: {
    cuid: 'lead_intro_b',
    header: 'About Leadership B',
    body: 'Second intro',
    resources: [],
    tags: [LEADERSHIP_INTRO_TAG],
    index: 2,
  },
};

async function setupLeadershipPage(options?: {
  leaders?: LeadershipEntry[];
  intro?: LeadershipSectionListEntry[];
}) {
  const leaders = options?.leaders ?? sampleLeaders;
  const intro = options?.intro ?? introSections;
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LeadershipPage],
    providers: [
      { provide: LEADERSHIP_LIST_GET, useValue: async () => leaders },
      {
        provide: LEADERSHIP_SECTION_LIST_BY_TAG,
        useValue: async (tag: string) => (tag === LEADERSHIP_INTRO_TAG ? intro : []),
      },
      {
        provide: SECTION_BACKEND_GET,
        useValue: async (cuid: string) => sectionBodies[cuid] ?? null,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LeadershipPage);
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

function cardTitles(root: HTMLElement, region: string): string[] {
  return [...root.querySelectorAll(`.${region} .gssc-contact-card-large__title, .${region} .gssc-contact-card-small__title`)]
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean);
}

// @relation(GSSC-PLLR-234, scope=range_start, role=Test)
test('GSSC-PLLR-234 Leadership Intro Semantic', async () => {
  const tags: string[] = [];
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LeadershipPage],
    providers: [
      { provide: LEADERSHIP_LIST_GET, useValue: async () => sampleLeaders },
      {
        provide: LEADERSHIP_SECTION_LIST_BY_TAG,
        useValue: async (tag: string) => {
          tags.push(tag);
          return introSections;
        },
      },
      {
        provide: SECTION_BACKEND_GET,
        useValue: async (cuid: string) => sectionBodies[cuid] ?? null,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LeadershipPage);
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
  const root = nativeElement(fixture);

  expect(tags).toEqual([LEADERSHIP_INTRO_TAG]);
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(textContent(root, '.gssc-section__header')).toBe('About Leadership A');
});
// @relation(GSSC-PLLR-234, scope=range_end, role=Test)

// @relation(GSSC-PLLR-235, scope=range_start, role=Test)
test('GSSC-PLLR-235 Leadership Intro Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const intro = root.querySelector('.gssc-leadership-intro')!;
  const officers = root.querySelector('.gssc-officers')!;
  expect(intro.compareDocumentPosition(officers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const cuids = [...intro.querySelectorAll('gssc-section-from-cuid')].map((el) =>
    el.getAttribute('ng-reflect-cuid'),
  );
  // Inputs may not reflect as attributes in all runners; order via headers.
  const headers = [...intro.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim() ?? '',
  );
  expect(headers).toEqual(['About Leadership A', 'About Leadership B']);

  const { root: empty } = await setupLeadershipPage({ intro: [] });
  expect(empty.querySelector('.gssc-leadership-intro')).toBeNull();
});
// @relation(GSSC-PLLR-235, scope=range_end, role=Test)

// @relation(GSSC-PLLR-236, scope=range_start, role=Test)
test('GSSC-PLLR-236 Leadership Intro Lexical', async () => {
  const { root } = await setupLeadershipPage();
  const intro = root.querySelector('.gssc-leadership-intro')!;
  expect(intro.querySelector('gssc-section')).not.toBeNull();
  expect(intro.querySelector('.gssc-section')!.classList.contains('bg-gssc-white')).toBe(true);
});
// @relation(GSSC-PLLR-236, scope=range_end, role=Test)

// @relation(GSSC-PLLR-162, scope=range_start, role=Test)
test('GSSC-PLLR-162 Officers Semantic', async () => {
  const { root } = await setupLeadershipPage();
  const region = root.querySelector('.gssc-officers')!;
  const byTitle = (title: string) =>
    [...region.querySelectorAll('gssc-contact-card-large')].find(
      (card) =>
        card.querySelector('.gssc-contact-card-large__title')?.textContent?.trim() === title,
    )!;
  const president = byTitle('President');
  expect(textContent(president, '.gssc-contact-card-large__name')).toBe('Karen Souza');
  expect(
    president.querySelector<HTMLAnchorElement>('.gssc-contact-card-large__contact')?.getAttribute(
      'href',
    ),
  ).toBe('mailto:president@example.com');
  expect(
    president.querySelector<HTMLImageElement>('.gssc-contact-card-large__photo-img')?.getAttribute(
      'src',
    ),
  ).toBe('https://example.com/karen.jpg');

  const secretary = byTitle('Secretary');
  expect(textContent(secretary, '.gssc-contact-card-large__vacant')).toBe('Vacant');
  const secretaryArticle = secretary.querySelector('.gssc-contact-card-large')!;
  expect(secretaryArticle.getAttribute('data-vacant')).toBe('true');
  expect(secretaryArticle.classList.contains('bg-gssc-light-red')).toBe(true);
  expect(textContent(byTitle('2nd Vice President'), '.gssc-contact-card-large__vacant')).toBe(
    'Vacant',
  );
});
// @relation(GSSC-PLLR-162, scope=range_end, role=Test)

// @relation(GSSC-PLLR-163, scope=range_start, role=Test)
test('GSSC-PLLR-163 Officers Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const intro = root.querySelector('.gssc-leadership-intro')!;
  const officers = root.querySelector('.gssc-officers')!;
  const directors = root.querySelector('.gssc-directors-at-large')!;
  expect(intro.compareDocumentPosition(officers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(
    officers.compareDocumentPosition(directors) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const grid = officers.querySelector('.gssc-officers__grid')!;
  expect(grid.classList.contains('flex-wrap')).toBe(true);
  expect(grid.classList.contains('justify-center')).toBe(true);
  const cell = officers.querySelector('.gssc-officers__cell')!;
  expect(cell.className).toContain('lg:w-[calc((100%-2rem)/3)]');
  expect(officers.querySelectorAll('gssc-contact-card-large').length).toBe(OFFICER_OFFICES.length);
});
// @relation(GSSC-PLLR-163, scope=range_end, role=Test)

// @relation(GSSC-PLLR-164, scope=range_start, role=Test)
test('GSSC-PLLR-164 Officers Lexical', async () => {
  const { root } = await setupLeadershipPage();
  expect(textContent(root, '.gssc-officers__title')).toBe('Officers');
  expect(
    root.querySelector('.gssc-officers__title')!.classList.contains('text-gssc-dark-green'),
  ).toBe(true);
  expect(cardTitles(root, 'gssc-officers')).toEqual([...OFFICER_OFFICES]);
  expect(root.querySelector('gssc-contact-card-large')).not.toBeNull();
});
// @relation(GSSC-PLLR-164, scope=range_end, role=Test)

// @relation(GSSC-PLLR-165, scope=range_start, role=Test)
test('GSSC-PLLR-165 Directors at Large Semantic', async () => {
  const { root } = await setupLeadershipPage();
  const region = root.querySelector('.gssc-directors-at-large')!;
  const dal1 = [...region.querySelectorAll('gssc-contact-card-small')].find((card) =>
    card
      .querySelector('.gssc-contact-card-small__title')
      ?.textContent?.includes('Director at Large 1'),
  )!;
  expect(textContent(dal1, '.gssc-contact-card-small__name')).toBe('Linda Turley');
  expect(
    dal1.querySelector<HTMLAnchorElement>('.gssc-contact-card-small__contact')?.getAttribute(
      'href',
    ),
  ).toBe('tel:209-555-0100');

  const vacant = [...region.querySelectorAll('gssc-contact-card-small')].find(
    (card) =>
      card.querySelector('.gssc-contact-card-small__title')?.textContent?.trim() ===
      'Director at Large 4',
  )!;
  expect(textContent(vacant, '.gssc-contact-card-small__vacant')).toBe('Vacant');
  const vacantArticle = vacant.querySelector('.gssc-contact-card-small')!;
  expect(vacantArticle.getAttribute('data-vacant')).toBe('true');
  expect(vacantArticle.classList.contains('bg-gssc-light-red')).toBe(true);
});
// @relation(GSSC-PLLR-165, scope=range_end, role=Test)

// @relation(GSSC-PLLR-166, scope=range_start, role=Test)
test('GSSC-PLLR-166 Directors at Large Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const officers = root.querySelector('.gssc-officers')!;
  const directors = root.querySelector('.gssc-directors-at-large')!;
  const chairs = root.querySelector('.gssc-committee-chairs')!;
  expect(
    officers.compareDocumentPosition(directors) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    directors.compareDocumentPosition(chairs) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const grid = directors.querySelector('.gssc-directors-at-large__grid')!;
  expect(grid.classList.contains('justify-center')).toBe(true);
  const cell = directors.querySelector('.gssc-directors-at-large__cell')!;
  expect(cell.className).toContain('lg:w-[calc((100%-4rem)/5)]');
  expect(directors.querySelectorAll('gssc-contact-card-small').length).toBe(
    DIRECTOR_AT_LARGE_OFFICES.length,
  );
});
// @relation(GSSC-PLLR-166, scope=range_end, role=Test)

// @relation(GSSC-PLLR-167, scope=range_start, role=Test)
test('GSSC-PLLR-167 Directors at Large Lexical', async () => {
  const { root } = await setupLeadershipPage();
  expect(textContent(root, '.gssc-directors-at-large__title')).toBe('Directors at Large');
  expect(cardTitles(root, 'gssc-directors-at-large')).toEqual([...DIRECTOR_AT_LARGE_OFFICES]);
});
// @relation(GSSC-PLLR-167, scope=range_end, role=Test)

// @relation(GSSC-PLLR-231, scope=range_start, role=Test)
test('GSSC-PLLR-231 Committee Chairs Semantic', async () => {
  const { root } = await setupLeadershipPage();
  const region = root.querySelector('.gssc-committee-chairs')!;
  const titles = cardTitles(root, 'gssc-committee-chairs');
  expect(titles).toEqual(['Historian', 'Programs']);
  expect(region.querySelector('.gssc-contact-card-small__vacant')).toBeNull();

  const historian = [...region.querySelectorAll('gssc-contact-card-small')].find(
    (card) =>
      card.querySelector('.gssc-contact-card-small__title')?.textContent?.trim() === 'Historian',
  )!;
  expect(textContent(historian, '.gssc-contact-card-small__name')).toBe('Judy Byrne');
  expect(
    historian
      .querySelector<HTMLAnchorElement>('.gssc-contact-card-small__contact')
      ?.getAttribute('href'),
  ).toBe('mailto:historian@example.com');

  // Officers / Directors / nameless non-fixed roles are excluded.
  expect(titles).not.toContain('President');
  expect(titles).not.toContain('Director at Large 1');
  expect(titles).not.toContain('Budget');
});
// @relation(GSSC-PLLR-231, scope=range_end, role=Test)

// @relation(GSSC-PLLR-232, scope=range_start, role=Test)
test('GSSC-PLLR-232 Committee Chairs Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const directors = root.querySelector('.gssc-directors-at-large')!;
  const chairs = root.querySelector('.gssc-committee-chairs')!;
  expect(
    directors.compareDocumentPosition(chairs) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const grid = chairs.querySelector('.gssc-committee-chairs__grid')!;
  expect(grid.classList.contains('justify-center')).toBe(true);
  expect(cardTitles(root, 'gssc-committee-chairs')).toEqual(['Historian', 'Programs']);
  expect(chairs.querySelectorAll('gssc-contact-card-small').length).toBe(2);
  const cell = chairs.querySelector('.gssc-committee-chairs__cell')!;
  expect(cell.className).toContain('lg:w-[calc((100%-4rem)/5)]');
});
// @relation(GSSC-PLLR-232, scope=range_end, role=Test)

// @relation(GSSC-PLLR-233, scope=range_start, role=Test)
test('GSSC-PLLR-233 Committee Chairs Lexical', async () => {
  const { root } = await setupLeadershipPage();
  expect(textContent(root, '.gssc-committee-chairs__title')).toBe('Committee Chairs');
  expect(
    root.querySelector('.gssc-committee-chairs__title')!.classList.contains('text-gssc-dark-green'),
  ).toBe(true);
  expect(root.querySelector('gssc-contact-card-small')).not.toBeNull();
});
// @relation(GSSC-PLLR-233, scope=range_end, role=Test)
