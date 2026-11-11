import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import {
  MEMBERSHIP_BENEFITS_TAG,
  MEMBERSHIP_MEETING_TAG,
  MEMBERSHIP_SECTION_LIST_BY_TAG,
  MembershipPage,
  type MembershipSectionListEntry,
} from './membership';

const meetingBody =
  'General meetings are held at the Stanislaus County Library Modesto. ' +
  'The society meets monthly. Meetings are on the second Thursday at 7:00 PM except holidays. ' +
  'The next meeting is Thursday, December 11, 2025, featuring a research workshop.';

const benefitsBody =
  'Membership provides programs, workshops, seminars, newsletters, free queries, ' +
  'surname registration, interest groups, and research trips.';

const meetingSection: BackendSectionData = {
  cuid: 'meeting_cuid_1',
  header: 'Meeting Information',
  body: meetingBody,
  resources: [],
  tags: [MEMBERSHIP_MEETING_TAG],
  index: 1,
};

const benefitsSection: BackendSectionData = {
  cuid: 'benefits_cuid_1',
  header: 'Membership Benefits',
  body: benefitsBody,
  resources: ['/newsletters'],
  tags: [MEMBERSHIP_BENEFITS_TAG],
  index: 1,
};

const meetingListEntry: MembershipSectionListEntry = {
  cuid: meetingSection.cuid,
  header: meetingSection.header,
  body: meetingSection.body,
  tags: meetingSection.tags,
  index: meetingSection.index,
};

const benefitsListEntry: MembershipSectionListEntry = {
  cuid: benefitsSection.cuid,
  header: benefitsSection.header,
  body: benefitsSection.body,
  tags: benefitsSection.tags,
  index: benefitsSection.index,
};

const sectionsByCuid: Record<string, BackendSectionData> = {
  [meetingSection.cuid]: meetingSection,
  [benefitsSection.cuid]: benefitsSection,
};

async function setupMembershipPage(options?: {
  listByTag?: (tag: string) => Promise<MembershipSectionListEntry[]>;
  backendGet?: (cuid: string) => Promise<BackendSectionData | null>;
}) {
  const listByTag =
    options?.listByTag ??
    (async (tag: string) => {
      if (tag === MEMBERSHIP_MEETING_TAG) return [meetingListEntry];
      if (tag === MEMBERSHIP_BENEFITS_TAG) return [benefitsListEntry];
      return [];
    });
  const backendGet =
    options?.backendGet ??
    (async (cuid: string) => sectionsByCuid[cuid] ?? null);

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [MembershipPage],
    providers: [
      { provide: MEMBERSHIP_SECTION_LIST_BY_TAG, useValue: listByTag },
      { provide: SECTION_BACKEND_GET, useValue: backendGet },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(MembershipPage);
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

// @relation(GSSC-PLLR-198, scope=range_start, role=Test)
test('GSSC-PLLR-198 Semantic', async () => {
  const tags: string[] = [];
  const cuids: string[] = [];
  const { root, page } = await setupMembershipPage({
    listByTag: async (tag) => {
      tags.push(tag);
      if (tag === MEMBERSHIP_MEETING_TAG) return [meetingListEntry];
      if (tag === MEMBERSHIP_BENEFITS_TAG) return [benefitsListEntry];
      return [];
    },
    backendGet: async (cuid) => {
      cuids.push(cuid);
      return sectionsByCuid[cuid] ?? null;
    },
  });

  expect(tags).toEqual(
    expect.arrayContaining([MEMBERSHIP_MEETING_TAG, MEMBERSHIP_BENEFITS_TAG]),
  );
  expect(page.meetingCuids()).toEqual([meetingSection.cuid]);
  expect(page.benefitsCuids()).toEqual([benefitsSection.cuid]);
  expect(cuids).toEqual(
    expect.arrayContaining([meetingSection.cuid, benefitsSection.cuid]),
  );
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(root.querySelectorAll('gssc-section').length).toBe(2);
});
// @relation(GSSC-PLLR-198, scope=range_end, role=Test)

// @relation(GSSC-PLLR-199, scope=range_start, role=Test)
test('GSSC-PLLR-199 Syntactic', async () => {
  const { root: full } = await setupMembershipPage();
  const meeting = full.querySelector('.gssc-membership-page__meeting');
  const benefits = full.querySelector('.gssc-membership-page__benefits');
  expect(meeting).not.toBeNull();
  expect(benefits).not.toBeNull();
  expect(
    meeting!.compareDocumentPosition(benefits!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(full.querySelector('.gssc-membership-page')!.classList.contains('w-full')).toBe(
    true,
  );

  const { root: emptyMeeting } = await setupMembershipPage({
    listByTag: async (tag) =>
      tag === MEMBERSHIP_BENEFITS_TAG ? [benefitsListEntry] : [],
  });
  expect(emptyMeeting.querySelector('.gssc-membership-page__meeting')).toBeNull();
  expect(emptyMeeting.querySelector('.gssc-membership-page__benefits')).not.toBeNull();

  const { root: emptyBenefits } = await setupMembershipPage({
    listByTag: async (tag) =>
      tag === MEMBERSHIP_MEETING_TAG ? [meetingListEntry] : [],
  });
  expect(emptyBenefits.querySelector('.gssc-membership-page__meeting')).not.toBeNull();
  expect(emptyBenefits.querySelector('.gssc-membership-page__benefits')).toBeNull();

  const { root: emptyBoth } = await setupMembershipPage({
    listByTag: async () => [],
  });
  expect(emptyBoth.querySelector('.gssc-membership-page__meeting')).toBeNull();
  expect(emptyBoth.querySelector('.gssc-membership-page__benefits')).toBeNull();
  expect(emptyBoth.querySelector('gssc-section')).toBeNull();
});
// @relation(GSSC-PLLR-199, scope=range_end, role=Test)

// @relation(GSSC-PLLR-200, scope=range_start, role=Test)
test('GSSC-PLLR-200 Lexical', async () => {
  const { root } = await setupMembershipPage();
  const page = root.querySelector<HTMLElement>('.gssc-membership-page')!;
  expect(page.classList.contains('font-sans')).toBe(true);
  expect(page.classList.contains('text-gssc-dark-green')).toBe(true);

  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-200, scope=range_end, role=Test)

// @relation(GSSC-PLLR-201, scope=range_start, role=Test)
test('GSSC-PLLR-201 Semantic', async () => {
  const { root } = await setupMembershipPage();
  const meeting = root.querySelector('.gssc-membership-page__meeting')!;
  const body = textContent(meeting, '.gssc-section__body');
  expect(body).toContain('Stanislaus County Library Modesto');
  expect(body).toContain('monthly');
  expect(body).toContain('second Thursday at 7:00 PM');
  expect(body).toContain('next meeting');
  expect(textContent(meeting, '.gssc-section__header')).toBe('Meeting Information');
});
// @relation(GSSC-PLLR-201, scope=range_end, role=Test)

// @relation(GSSC-PLLR-202, scope=range_start, role=Test)
test('GSSC-PLLR-202 Syntactic', async () => {
  const secondMeeting: MembershipSectionListEntry = {
    cuid: 'meeting_cuid_0',
    header: 'Earlier Meeting Note',
    body: 'Earlier index meeting body with location frequency schedule and next meeting.',
    tags: [MEMBERSHIP_MEETING_TAG],
    index: 0,
  };
  const secondData: BackendSectionData = {
    cuid: secondMeeting.cuid,
    header: secondMeeting.header,
    body: secondMeeting.body,
    resources: [],
    tags: secondMeeting.tags,
    index: secondMeeting.index,
  };

  const { root, page } = await setupMembershipPage({
    listByTag: async (tag) => {
      if (tag === MEMBERSHIP_MEETING_TAG) return [meetingListEntry, secondMeeting];
      if (tag === MEMBERSHIP_BENEFITS_TAG) return [benefitsListEntry];
      return [];
    },
    backendGet: async (cuid) =>
      cuid === secondMeeting.cuid ? secondData : (sectionsByCuid[cuid] ?? null),
  });

  expect(page.meetingCuids()).toEqual([secondMeeting.cuid, meetingSection.cuid]);
  const meetingGroup = root.querySelector('.gssc-membership-page__meeting')!;
  const benefitsGroup = root.querySelector('.gssc-membership-page__benefits')!;
  expect(
    meetingGroup.compareDocumentPosition(benefitsGroup) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const headers = [
    ...meetingGroup.querySelectorAll('.gssc-section__header'),
  ].map((el) => el.textContent?.trim());
  expect(headers).toEqual(['Earlier Meeting Note', 'Meeting Information']);
});
// @relation(GSSC-PLLR-202, scope=range_end, role=Test)

// @relation(GSSC-PLLR-203, scope=range_start, role=Test)
test('GSSC-PLLR-203 Lexical', async () => {
  const { root } = await setupMembershipPage();
  const meeting = root.querySelector('.gssc-membership-page__meeting')!;
  const container = meeting.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const header = meeting.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = meeting.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-203, scope=range_end, role=Test)

// @relation(GSSC-PLLR-204, scope=range_start, role=Test)
test('GSSC-PLLR-204 Semantic', async () => {
  const { root } = await setupMembershipPage();
  const benefits = root.querySelector('.gssc-membership-page__benefits')!;
  const body = textContent(benefits, '.gssc-section__body') ?? '';
  for (const topic of [
    'programs',
    'workshops',
    'seminars',
    'newsletters',
    'queries',
    'surname registration',
    'interest groups',
    'research trips',
  ]) {
    expect(body.toLowerCase()).toContain(topic);
  }
  expect(textContent(benefits, '.gssc-section__header')).toBe('Membership Benefits');
});
// @relation(GSSC-PLLR-204, scope=range_end, role=Test)

// @relation(GSSC-PLLR-205, scope=range_start, role=Test)
test('GSSC-PLLR-205 Syntactic', async () => {
  const secondBenefits: MembershipSectionListEntry = {
    cuid: 'benefits_cuid_0',
    header: 'Earlier Benefits Note',
    body: 'Earlier benefits covering programs workshops seminars newsletters queries surname registration interest groups research trips.',
    tags: [MEMBERSHIP_BENEFITS_TAG],
    index: 0,
  };
  const secondData: BackendSectionData = {
    cuid: secondBenefits.cuid,
    header: secondBenefits.header,
    body: secondBenefits.body,
    resources: [],
    tags: secondBenefits.tags,
    index: secondBenefits.index,
  };

  const { root, page } = await setupMembershipPage({
    listByTag: async (tag) => {
      if (tag === MEMBERSHIP_MEETING_TAG) return [meetingListEntry];
      if (tag === MEMBERSHIP_BENEFITS_TAG)
        return [benefitsListEntry, secondBenefits];
      return [];
    },
    backendGet: async (cuid) =>
      cuid === secondBenefits.cuid ? secondData : (sectionsByCuid[cuid] ?? null),
  });

  expect(page.benefitsCuids()).toEqual([
    secondBenefits.cuid,
    benefitsSection.cuid,
  ]);
  const meetingGroup = root.querySelector('.gssc-membership-page__meeting')!;
  const benefitsGroup = root.querySelector('.gssc-membership-page__benefits')!;
  expect(
    meetingGroup.compareDocumentPosition(benefitsGroup) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const headers = [
    ...benefitsGroup.querySelectorAll('.gssc-section__header'),
  ].map((el) => el.textContent?.trim());
  expect(headers).toEqual(['Earlier Benefits Note', 'Membership Benefits']);
});
// @relation(GSSC-PLLR-205, scope=range_end, role=Test)

// @relation(GSSC-PLLR-206, scope=range_start, role=Test)
test('GSSC-PLLR-206 Lexical', async () => {
  const { root } = await setupMembershipPage();
  const benefits = root.querySelector('.gssc-membership-page__benefits')!;
  const container = benefits.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const resource = benefits.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(resource.classList.contains('bg-gssc-white')).toBe(true);
  expect(resource.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(resource.classList.contains('border-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-206, scope=range_end, role=Test)
