import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  COMMITTEE_CHAIR_OFFICES,
  LEADERSHIP_LIST_GET,
  OFFICER_AND_DIRECTOR_OFFICES,
  type LeadershipEntry,
} from '../../services/leadership/leadership';
import { LeadershipPage } from './leadership';

const sampleLeaders: LeadershipEntry[] = [
  {
    position: 'President',
    firstName: 'Karen',
    lastName: 'Souza',
    preferredContactMethod: 'Email',
    primaryEmail: 'president@example.com',
  },
  {
    position: 'Director at Large 1',
    firstName: 'Linda',
    lastName: 'Turley',
    preferredContactMethod: 'Email',
    primaryEmail: 'dal1@example.com',
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
    firstName: 'Anna',
    lastName: 'Keppel',
    preferredContactMethod: 'Phone',
    primaryPhone: '209-555-0100',
  },
  {
    position: '2nd Vice President',
    firstName: null,
    lastName: null,
    preferredContactMethod: 'Email',
    primaryEmail: 'empty-name@example.com',
  },
];

async function setupLeadershipPage(
  leaders: LeadershipEntry[] = sampleLeaders,
): Promise<{ root: HTMLElement; page: LeadershipPage }> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LeadershipPage],
    providers: [
      {
        provide: LEADERSHIP_LIST_GET,
        useValue: async () => leaders,
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
  return { root: nativeElement(fixture), page: fixture.componentInstance };
}

function officeRow(root: HTMLElement, region: string, office: string): HTMLElement | null {
  const rows = [...root.querySelectorAll<HTMLElement>(`.${region}__row`)];
  return (
    rows.find((row) => row.querySelector(`.${region}__office`)?.textContent?.trim() === office) ??
    null
  );
}

// @relation(GSSC-PLLR-159, scope=range_start, role=Test)
test('GSSC-PLLR-159 Officers and Directors Semantic', async () => {
  let calls = 0;
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LeadershipPage],
    providers: [
      {
        provide: LEADERSHIP_LIST_GET,
        useValue: async () => {
          calls += 1;
          return sampleLeaders;
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LeadershipPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  const root = nativeElement(fixture);

  expect(calls).toBe(1);

  const president = officeRow(root, 'gssc-officers-and-directors', 'President');
  expect(president).not.toBeNull();
  expect(textContent(president!, '.gssc-officers-and-directors__name')).toBe('Karen Souza');
  expect(textContent(president!, '.gssc-officers-and-directors__email')).toBe(
    'president@example.com',
  );

  const dal1 = officeRow(root, 'gssc-officers-and-directors', 'Director at Large 1');
  expect(textContent(dal1!, '.gssc-officers-and-directors__name')).toBe('Linda Turley');
  expect(textContent(dal1!, '.gssc-officers-and-directors__email')).toBe('dal1@example.com');

  const vacantSecretary = officeRow(root, 'gssc-officers-and-directors', 'Secretary');
  expect(textContent(vacantSecretary!, '.gssc-officers-and-directors__vacant')).toBe('Vacant');
  expect(vacantSecretary!.querySelector('.gssc-officers-and-directors__email')).toBeNull();

  const emptyName = officeRow(root, 'gssc-officers-and-directors', '2nd Vice President');
  expect(textContent(emptyName!, '.gssc-officers-and-directors__vacant')).toBe('Vacant');
  expect(emptyName!.querySelector('.gssc-officers-and-directors__email')).toBeNull();
});
// @relation(GSSC-PLLR-159, scope=range_end, role=Test)

// @relation(GSSC-PLLR-160, scope=range_start, role=Test)
test('GSSC-PLLR-160 Officers and Directors Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const officers = root.querySelector('.gssc-officers-and-directors');
  const chairs = root.querySelector('.gssc-committee-chairs');
  expect(officers).not.toBeNull();
  expect(chairs).not.toBeNull();
  expect(
    officers!.compareDocumentPosition(chairs!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const list = root.querySelector('.gssc-officers-and-directors__list');
  expect(list).not.toBeNull();
  expect(list!.classList.contains('flex-col')).toBe(true);

  const president = officeRow(root, 'gssc-officers-and-directors', 'President')!;
  expect(president.querySelector('.gssc-officers-and-directors__office')).not.toBeNull();
  expect(president.querySelector('.gssc-officers-and-directors__name')).not.toBeNull();
  expect(president.querySelector('.gssc-officers-and-directors__email')).not.toBeNull();

  const secretary = officeRow(root, 'gssc-officers-and-directors', 'Secretary')!;
  expect(secretary.querySelector('.gssc-officers-and-directors__vacant')).not.toBeNull();

  expect(officers!.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-160, scope=range_end, role=Test)

// @relation(GSSC-PLLR-161, scope=range_start, role=Test)
test('GSSC-PLLR-161 Officers and Directors Lexical', async () => {
  const { root } = await setupLeadershipPage();
  const region = root.querySelector<HTMLElement>('.gssc-officers-and-directors')!;
  expect(textContent(region, '.gssc-officers-and-directors__title')).toBe(
    'Officers and Directors',
  );
  expect(region.classList.contains('bg-gssc-white')).toBe(true);
  expect(region.classList.contains('border-gssc-gray')).toBe(true);
  expect(region.classList.contains('font-sans')).toBe(true);

  const title = region.querySelector<HTMLElement>('.gssc-officers-and-directors__title')!;
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);

  const offices = [...region.querySelectorAll('.gssc-officers-and-directors__office')].map(
    (el) => el.textContent?.trim() ?? '',
  );
  expect(offices).toEqual([...OFFICER_AND_DIRECTOR_OFFICES]);

  for (const office of region.querySelectorAll<HTMLElement>('.gssc-officers-and-directors__office')) {
    expect(office.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(office.classList.contains('font-sans')).toBe(true);
  }

  const name = region.querySelector<HTMLElement>('.gssc-officers-and-directors__name')!;
  expect(name.classList.contains('text-gssc-black')).toBe(true);
  const email = region.querySelector<HTMLElement>('.gssc-officers-and-directors__email')!;
  expect(email.classList.contains('text-gssc-black')).toBe(true);
  const vacant = region.querySelector<HTMLElement>('.gssc-officers-and-directors__vacant')!;
  expect(vacant.textContent?.trim()).toBe('Vacant');
  expect(vacant.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-161, scope=range_end, role=Test)

// @relation(GSSC-PLLR-162, scope=range_start, role=Test)
test('GSSC-PLLR-162 Committee Chairs Semantic', async () => {
  const { root } = await setupLeadershipPage();

  const historian = officeRow(root, 'gssc-committee-chairs', 'Historian');
  expect(textContent(historian!, '.gssc-committee-chairs__name')).toBe('Judy Byrne');
  expect(textContent(historian!, '.gssc-committee-chairs__email')).toBe('historian@example.com');

  const budget = officeRow(root, 'gssc-committee-chairs', 'Budget');
  expect(textContent(budget!, '.gssc-committee-chairs__name')).toBe('Anna Keppel');
  expect(budget!.querySelector('.gssc-committee-chairs__email')).toBeNull();

  const vacant = officeRow(root, 'gssc-committee-chairs', 'Acquisitions');
  expect(textContent(vacant!, '.gssc-committee-chairs__vacant')).toBe('Vacant');
});
// @relation(GSSC-PLLR-162, scope=range_end, role=Test)

// @relation(GSSC-PLLR-163, scope=range_start, role=Test)
test('GSSC-PLLR-163 Committee Chairs Syntactic', async () => {
  const { root } = await setupLeadershipPage();
  const officers = root.querySelector('.gssc-officers-and-directors')!;
  const chairs = root.querySelector('.gssc-committee-chairs')!;
  expect(
    officers.compareDocumentPosition(chairs) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const list = root.querySelector('.gssc-committee-chairs__list');
  expect(list).not.toBeNull();
  expect(list!.classList.contains('flex-col')).toBe(true);

  const historian = officeRow(root, 'gssc-committee-chairs', 'Historian')!;
  expect(historian.querySelector('.gssc-committee-chairs__office')).not.toBeNull();
  expect(historian.querySelector('.gssc-committee-chairs__name')).not.toBeNull();
  expect(historian.querySelector('.gssc-committee-chairs__email')).not.toBeNull();

  expect(chairs.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-163, scope=range_end, role=Test)

// @relation(GSSC-PLLR-164, scope=range_start, role=Test)
test('GSSC-PLLR-164 Committee Chairs Lexical', async () => {
  const { root } = await setupLeadershipPage();
  const region = root.querySelector<HTMLElement>('.gssc-committee-chairs')!;
  expect(textContent(region, '.gssc-committee-chairs__title')).toBe('Committee Chairs');
  expect(region.classList.contains('bg-gssc-white')).toBe(true);
  expect(region.classList.contains('border-gssc-gray')).toBe(true);
  expect(region.classList.contains('font-sans')).toBe(true);

  const title = region.querySelector<HTMLElement>('.gssc-committee-chairs__title')!;
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);

  const offices = [...region.querySelectorAll('.gssc-committee-chairs__office')].map(
    (el) => el.textContent?.trim() ?? '',
  );
  expect(offices).toEqual([...COMMITTEE_CHAIR_OFFICES]);

  for (const office of region.querySelectorAll<HTMLElement>('.gssc-committee-chairs__office')) {
    expect(office.classList.contains('text-gssc-dark-green')).toBe(true);
  }

  const name = region.querySelector<HTMLElement>('.gssc-committee-chairs__name')!;
  expect(name.classList.contains('text-gssc-black')).toBe(true);
  const vacant = region.querySelector<HTMLElement>('.gssc-committee-chairs__vacant')!;
  expect(vacant.textContent?.trim()).toBe('Vacant');
});
// @relation(GSSC-PLLR-164, scope=range_end, role=Test)
