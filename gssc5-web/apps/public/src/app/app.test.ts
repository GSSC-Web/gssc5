import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { UrgentAnnouncements } from './urgent-announcements';
import { nativeElement, setupPublicComponent } from '../test-harness';

const sampleAnnouncement = {
  id: 'ann-1',
  title: 'Hall closed Friday',
  text: 'Research library hours change this week.',
};

async function setupApp(url = '/'): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<App>>>;
  router: Router;
  announcements: UrgentAnnouncements;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(App);
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const announcements = TestBed.inject(UrgentAnnouncements);
  await router.navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, announcements, root: nativeElement(fixture) };
}

// @relation(GSSC-PLLR-4, scope=range_start, role=Test)
test('GSSC-PLLR-4 Public App Root Composition', async () => {
  const { root } = await setupApp('/membership');
  expect(root.querySelector('[data-slot="header"]')).not.toBeNull();
  expect(root.querySelector('gssc-announcements-bar, .gssc-page router-outlet, [data-slot="footer"]')).not.toBeNull();
  expect(root.querySelector('[data-slot="footer"]')).not.toBeNull();
  expect(root.querySelector('router-outlet')).not.toBeNull();
});
// @relation(GSSC-PLLR-4, scope=range_end, role=Test)

// @relation(GSSC-PLLR-5, scope=range_start, role=Test)
test('GSSC-PLLR-5 Header Host Placement', async () => {
  const { root } = await setupApp();
  const header = root.querySelector<HTMLElement>('[data-slot="header"]')!;
  const style = getComputedStyle(header);
  expect(style.position).toBe('sticky');
  expect(style.top).toBe('0px');
});
// @relation(GSSC-PLLR-5, scope=range_end, role=Test)

// @relation(GSSC-PLLR-6, scope=range_start, role=Test)
test('GSSC-PLLR-6 Footer Host Placement', async () => {
  const { root } = await setupApp();
  const children = [...root.querySelector('.gssc-app-root')!.children];
  expect(children.at(-1)?.getAttribute('data-slot')).toBe('footer');
});
// @relation(GSSC-PLLR-6, scope=range_end, role=Test)

// @relation(GSSC-PLLR-7, scope=range_start, role=Test)
test('GSSC-PLLR-7 Routed Page Outlet', async () => {
  const { root } = await setupApp('/membership');
  const appRoot = root.querySelector('.gssc-app-root')!;
  const header = appRoot.querySelector('[data-slot="header"]')!;
  const footer = appRoot.querySelector('[data-slot="footer"]')!;
  const outlet = appRoot.querySelector('router-outlet')!;
  const position = header.compareDocumentPosition(outlet);
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const afterOutlet = outlet.compareDocumentPosition(footer);
  expect(afterOutlet & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-PLLR-7, scope=range_end, role=Test)

// @relation(GSSC-PLLR-8, scope=range_start, role=Test)
test('GSSC-PLLR-8 Home Page Route', async () => {
  const { router, root } = await setupApp('/');
  expect(router.url.split('?')[0]).toBe('/');
  expect(root.querySelector('gssc-home-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-8, scope=range_end, role=Test)

// @relation(GSSC-PLLR-9, scope=range_start, role=Test)
test('GSSC-PLLR-9 Membership Information Page Route', async () => {
  const { router, root } = await setupApp('/membership');
  expect(router.url).toBe('/membership');
  expect(root.querySelector('gssc-membership-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-9, scope=range_end, role=Test)

// @relation(GSSC-PLLR-10, scope=range_start, role=Test)
test('GSSC-PLLR-10 Leadership Page Route', async () => {
  const { router, root } = await setupApp('/leadership');
  expect(router.url).toBe('/leadership');
  expect(root.querySelector('gssc-leadership-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-10, scope=range_end, role=Test)

// @relation(GSSC-PLLR-11, scope=range_start, role=Test)
test('GSSC-PLLR-11 Calendar Page Route', async () => {
  const { router, root } = await setupApp('/calendar');
  expect(router.url).toBe('/calendar');
  expect(root.querySelector('gssc-calendar-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-11, scope=range_end, role=Test)

// @relation(GSSC-PLLR-12, scope=range_start, role=Test)
test('GSSC-PLLR-12 Publications Page Route', async () => {
  const { router, root } = await setupApp('/publications');
  expect(router.url).toBe('/publications');
  expect(root.querySelector('gssc-publications-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-12, scope=range_end, role=Test)

// @relation(GSSC-PLLR-13, scope=range_start, role=Test)
test('GSSC-PLLR-13 Research Tools Page Route', async () => {
  const { router, root } = await setupApp('/research-tools');
  expect(router.url).toBe('/research-tools');
  expect(root.querySelector('gssc-research-tools-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-13, scope=range_end, role=Test)

// @relation(GSSC-PLLR-14, scope=range_start, role=Test)
test('GSSC-PLLR-14 Newsletters Page Route', async () => {
  const { router, root } = await setupApp('/newsletters');
  expect(router.url).toBe('/newsletters');
  expect(root.querySelector('gssc-newsletters-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-14, scope=range_end, role=Test)

// @relation(GSSC-PLLR-15, scope=range_start, role=Test)
test('GSSC-PLLR-15 Announcements Bar on Non-Home Pages', async () => {
  const { fixture, announcements, root } = await setupApp('/membership');
  announcements.setAnnouncements([sampleAnnouncement]);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('gssc-announcements-bar')).not.toBeNull();
});
// @relation(GSSC-PLLR-15, scope=range_end, role=Test)

// @relation(GSSC-PLLR-16, scope=range_start, role=Test)
test('GSSC-PLLR-16 Announcements Bar Home Exclusion', async () => {
  const { fixture, announcements, root } = await setupApp('/');
  announcements.setAnnouncements([sampleAnnouncement]);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('gssc-announcements-bar')).toBeNull();
});
// @relation(GSSC-PLLR-16, scope=range_end, role=Test)
