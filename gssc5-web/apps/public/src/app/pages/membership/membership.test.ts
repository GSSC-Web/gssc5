import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  type BackendSectionData,
} from '../../modules/section-from-cuid/section-from-cuid';
import {
  MEMBERSHIP_INFO_TAG,
  MEMBERSHIP_SECTION_LIST_BY_TAG,
  MembershipPage,
  type MembershipSectionListEntry,
} from './membership';

const firstSection: BackendSectionData = {
  cuid: 'membership_cuid_1',
  header: 'Meeting Information',
  body: 'Society meeting details supplied by the backend section body.',
  resources: [],
  tags: [MEMBERSHIP_INFO_TAG],
  index: 1,
};

const secondSection: BackendSectionData = {
  cuid: 'membership_cuid_2',
  header: 'Membership Benefits',
  body: 'Society membership benefits supplied by the backend section body.',
  resources: ['/newsletters'],
  tags: [MEMBERSHIP_INFO_TAG],
  index: 2,
};

const firstListEntry: MembershipSectionListEntry = {
  cuid: firstSection.cuid,
  header: firstSection.header,
  body: firstSection.body,
  tags: firstSection.tags,
  index: firstSection.index,
};

const secondListEntry: MembershipSectionListEntry = {
  cuid: secondSection.cuid,
  header: secondSection.header,
  body: secondSection.body,
  tags: secondSection.tags,
  index: secondSection.index,
};

const sectionsByCuid: Record<string, BackendSectionData> = {
  [firstSection.cuid]: firstSection,
  [secondSection.cuid]: secondSection,
};

async function setupMembershipPage(options?: {
  listByTag?: (tag: string) => Promise<MembershipSectionListEntry[]>;
  backendGet?: (cuid: string) => Promise<BackendSectionData | null>;
}) {
  const listByTag =
    options?.listByTag ??
    (async (tag: string) => {
      if (tag === MEMBERSHIP_INFO_TAG) return [firstListEntry, secondListEntry];
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
      if (tag === MEMBERSHIP_INFO_TAG) return [firstListEntry, secondListEntry];
      return [];
    },
    backendGet: async (cuid) => {
      cuids.push(cuid);
      return sectionsByCuid[cuid] ?? null;
    },
  });

  expect(tags).toEqual([MEMBERSHIP_INFO_TAG]);
  expect(page.sectionCuids()).toEqual([firstSection.cuid, secondSection.cuid]);
  expect(cuids).toEqual(
    expect.arrayContaining([firstSection.cuid, secondSection.cuid]),
  );
  expect(root.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
  expect(root.querySelectorAll('gssc-section').length).toBe(2);
});
// @relation(GSSC-PLLR-198, scope=range_end, role=Test)

// @relation(GSSC-PLLR-199, scope=range_start, role=Test)
test('GSSC-PLLR-199 Syntactic', async () => {
  const { root: full, page } = await setupMembershipPage();
  const sections = full.querySelector('.gssc-membership-page__sections');
  expect(sections).not.toBeNull();
  expect(full.querySelector('.gssc-membership-page')!.classList.contains('w-full')).toBe(
    true,
  );
  expect(page.sectionCuids()).toEqual([firstSection.cuid, secondSection.cuid]);

  const { root: empty } = await setupMembershipPage({
    listByTag: async () => [],
  });
  expect(empty.querySelector('.gssc-membership-page__sections')).toBeNull();
  expect(empty.querySelector('gssc-section')).toBeNull();
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
  const sections = root.querySelector('.gssc-membership-page__sections')!;
  const bodies = [...sections.querySelectorAll('.gssc-section__body')].map(
    (el) => el.textContent?.trim(),
  );
  expect(bodies).toEqual([firstSection.body, secondSection.body]);
  const headers = [...sections.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim(),
  );
  expect(headers).toEqual([firstSection.header, secondSection.header]);
});
// @relation(GSSC-PLLR-201, scope=range_end, role=Test)

// @relation(GSSC-PLLR-202, scope=range_start, role=Test)
test('GSSC-PLLR-202 Syntactic', async () => {
  const { root, page } = await setupMembershipPage({
    listByTag: async (tag) => {
      if (tag !== MEMBERSHIP_INFO_TAG) return [];
      // Backend order as returned (not FE-resorted).
      return [secondListEntry, firstListEntry];
    },
  });

  expect(page.sectionCuids()).toEqual([secondSection.cuid, firstSection.cuid]);
  const sections = root.querySelector('.gssc-membership-page__sections')!;
  const headers = [...sections.querySelectorAll('.gssc-section__header')].map(
    (el) => el.textContent?.trim(),
  );
  expect(headers).toEqual([secondSection.header, firstSection.header]);
  expect(sections.querySelectorAll('gssc-section-from-cuid').length).toBe(2);
});
// @relation(GSSC-PLLR-202, scope=range_end, role=Test)

// @relation(GSSC-PLLR-203, scope=range_start, role=Test)
test('GSSC-PLLR-203 Lexical', async () => {
  const { root } = await setupMembershipPage();
  const sections = root.querySelector('.gssc-membership-page__sections')!;
  const container = sections.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const header = sections.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = sections.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-203, scope=range_end, role=Test)

// @relation(GSSC-PLLR-204, scope=range_start, role=Test)
test('GSSC-PLLR-204 Semantic', async () => {
  const { root } = await setupMembershipPage();
  const hosts = [...root.querySelectorAll('gssc-section-from-cuid')];
  expect(hosts.length).toBe(2);
  expect(textContent(hosts[0]!, '.gssc-section__body')).toBe(firstSection.body);
  expect(textContent(hosts[1]!, '.gssc-section__body')).toBe(secondSection.body);
  expect(textContent(hosts[0]!, '.gssc-section__header')).toBe(firstSection.header);
  expect(textContent(hosts[1]!, '.gssc-section__header')).toBe(secondSection.header);
});
// @relation(GSSC-PLLR-204, scope=range_end, role=Test)

// @relation(GSSC-PLLR-205, scope=range_start, role=Test)
test('GSSC-PLLR-205 Syntactic', async () => {
  const { root } = await setupMembershipPage();
  const sections = root.querySelector('.gssc-membership-page__sections')!;
  const hosts = [...sections.querySelectorAll('gssc-section-from-cuid')];
  expect(hosts.length).toBe(2);
  expect(hosts[0]!.querySelector('gssc-section')).not.toBeNull();
  expect(hosts[1]!.querySelector('gssc-section')).not.toBeNull();
  expect(
    hosts[0]!.compareDocumentPosition(hosts[1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-205, scope=range_end, role=Test)

// @relation(GSSC-PLLR-206, scope=range_start, role=Test)
test('GSSC-PLLR-206 Lexical', async () => {
  const { root } = await setupMembershipPage();
  const secondHost = root.querySelectorAll('gssc-section-from-cuid')[1]!;
  const container = secondHost.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  const resource = secondHost.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(resource.classList.contains('bg-gssc-white')).toBe(true);
  expect(resource.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(resource.classList.contains('border-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-206, scope=range_end, role=Test)
