import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { UrgentAnnouncements } from '../../services/urgent-announcements';
import { nativeElement, setupPublicComponent, textContent } from '../../../test-harness';
import { AnnouncementsBar } from './announcements-bar';

const sampleAnnouncement = {
  id: 'ann-1',
  title: 'Hall closed Friday',
  text: 'Research library hours change this week.',
};

async function setupBar() {
  const fixture = await setupPublicComponent(AnnouncementsBar);
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const announcements = TestBed.inject(UrgentAnnouncements);
  announcements.setAnnouncements([sampleAnnouncement]);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-15, scope=range_start, role=Test)
test('GSSC-PLLR-15 Semantic', async () => {
  const { fixture, router, root } = await setupBar();
  expect(textContent(root, '.gssc-announcements-bar__title')).toBe(sampleAnnouncement.title);
  expect(textContent(root, '.gssc-announcements-bar__text')).toBe(sampleAnnouncement.text);

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
  const title = root.querySelector<HTMLElement>('.gssc-announcements-bar__title')!;
  const text = root.querySelector<HTMLElement>('.gssc-announcements-bar__text')!;
  // jsdom returns the var() form; that still proves the theme tokens are used.
  expect(getComputedStyle(bar).backgroundColor).toBe('var(--gssc-cream)');
  expect(getComputedStyle(bar).borderBottomColor).toBe('var(--gssc-gray)');
  expect(getComputedStyle(title).color).toBe('var(--gssc-dark-green)');
  expect(getComputedStyle(text).color).toBe('var(--gssc-dark-brown)');
});
// @relation(GSSC-PLLR-17, scope=range_end, role=Test)
