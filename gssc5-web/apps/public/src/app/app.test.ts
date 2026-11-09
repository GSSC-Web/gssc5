import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PromptOverlay } from './services/prompt-overlay/prompt-overlay';
import { PublicError } from './services/public-error/public-error';
import { UrgentAnnouncements } from './services/urgent-announcements';
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
  promptOverlay: PromptOverlay;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(App);
  const router = TestBed.inject(Router);
  router.resetConfig(routes);
  const announcements = TestBed.inject(UrgentAnnouncements);
  const promptOverlay = TestBed.inject(PromptOverlay);
  promptOverlay.close();
  await router.navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router, announcements, promptOverlay, root: nativeElement(fixture) };
}

function hostOf(root: HTMLElement): HTMLElement {
  return root.matches('gssc-root') ? root : (root.querySelector('gssc-root') ?? root);
}

// @relation(GSSC-PLLR-4, scope=range_start, role=Test)
test('GSSC-PLLR-4 Semantic', async () => {
  const { fixture, announcements, root } = await setupApp('/membership');
  expect(root.querySelector('[data-slot="header"]')).not.toBeNull();
  expect(root.querySelector('router-outlet')).not.toBeNull();
  expect(root.querySelector('[data-slot="footer"]')).not.toBeNull();
  expect(root.querySelector('[data-slot="prompt-overlay"]')).not.toBeNull();
  expect(root.querySelector('gssc-announcements-bar')).toBeNull();

  announcements.setAnnouncements([sampleAnnouncement]);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('gssc-announcements-bar')).not.toBeNull();
});
// @relation(GSSC-PLLR-4, scope=range_end, role=Test)

// @relation(GSSC-PLLR-20, scope=range_start, role=Test)
test('GSSC-PLLR-20 Syntactic', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const appRoot = root.querySelector<HTMLElement>('.gssc-app-root')!;
  expect(getComputedStyle(host).minHeight).toBe('100dvh');
  expect(getComputedStyle(appRoot).minHeight).toBe('100dvh');
  expect(getComputedStyle(appRoot).display).toBe('flex');
  expect(getComputedStyle(appRoot).flexDirection).toBe('column');
});
// @relation(GSSC-PLLR-20, scope=range_end, role=Test)

// @relation(GSSC-PLLR-21, scope=range_start, role=Test)
test('GSSC-PLLR-21 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const appRoot = root.querySelector<HTMLElement>('.gssc-app-root')!;
  // jsdom returns the var() form; that still proves the theme token is used.
  expect(getComputedStyle(host).backgroundColor).toBe('var(--gssc-white)');
  expect(getComputedStyle(appRoot).backgroundColor).toBe('var(--gssc-white)');
  expect(getComputedStyle(host).fontFamily).toBe('var(--font-sans)');
});
// @relation(GSSC-PLLR-21, scope=range_end, role=Test)

// @relation(GSSC-PLLR-5, scope=range_start, role=Test)
test('GSSC-PLLR-5 Semantic', async () => {
  const { root } = await setupApp();
  expect(root.querySelector('[data-slot="header"]')).not.toBeNull();
});
// @relation(GSSC-PLLR-5, scope=range_end, role=Test)

// @relation(GSSC-PLLR-22, scope=range_start, role=Test)
test('GSSC-PLLR-22 Syntactic', async () => {
  const { root } = await setupApp();
  const header = root.querySelector<HTMLElement>('[data-slot="header"]')!;
  const style = getComputedStyle(header);
  expect(style.position).toBe('sticky');
  expect(style.top).toBe('0px');
});
// @relation(GSSC-PLLR-22, scope=range_end, role=Test)

// @relation(GSSC-PLLR-23, scope=range_start, role=Test)
test('GSSC-PLLR-23 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const header = root.querySelector<HTMLElement>('[data-slot="header"]')!;
  expect(getComputedStyle(header).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(header).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-PLLR-23, scope=range_end, role=Test)

// @relation(GSSC-PLLR-6, scope=range_start, role=Test)
test('GSSC-PLLR-6 Semantic', async () => {
  const { root } = await setupApp();
  const host = root.querySelector('[data-slot="footer"]');
  expect(host).not.toBeNull();
  expect(host!.querySelector('gssc-footer')).not.toBeNull();
});
// @relation(GSSC-PLLR-6, scope=range_end, role=Test)

// @relation(GSSC-PLLR-24, scope=range_start, role=Test)
test('GSSC-PLLR-24 Syntactic', async () => {
  const { root } = await setupApp();
  const children = [...root.querySelector('.gssc-app-root')!.children];
  expect(children.at(-1)?.getAttribute('data-slot')).toBe('footer');
});
// @relation(GSSC-PLLR-24, scope=range_end, role=Test)

// @relation(GSSC-PLLR-29, scope=range_start, role=Test)
test('GSSC-PLLR-29 Syntactic', async () => {
  const { root } = await setupApp();
  const host = root.querySelector<HTMLElement>('[data-slot="footer"]')!;
  const footer = host.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer).not.toBeNull();
  expect(host.contains(footer)).toBe(true);
  // Full-width via Tailwind w-full (fills the Footer host).
  expect(footer.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-29, scope=range_end, role=Test)

// @relation(GSSC-PLLR-25, scope=range_start, role=Test)
test('GSSC-PLLR-25 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const footer = root.querySelector<HTMLElement>('[data-slot="footer"]')!;
  expect(getComputedStyle(footer).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(footer).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-PLLR-25, scope=range_end, role=Test)

// @relation(GSSC-PLLR-104, scope=range_start, role=Test)
test('GSSC-PLLR-104 Semantic', async () => {
  const { fixture, promptOverlay, root } = await setupApp();
  const host = root.querySelector('[data-slot="prompt-overlay"]');
  expect(host).not.toBeNull();
  expect(host!.querySelector('gssc-prompt-overlay')).not.toBeNull();
  expect(root.querySelector('.gssc-prompt-overlay')).toBeNull();

  promptOverlay.open();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-prompt-overlay')).not.toBeNull();
});
// @relation(GSSC-PLLR-104, scope=range_end, role=Test)

// @relation(GSSC-PLLR-105, scope=range_start, role=Test)
test('GSSC-PLLR-105 Syntactic', async () => {
  const { fixture, promptOverlay, root } = await setupApp();
  const host = root.querySelector<HTMLElement>('[data-slot="prompt-overlay"]')!;
  expect(root.querySelector('.gssc-prompt-overlay')).toBeNull();

  const header = root.querySelector('[data-slot="header"]')!;
  const footer = root.querySelector('[data-slot="footer"]')!;
  const page = root.querySelector('.gssc-page')!;
  expect(header.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(page.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  promptOverlay.open();
  fixture.detectChanges();
  await fixture.whenStable();
  const shell = root.querySelector<HTMLElement>('.gssc-prompt-overlay')!;
  expect(host.contains(shell)).toBe(true);
  expect(shell.classList.contains('fixed')).toBe(true);
  expect(shell.classList.contains('inset-0')).toBe(true);
  expect(shell.classList.contains('z-50')).toBe(true);
});
// @relation(GSSC-PLLR-105, scope=range_end, role=Test)

// @relation(GSSC-PLLR-106, scope=range_start, role=Test)
test('GSSC-PLLR-106 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const promptHost = root.querySelector<HTMLElement>('[data-slot="prompt-overlay"]')!;
  expect(getComputedStyle(promptHost).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(promptHost).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-PLLR-106, scope=range_end, role=Test)

// @relation(GSSC-PLLR-7, scope=range_start, role=Test)
test('GSSC-PLLR-7 Semantic', async () => {
  const { root } = await setupApp('/membership');
  expect(root.querySelector('router-outlet')).not.toBeNull();
  expect(root.querySelector('gssc-membership-page')).not.toBeNull();
});
// @relation(GSSC-PLLR-7, scope=range_end, role=Test)

// @relation(GSSC-PLLR-26, scope=range_start, role=Test)
test('GSSC-PLLR-26 Syntactic', async () => {
  const { root } = await setupApp('/membership');
  const appRoot = root.querySelector('.gssc-app-root')!;
  const header = appRoot.querySelector('[data-slot="header"]')!;
  const footer = appRoot.querySelector('[data-slot="footer"]')!;
  const page = appRoot.querySelector<HTMLElement>('.gssc-page')!;
  const outlet = page.querySelector('router-outlet')!;
  expect(header.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(outlet.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getComputedStyle(page).flexGrow).toBe('1');
});
// @relation(GSSC-PLLR-26, scope=range_end, role=Test)

// @relation(GSSC-PLLR-27, scope=range_start, role=Test)
test('GSSC-PLLR-27 Lexical', async () => {
  const { root } = await setupApp();
  const host = hostOf(root);
  const page = root.querySelector<HTMLElement>('.gssc-page')!;
  expect(getComputedStyle(page).fontFamily).toBe(getComputedStyle(host).fontFamily);
  expect(getComputedStyle(page).color).toBe(getComputedStyle(host).color);
});
// @relation(GSSC-PLLR-27, scope=range_end, role=Test)

// @relation(GSSC-PLLR-96, scope=range_start, role=Test)
test('GSSC-PLLR-96 Syntactic', async () => {
  const { fixture, root } = await setupApp('/membership');
  const page = root.querySelector('.gssc-page')!;
  const host = page.querySelector('gssc-error');
  expect(host).not.toBeNull();
  expect(page.contains(host)).toBe(true);

  const publicError = TestBed.inject(PublicError);
  publicError.setContents({
    kind: 'application',
    name: 'Sample',
    description: 'Sample description',
    referenceNumber: 'GSSC-ERR-1',
  });
  fixture.detectChanges();
  await fixture.whenStable();

  const container = root.querySelector<HTMLElement>('.gssc-error')!;
  expect(page.contains(container)).toBe(true);
  expect(container.classList.contains('w-full')).toBe(true);
});
// @relation(GSSC-PLLR-96, scope=range_end, role=Test)


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

// @relation(GSSC-PLLR-16, scope=range_start, role=Test)
test('GSSC-PLLR-16 Syntactic', async () => {
  const { fixture, announcements, root } = await setupApp('/membership');
  expect(root.querySelector('gssc-announcements-bar')).toBeNull();

  announcements.setAnnouncements([sampleAnnouncement]);
  fixture.detectChanges();
  await fixture.whenStable();

  const appRoot = root.querySelector('.gssc-app-root')!;
  const header = appRoot.querySelector('[data-slot="header"]')!;
  const bar = appRoot.querySelector('gssc-announcements-bar')!;
  const page = appRoot.querySelector('.gssc-page')!;
  expect(header.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(bar.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await TestBed.inject(Router).navigateByUrl('/');
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('gssc-announcements-bar')).toBeNull();
});
// @relation(GSSC-PLLR-16, scope=range_end, role=Test)
