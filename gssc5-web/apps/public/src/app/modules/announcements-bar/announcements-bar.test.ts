import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import {
  URGENT_ANNOUNCEMENTS_LIST,
  UrgentAnnouncements,
  type UrgentAnnouncementListEntry,
} from '../../services/urgent-announcements';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { AnnouncementsBar } from './announcements-bar';

const sampleEntry: UrgentAnnouncementListEntry = {
  cuid: 'ann-1',
  header: 'Hall closed Friday',
  body: 'Research library hours change this week.',
  tags: ['urgent'],
  index: 0,
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
};

async function setupBar(entries: UrgentAnnouncementListEntry[] = [sampleEntry]) {
  const fixture = await setupPublicComponent(AnnouncementsBar, {
    providers: [
      {
        provide: URGENT_ANNOUNCEMENTS_LIST,
        useValue: async () => entries,
      },
    ],
  });
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const announcements = TestBed.inject(UrgentAnnouncements);
  await announcements.load();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-15, scope=range_start, role=Test)
test('GSSC-PLLR-15 Semantic', async () => {
  const { fixture, router, root } = await setupBar();
  expect(textContent(root, '.gssc-announcements-bar__title')).toBe(
    sampleEntry.header,
  );
  expect(textContent(root, '.gssc-announcements-bar__text')).toBe(sampleEntry.body);

  await router.navigateByUrl('/membership');
  fixture.detectChanges();
  await fixture.whenStable();

  root.querySelector<HTMLButtonElement>('.gssc-announcements-bar__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  expect(router.url).toBe('/?focusAnnouncement=ann-1');
});
// @relation(GSSC-PLLR-15, scope=range_end, role=Test)

// @relation(GSSC-PLLR-17, scope=range_start, role=Test)
test('GSSC-PLLR-17 Lexical', async () => {
  const { root } = await setupBar();
  const bar = root.querySelector<HTMLElement>('.gssc-announcements-bar')!;
  const item = root.querySelector<HTMLElement>('.gssc-announcements-bar__item')!;
  const title = root.querySelector<HTMLElement>('.gssc-announcements-bar__title')!;
  const text = root.querySelector<HTMLElement>('.gssc-announcements-bar__text')!;
  // Prefer theme utility classes over getComputedStyle (jsdom / @layer limits).
  expect(bar.classList.contains('bg-gssc-cream')).toBe(true);
  expect(bar.classList.contains('border-gssc-gray')).toBe(true);
  expect(bar.classList.contains('font-sans')).toBe(true);
  expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(title.classList.contains('font-semibold')).toBe(true);
  expect(title.classList.contains('font-sans')).toBe(true);
  expect(text.classList.contains('text-gssc-dark-brown')).toBe(true);
  expect(text.classList.contains('font-normal')).toBe(true);
  expect(text.classList.contains('font-sans')).toBe(true);
  expect(item.classList.contains('hover:bg-gssc-light-green')).toBe(true);
  expect(item.classList.contains('focus-visible:bg-gssc-light-green')).toBe(true);
});
// @relation(GSSC-PLLR-17, scope=range_end, role=Test)
