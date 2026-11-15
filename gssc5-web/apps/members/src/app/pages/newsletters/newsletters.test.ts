import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { EditorSession } from '../../services/editor-session/editor-session';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import {
  formatKeywordsInput,
  newsletterLabel,
  newslettersApi,
  parseKeywordsInput,
  parseRequiredInteger,
  type NewsletterEntry,
} from '../../services/newsletters-api';
import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { NewslettersPage } from './newsletters';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleEntry: NewsletterEntry = {
  cuid: 'nl_1',
  volume: 42,
  number: 3,
  month: 11,
  year: 2026,
  filePath: 'file_abc',
  keywords: ['geology', 'newsletter'],
};

async function setupNewsletters(options?: {
  viewer?: { cuid: string; isAdmin?: boolean; isNewsletterEditor?: boolean };
  list?: NewsletterEntry[];
  get?: NewsletterEntry | null;
}): Promise<{
  fixture: Awaited<ReturnType<typeof setupMembersComponent<NewslettersPage>>>;
  root: HTMLElement;
  page: NewslettersPage;
  session: MemberSession;
  createdBodies: unknown[];
  patched: Array<{ cuid: string; body: unknown }>;
  restore: () => void;
}> {
  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    login: memberSessionApi.login,
    logout: memberSessionApi.logout,
    list: newslettersApi.list,
    get: newslettersApi.get,
    create: newslettersApi.create,
    update: newslettersApi.update,
  };

  try {
    globalThis.localStorage?.removeItem('gssc.memberSessionToken');
    globalThis.localStorage?.removeItem('gssc.memberDisplayName');
  } catch {
    // ignore
  }

  const viewer = options?.viewer ?? {
    cuid: 'user_1',
    isAdmin: false,
    isNewsletterEditor: true,
  };
  const list = options?.list ?? [sampleEntry];
  const createdBodies: unknown[] = [];
  const patched: Array<{ cuid: string; body: unknown }> = [];

  memberSessionApi.challenge = (async () =>
    okResponse({ status: 'valid', cuid: viewer.cuid })) as typeof memberSessionApi.challenge;
  memberSessionApi.getUser = (async () =>
    okResponse({
      cuid: viewer.cuid,
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      isAdmin: viewer.isAdmin === true,
      isUserMod: false,
      isNewsletterEditor: viewer.isNewsletterEditor === true,
    })) as typeof memberSessionApi.getUser;
  memberSessionApi.login = (async () => okResponse({ status: 'ok' })) as typeof memberSessionApi.login;
  memberSessionApi.logout = (async () => okResponse(null, 204)) as typeof memberSessionApi.logout;

  newslettersApi.list = (async () => okResponse(list)) as typeof newslettersApi.list;
  newslettersApi.get = (async (cuid: string) => {
    if (options?.get === null) return okResponse(null, 404);
    const entry = options?.get ?? list.find((row) => row.cuid === cuid) ?? sampleEntry;
    return okResponse({ ...entry, cuid });
  }) as typeof newslettersApi.get;
  newslettersApi.create = (async (body) => {
    createdBodies.push(body);
    return okResponse({ ...body, cuid: 'nl_new' });
  }) as typeof newslettersApi.create;
  newslettersApi.update = (async (cuid, body) => {
    patched.push({ cuid, body });
    return okResponse({
      cuid,
      volume: body.volume ?? sampleEntry.volume,
      number: body.number ?? sampleEntry.number,
      month: body.month ?? sampleEntry.month,
      year: body.year ?? sampleEntry.year,
      filePath: body.filePath ?? sampleEntry.filePath,
      keywords: body.keywords ?? sampleEntry.keywords,
    });
  }) as typeof newslettersApi.update;

  TestBed.resetTestingModule();
  const fixture = await setupMembersComponent(NewslettersPage, {
    providers: [provideRouter(routes), EditorSession, MemberSession],
  });
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    createdBodies,
    patched,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      memberSessionApi.login = originals.login;
      memberSessionApi.logout = originals.logout;
      newslettersApi.list = originals.list;
      newslettersApi.get = originals.get;
      newslettersApi.create = originals.create;
      newslettersApi.update = originals.update;
    },
  };
}

function fieldControl(root: HTMLElement, controlId: string): HTMLInputElement {
  return root.querySelector<HTMLInputElement>(`#${controlId}`)!;
}

async function typeField(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  controlId: string,
  value: string,
): Promise<void> {
  const input = fieldControl(root, controlId);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

// @relation(GSSC-MLLR-351, scope=range_start, role=Test)
test('GSSC-MLLR-351 Semantic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    expect(textContent(root, '.gssc-newsletters-page__title')).toBe('Newsletters');
    expect(root.querySelector('.gssc-newsletters-catalog')).not.toBeNull();
    expect(root.querySelector('.gssc-newsletters-new')).not.toBeNull();
    expect(root.querySelector('gssc-editor')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-volume')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-351, scope=range_end, role=Test)

// @relation(GSSC-MLLR-352, scope=range_start, role=Test)
test('GSSC-MLLR-352 Syntactic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const page = root.querySelector('.gssc-newsletters-page')!;
    expect(page.classList.contains('flex')).toBe(true);
    expect(page.classList.contains('flex-col')).toBe(true);
    const catalog = root.querySelector('.gssc-newsletters-catalog')!;
    const editor = root.querySelector('.gssc-newsletters-editor')!;
    expect(catalog.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-352, scope=range_end, role=Test)

// @relation(GSSC-MLLR-353, scope=range_start, role=Test)
test('GSSC-MLLR-353 Lexical', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const title = root.querySelector('.gssc-newsletters-page__title')!;
    expect(title.classList.contains('font-sans')).toBe(true);
    expect(title.classList.contains('text-gssc-dark-green')).toBe(true);
    const lede = root.querySelector('.gssc-newsletters-page__lede')!;
    expect(lede.classList.contains('font-sans')).toBe(true);
    expect(lede.classList.contains('text-gssc-dark-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-353, scope=range_end, role=Test)

// @relation(GSSC-MLLR-354, scope=range_start, role=Test)
test('GSSC-MLLR-354 Semantic', async () => {
  const { root, fixture, page, restore } = await setupNewsletters();
  try {
    expect(textContent(root, '.gssc-newsletters-catalog__entry')).toContain('Vol. 42');
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.selectedCuid()).toBe('nl_1');
    expect(fieldControl(root, 'gssc-newsletter-volume').value).toBe('42');
    expect(fieldControl(root, 'gssc-newsletter-file-path').value).toBe('file_abc');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-354, scope=range_end, role=Test)

// @relation(GSSC-MLLR-355, scope=range_start, role=Test)
test('GSSC-MLLR-355 Syntactic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const list = root.querySelector('.gssc-newsletters-catalog__list')!;
    expect(list.classList.contains('flex')).toBe(true);
    expect(list.classList.contains('flex-col')).toBe(true);
    expect(root.querySelector('.gssc-newsletters-catalog__entry')!.classList.contains('w-full')).toBe(
      true,
    );
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-355, scope=range_end, role=Test)

// @relation(GSSC-MLLR-356, scope=range_start, role=Test)
test('GSSC-MLLR-356 Lexical', async () => {
  const { root, fixture, restore } = await setupNewsletters();
  try {
    const entry = root.querySelector('.gssc-newsletters-catalog__entry')!;
    expect(entry.classList.contains('text-gssc-dark-green')).toBe(true);
    entry.dispatchEvent(new Event('click'));
    // click handler is async; use button click
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      root.querySelector('.gssc-newsletters-catalog__entry')!.classList.contains('bg-gssc-light-green'),
    ).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-356, scope=range_end, role=Test)

// @relation(GSSC-MLLR-357, scope=range_start, role=Test)
test('GSSC-MLLR-357 Semantic', async () => {
  const { root, fixture, page, restore } = await setupNewsletters();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-new')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.selectedCuid()).toBeNull();
    expect(fieldControl(root, 'gssc-newsletter-volume').value).toBe('');
    expect(fieldControl(root, 'gssc-newsletter-file-path').value).toBe('');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-357, scope=range_end, role=Test)

// @relation(GSSC-MLLR-358, scope=range_start, role=Test)
test('GSSC-MLLR-358 Syntactic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const actions = root.querySelector('.gssc-newsletters-catalog-actions')!;
    const editor = root.querySelector('.gssc-newsletters-editor')!;
    expect(actions.querySelector('.gssc-newsletters-new')).not.toBeNull();
    expect(actions.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-358, scope=range_end, role=Test)

// @relation(GSSC-MLLR-359, scope=range_start, role=Test)
test('GSSC-MLLR-359 Lexical', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const control = root.querySelector('.gssc-newsletters-new')!;
    expect(control.classList.contains('font-sans')).toBe(true);
    expect(control.classList.contains('text-gssc-dark-green')).toBe(true);
    expect(control.classList.contains('bg-gssc-light-green')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-359, scope=range_end, role=Test)

// @relation(GSSC-MLLR-360, scope=range_start, role=Test)
test('GSSC-MLLR-360 Semantic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    expect(root.querySelector('gssc-editor .gssc-editor')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-volume')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-number')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-month')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-year')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-file-path')).not.toBeNull();
    expect(root.querySelector('#gssc-newsletter-keywords')).not.toBeNull();
    expect(root.querySelector('.gssc-editor__save')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-360, scope=range_end, role=Test)

// @relation(GSSC-MLLR-361, scope=range_start, role=Test)
test('GSSC-MLLR-361 Syntactic', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    const editor = root.querySelector('.gssc-newsletters-editor')!;
    expect(editor.classList.contains('w-full')).toBe(true);
    expect(root.querySelector('.gssc-editor__fields')!.classList.contains('flex-col')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-361, scope=range_end, role=Test)

// @relation(GSSC-MLLR-362, scope=range_start, role=Test)
test('GSSC-MLLR-362 Lexical', async () => {
  const { root, restore } = await setupNewsletters();
  try {
    expect(root.querySelectorAll('gssc-form-text-field').length).toBe(6);
    expect(root.querySelector('.gssc-form-text-field')).not.toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-362, scope=range_end, role=Test)

// @relation(GSSC-MLLR-363, scope=range_start, role=Test)
test('GSSC-MLLR-363 Semantic', async () => {
  const { root, restore } = await setupNewsletters({
    viewer: { cuid: 'user_2', isAdmin: false, isNewsletterEditor: false },
  });
  try {
    expect(textContent(root, '.gssc-newsletters-unauthorized')).toContain('unavailable');
    expect(root.querySelector('gssc-editor')).toBeNull();
    expect(root.querySelector('.gssc-newsletters-new')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-363, scope=range_end, role=Test)

// @relation(GSSC-MLLR-364, scope=range_start, role=Test)
test('GSSC-MLLR-364 Syntactic', async () => {
  const { root, restore } = await setupNewsletters({
    viewer: { cuid: 'user_2', isAdmin: false, isNewsletterEditor: false },
  });
  try {
    expect(root.querySelector('.gssc-newsletters-page .gssc-newsletters-unauthorized')).not.toBeNull();
    expect(root.querySelector('.gssc-newsletters-catalog')).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-364, scope=range_end, role=Test)

// @relation(GSSC-MLLR-365, scope=range_start, role=Test)
test('GSSC-MLLR-365 Lexical', async () => {
  const { root, restore } = await setupNewsletters({
    viewer: { cuid: 'user_2', isAdmin: false, isNewsletterEditor: false },
  });
  try {
    const notice = root.querySelector('.gssc-newsletters-unauthorized')!;
    expect(notice.classList.contains('font-sans')).toBe(true);
    expect(notice.classList.contains('text-gssc-dark-red')).toBe(true);
    expect(notice.classList.contains('bg-gssc-light-red')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-365, scope=range_end, role=Test)

// @relation(GSSC-MLLR-366, scope=range_start, role=Test)
test('GSSC-MLLR-366 Newsletters Authentication', async () => {
  const newslettersRoute = routes.find((route) => route.path === 'newsletters');
  expect(newslettersRoute).toBeDefined();
  expect(newslettersRoute?.canActivate).toBeDefined();
  expect(newslettersRoute?.canActivate?.length).toBeGreaterThan(0);

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    providers: [provideRouter(routes), MemberSession],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const session = TestBed.inject(MemberSession);
  session.loggedIn.set(false);
  session.ready.set(true);
  await router.navigateByUrl('/newsletters');
  expect(router.url.startsWith('/login')).toBe(true);
});
// @relation(GSSC-MLLR-366, scope=range_end, role=Test)

// @relation(GSSC-MLLR-367, scope=range_start, role=Test)
test('GSSC-MLLR-367 Newsletter Editor Authorization', async () => {
  const editor = await setupNewsletters({
    viewer: { cuid: 'ed', isAdmin: false, isNewsletterEditor: true },
  });
  const admin = await setupNewsletters({
    viewer: { cuid: 'ad', isAdmin: true, isNewsletterEditor: false },
  });
  try {
    expect(editor.page.canEdit()).toBe(true);
    expect(editor.root.querySelector('gssc-editor')).not.toBeNull();
    expect(admin.page.canEdit()).toBe(true);
    expect(admin.root.querySelector('gssc-editor')).not.toBeNull();
  } finally {
    editor.restore();
    admin.restore();
  }
});
// @relation(GSSC-MLLR-367, scope=range_end, role=Test)

// @relation(GSSC-MLLR-368, scope=range_start, role=Test)
test('GSSC-MLLR-368 Newsletter Creation Persist', async () => {
  const { root, fixture, page, createdBodies, restore } = await setupNewsletters({ list: [] });
  try {
    await typeField(fixture, root, 'gssc-newsletter-volume', '7');
    await typeField(fixture, root, 'gssc-newsletter-number', '1');
    await typeField(fixture, root, 'gssc-newsletter-month', '5');
    await typeField(fixture, root, 'gssc-newsletter-year', '2025');
    await typeField(fixture, root, 'gssc-newsletter-file-path', 'file_new');
    await typeField(fixture, root, 'gssc-newsletter-keywords', 'alpha, beta');
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(createdBodies.length).toBe(1);
    expect(createdBodies[0]).toEqual({
      volume: 7,
      number: 1,
      month: 5,
      year: 2025,
      filePath: 'file_new',
      keywords: ['alpha', 'beta'],
    });
    expect(page.selectedCuid()).toBe('nl_new');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-368, scope=range_end, role=Test)

// @relation(GSSC-MLLR-369, scope=range_start, role=Test)
test('GSSC-MLLR-369 Newsletter Publication Persist', async () => {
  const { root, fixture, createdBodies, restore } = await setupNewsletters({ list: [] });
  try {
    await typeField(fixture, root, 'gssc-newsletter-volume', '1');
    await typeField(fixture, root, 'gssc-newsletter-number', '1');
    await typeField(fixture, root, 'gssc-newsletter-month', '1');
    await typeField(fixture, root, 'gssc-newsletter-year', '2026');
    await typeField(fixture, root, 'gssc-newsletter-file-path', 'file_pub');
    await typeField(fixture, root, 'gssc-newsletter-keywords', '');
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    // Successful create body is the public-catalog persist (no draft flag).
    expect(createdBodies[0]).toMatchObject({ filePath: 'file_pub', keywords: [] });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-369, scope=range_end, role=Test)

// @relation(GSSC-MLLR-370, scope=range_start, role=Test)
test('GSSC-MLLR-370 Newsletter Modification Persist', async () => {
  const { root, fixture, patched, restore } = await setupNewsletters();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await typeField(fixture, root, 'gssc-newsletter-volume', '99');
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(patched.length).toBe(1);
    expect(patched[0]?.cuid).toBe('nl_1');
    expect(patched[0]?.body).toMatchObject({ volume: 99, filePath: 'file_abc' });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-370, scope=range_end, role=Test)

// @relation(GSSC-MLLR-371, scope=range_start, role=Test)
test('GSSC-MLLR-371 Newsletter Catalog Load', async () => {
  const { root, page, restore } = await setupNewsletters({
    list: [sampleEntry, { ...sampleEntry, cuid: 'nl_2', volume: 41, number: 2 }],
  });
  try {
    expect(page.entries().length).toBe(2);
    expect(root.querySelectorAll('.gssc-newsletters-catalog__entry').length).toBe(2);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-371, scope=range_end, role=Test)

// @relation(GSSC-MLLR-372, scope=range_start, role=Test)
test('GSSC-MLLR-372 Newsletter Editor Cancel', async () => {
  const { root, fixture, patched, restore } = await setupNewsletters();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await typeField(fixture, root, 'gssc-newsletter-volume', '11');
    root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fieldControl(root, 'gssc-newsletter-volume').value).toBe('42');
    expect(patched.length).toBe(0);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-372, scope=range_end, role=Test)

// @relation(GSSC-MLLR-373, scope=range_start, role=Test)
test('GSSC-MLLR-373 Newsletter Catalog Selection Load', async () => {
  const { root, fixture, restore } = await setupNewsletters();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-newsletters-catalog__entry')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fieldControl(root, 'gssc-newsletter-volume').value).toBe('42');
    expect(fieldControl(root, 'gssc-newsletter-number').value).toBe('3');
    expect(fieldControl(root, 'gssc-newsletter-month').value).toBe('11');
    expect(fieldControl(root, 'gssc-newsletter-year').value).toBe('2026');
    expect(fieldControl(root, 'gssc-newsletter-file-path').value).toBe('file_abc');
    expect(fieldControl(root, 'gssc-newsletter-keywords').value).toBe('geology, newsletter');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-373, scope=range_end, role=Test)

test('newsletters-api helpers', () => {
  expect(newsletterLabel(sampleEntry)).toBe('Vol. 42 No. 3 · 11/2026');
  expect(parseKeywordsInput(' a, b , ,c ')).toEqual(['a', 'b', 'c']);
  expect(formatKeywordsInput(['a', 'b'])).toBe('a, b');
  expect(parseRequiredInteger('12')).toBe(12);
  expect(parseRequiredInteger('x')).toBeNull();
});
