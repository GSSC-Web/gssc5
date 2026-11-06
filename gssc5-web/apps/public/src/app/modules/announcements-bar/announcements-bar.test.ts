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

// @relation(GSSC-PLLR-17, scope=range_start, role=Test)
test('GSSC-PLLR-17 Announcements Bar Title', async () => {
  const { root } = await setupBar();
  expect(textContent(root, '.gssc-announcements-bar__title')).toBe(sampleAnnouncement.title);
});
// @relation(GSSC-PLLR-17, scope=range_end, role=Test)

// @relation(GSSC-PLLR-18, scope=range_start, role=Test)
test('GSSC-PLLR-18 Announcements Bar Text', async () => {
  const { root } = await setupBar();
  expect(textContent(root, '.gssc-announcements-bar__text')).toBe(sampleAnnouncement.text);
});
// @relation(GSSC-PLLR-18, scope=range_end, role=Test)

// @relation(GSSC-PLLR-19, scope=range_start, role=Test)
test('GSSC-PLLR-19 Announcements Bar Selection', async () => {
  const { fixture, router, root } = await setupBar();
  await router.navigateByUrl('/membership');
  fixture.detectChanges();
  await fixture.whenStable();

  root.querySelector<HTMLButtonElement>('.gssc-announcements-bar__item')!.click();
  fixture.detectChanges();
  await fixture.whenStable();

  expect(router.url).toBe('/?focusAnnouncement=ann-1');
});
// @relation(GSSC-PLLR-19, scope=range_end, role=Test)
