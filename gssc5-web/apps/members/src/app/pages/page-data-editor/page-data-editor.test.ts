import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { routes } from '../../app.routes';
import { requireAuthGuard } from '../../services/auth-guards';
import { EditorSession } from '../../services/editor-session/editor-session';
import {
  SECTION_GET_BY_CUID,
  SECTION_PATCH_BY_CUID,
  SECTIONS_LIST_BY_TAG,
} from '../../services/sections-api';
import { nativeElement, textContent } from '../../../test-harness';
import { PageDataEditorPage, type PageDataKind } from './page-data-editor';

async function setup(kind: PageDataKind = 'sections') {
  const data$ = new BehaviorSubject<{ kind: PageDataKind }>({ kind });
  await TestBed.configureTestingModule({
    imports: [PageDataEditorPage],
    providers: [
      provideRouter(routes),
      EditorSession,
      { provide: SECTIONS_LIST_BY_TAG, useValue: async () => [] },
      { provide: SECTION_GET_BY_CUID, useValue: async () => null },
      {
        provide: SECTION_PATCH_BY_CUID,
        useValue: async () => ({ ok: false, forbidden: false }),
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { data: { kind } },
          data: data$.asObservable(),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(PageDataEditorPage);
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    root: nativeElement(fixture),
    router: TestBed.inject(Router),
    page: fixture.componentInstance,
    setKind: (next: PageDataKind) => {
      data$.next({ kind: next });
      fixture.detectChanges();
    },
  };
}

// @relation(GSSC-MLLR-308, scope=range_start, role=Test)
test('GSSC-MLLR-308 Page Data Editor Shell Semantic', async () => {
  const { root, fixture } = await setup('sections');
  try {
    expect(root.querySelector('[data-slot="page-data-editor"]')).toBeTruthy();
    expect(textContent(root, '.gssc-page-data-editor__title')).toBe('Page Data Editor');
    expect(textContent(root, '.gssc-page-data-editor__lead')).toContain('sections');
    expect(root.querySelector('[data-slot="page-data-kind-switcher"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="page-data-kind-panel"]')).toBeTruthy();
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-308, scope=range_end, role=Test)

// @relation(GSSC-MLLR-309, scope=range_start, role=Test)
test('GSSC-MLLR-309 Page Data Editor Shell Syntactic', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const shell = root.querySelector('.gssc-page-data-editor') as HTMLElement;
    expect(shell.className).toContain('flex');
    expect(shell.className).toContain('flex-col');
    expect(shell.className).toContain('max-w-4xl');
    const switcher = root.querySelector('.gssc-page-data-editor__kinds') as HTMLElement;
    expect(switcher.className).toContain('flex');
    expect(switcher.className).toContain('flex-wrap');
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-309, scope=range_end, role=Test)

// @relation(GSSC-MLLR-310, scope=range_start, role=Test)
test('GSSC-MLLR-310 Page Data Editor Shell Lexical', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const shell = root.querySelector('.gssc-page-data-editor') as HTMLElement;
    expect(shell.className).toContain('bg-gssc-white');
    expect(shell.className).toContain('font-sans');
    expect(shell.className).toContain('text-gssc-dark-green');
    const title = root.querySelector('.gssc-page-data-editor__title') as HTMLElement;
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('text-gssc-dark-green');
    const lead = root.querySelector('.gssc-page-data-editor__lead') as HTMLElement;
    expect(lead.className).toContain('text-gssc-dark-brown');
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-310, scope=range_end, role=Test)

// @relation(GSSC-MLLR-311, scope=range_start, role=Test)
test('GSSC-MLLR-311 Kind Switcher Semantic', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const switcher = root.querySelector('[data-slot="page-data-kind-switcher"]')!;
    expect(switcher.getAttribute('aria-label')).toBe('Page data kind');
    const buttons = Array.from(switcher.querySelectorAll<HTMLButtonElement>('[data-kind]'));
    expect(buttons.map((b) => b.getAttribute('data-kind'))).toEqual([
      'sections',
      'announcements',
      'events',
    ]);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Sections',
      'Announcements',
      'Events',
    ]);
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-311, scope=range_end, role=Test)

// @relation(GSSC-MLLR-312, scope=range_start, role=Test)
test('GSSC-MLLR-312 Kind Switcher Syntactic', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const switcher = root.querySelector('.gssc-page-data-editor__kinds') as HTMLElement;
    expect(switcher.className).toContain('border-b');
    expect(switcher.className).toContain('gap-2');
    const button = root.querySelector('.gssc-page-data-editor__kind') as HTMLElement;
    expect(button.className).toContain('inline-flex');
    expect(button.className).toContain('rounded-md');
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-312, scope=range_end, role=Test)

// @relation(GSSC-MLLR-313, scope=range_start, role=Test)
test('GSSC-MLLR-313 Kind Switcher Lexical', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const button = root.querySelector('.gssc-page-data-editor__kind') as HTMLElement;
    expect(button.className).toContain('border-gssc-dark-green');
    expect(button.className).toContain('bg-gssc-white');
    expect(button.className).toContain('font-sans');
    expect(button.className).toContain('text-gssc-dark-green');
    expect(button.className).toContain('hover:bg-gssc-light-green');
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-313, scope=range_end, role=Test)

// @relation(GSSC-MLLR-314, scope=range_start, role=Test)
test('GSSC-MLLR-314 Kind Panel Host Semantic', async () => {
  const { root, fixture, setKind } = await setup('sections');
  try {
    const panel = root.querySelector('[data-slot="page-data-kind-panel"]')!;
    expect(panel.getAttribute('data-active-kind')).toBe('sections');
    expect(root.querySelector('[data-slot="page-section-editor"]')).toBeTruthy();

    setKind('announcements');
    await fixture.whenStable();
    expect(panel.getAttribute('data-active-kind')).toBe('announcements');
    expect(root.querySelector('.gssc-announcements-editor-page')).toBeTruthy();

    setKind('events');
    await fixture.whenStable();
    expect(panel.getAttribute('data-active-kind')).toBe('events');
    expect(root.querySelector('.gssc-events-page')).toBeTruthy();
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-314, scope=range_end, role=Test)

// @relation(GSSC-MLLR-315, scope=range_start, role=Test)
test('GSSC-MLLR-315 Kind Panel Host Syntactic', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const panel = root.querySelector('.gssc-page-data-editor__panel') as HTMLElement;
    expect(panel.className).toContain('w-full');
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-315, scope=range_end, role=Test)

// @relation(GSSC-MLLR-316, scope=range_start, role=Test)
test('GSSC-MLLR-316 Kind Panel Host Lexical', async () => {
  const { root, fixture } = await setup('sections');
  try {
    const panel = root.querySelector('.gssc-page-data-editor__panel') as HTMLElement;
    expect(panel.className).not.toMatch(/bg-red|text-blue|purple/);
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-316, scope=range_end, role=Test)

// @relation(GSSC-MLLR-317, scope=range_start, role=Test)
test('GSSC-MLLR-317 Selecting Sections Kind', async () => {
  const { page, router, fixture } = await setup('announcements');
  try {
    const navigate = signal<string | null>(null);
    const original = router.navigateByUrl.bind(router);
    router.navigateByUrl = async (url: string | unknown) => {
      navigate.set(String(url));
      return original(url as string);
    };
    page.selectKind('sections');
    expect(navigate()).toBe('/page-sections');
    const sectionsRoute = routes.find((route) => route.path === 'page-sections');
    expect(sectionsRoute?.component).toBe(PageDataEditorPage);
    expect(sectionsRoute?.data?.['kind']).toBe('sections');
    expect(sectionsRoute?.canActivate).toEqual(expect.arrayContaining([requireAuthGuard]));
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-317, scope=range_end, role=Test)

// @relation(GSSC-MLLR-318, scope=range_start, role=Test)
test('GSSC-MLLR-318 Selecting Announcements Kind', async () => {
  const { page, router, fixture } = await setup('sections');
  try {
    const navigate = signal<string | null>(null);
    const original = router.navigateByUrl.bind(router);
    router.navigateByUrl = async (url: string | unknown) => {
      navigate.set(String(url));
      return original(url as string);
    };
    page.selectKind('announcements');
    expect(navigate()).toBe('/announcements');
    const announcementsRoute = routes.find((route) => route.path === 'announcements');
    expect(announcementsRoute?.component).toBe(PageDataEditorPage);
    expect(announcementsRoute?.data?.['kind']).toBe('announcements');
    expect(announcementsRoute?.canActivate).toEqual(expect.arrayContaining([requireAuthGuard]));
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-318, scope=range_end, role=Test)

// @relation(GSSC-MLLR-319, scope=range_start, role=Test)
test('GSSC-MLLR-319 Selecting Events Kind', async () => {
  const { page, router, fixture } = await setup('sections');
  try {
    const navigate = signal<string | null>(null);
    const original = router.navigateByUrl.bind(router);
    router.navigateByUrl = async (url: string | unknown) => {
      navigate.set(String(url));
      return original(url as string);
    };
    page.selectKind('events');
    expect(navigate()).toBe('/events');
    const eventsRoute = routes.find((route) => route.path === 'events');
    expect(eventsRoute?.component).toBe(PageDataEditorPage);
    expect(eventsRoute?.data?.['kind']).toBe('events');
    expect(eventsRoute?.canActivate).toEqual(expect.arrayContaining([requireAuthGuard]));
  } finally {
    fixture.destroy();
  }
});
// @relation(GSSC-MLLR-319, scope=range_end, role=Test)

// @relation(GSSC-MLLR-320, scope=range_start, role=Test)
test('GSSC-MLLR-320 Page Data Editor Canonical Path', () => {
  const canonical = routes.find((route) => route.path === 'page-data');
  expect(canonical?.redirectTo).toBe('page-sections');
  expect(canonical?.pathMatch).toBe('full');
});
// @relation(GSSC-MLLR-320, scope=range_end, role=Test)
