import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { EditorSession } from '../../services/editor-session/editor-session';
import { EventRecord, eventsApi } from '../../services/events-api';
import { MemberSession, memberSessionApi } from '../../services/member-session';
import { nativeElement, textContent } from '../../../test-harness';
import { PageDataEditorPage } from '../page-data-editor/page-data-editor';
import { EventsPage } from './events';

function okResponse(data: unknown, status = 200) {
  return {
    data,
    error: null,
    response: new Response(null, { status }),
    status,
    headers: new Headers(),
  };
}

const sampleEvent: EventRecord = {
  cuid: 'evt_1',
  name: 'Spring Meeting',
  month: 3,
  day: 15,
  year: 2026,
  announcementStartMonth: 3,
  announcementStartDay: 1,
  announcementStartYear: 2026,
  time: '19:00',
  duration: '2h',
  location: 'Hall A',
  isPublic: true,
  pageDataCuid: 'pd_1',
  header: 'Spring Meeting',
  body: 'Agenda details',
  resources: [],
  startMonth: 3,
  startDay: 15,
  startYear: 2026,
  endMonth: 3,
  endDay: 15,
  endYear: 2026,
  imageFile: null,
  imagePosition: null,
};

type EventCreateCapture = { body: unknown };
type EventUpdateCapture = { cuid: string; body: unknown };

async function setupEvents(options?: {
  viewer?: { cuid: string; isAdmin?: boolean; isUserMod?: boolean };
  catalog?: EventRecord[];
}): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<EventsPage>>;
  root: HTMLElement;
  page: EventsPage;
  session: MemberSession;
  created: EventCreateCapture[];
  updated: EventUpdateCapture[];
  restore: () => void;
}> {
  const originals = {
    challenge: memberSessionApi.challenge,
    getUser: memberSessionApi.getUser,
    list: eventsApi.list,
    create: eventsApi.create,
    update: eventsApi.update,
    get: eventsApi.get,
  };

  const created: EventCreateCapture[] = [];
  const updated: EventUpdateCapture[] = [];
  const catalog = options?.catalog ?? [sampleEvent];
  const viewer = options?.viewer ?? { cuid: 'mod_1', isUserMod: true };

  memberSessionApi.challenge = (async () =>
    okResponse({ status: 'valid', cuid: viewer.cuid })) as typeof memberSessionApi.challenge;
  memberSessionApi.getUser = (async () =>
    okResponse({
      cuid: viewer.cuid,
      firstName: 'Mod',
      lastName: 'Erator',
      username: 'mod',
      isAdmin: viewer.isAdmin === true,
      isUserMod: viewer.isUserMod === true,
    })) as typeof memberSessionApi.getUser;

  eventsApi.list = (async () => okResponse(catalog)) as typeof eventsApi.list;
  eventsApi.create = (async (body) => {
    created.push({ body });
    const record: EventRecord = {
      ...sampleEvent,
      cuid: 'evt_new',
      name: String((body as { name: string }).name),
      isPublic: Boolean((body as { isPublic: boolean }).isPublic),
      month: Number((body as { month: number }).month),
      day: Number((body as { day: number }).day),
      year: Number((body as { year: number }).year),
      time: String((body as { time: string }).time),
      duration: String((body as { duration: string }).duration),
      location: String((body as { location: string }).location),
      header: String((body as { header?: string }).header ?? (body as { name: string }).name),
      body: String((body as { body?: string }).body ?? ''),
    };
    return okResponse(record, 201);
  }) as typeof eventsApi.create;
  eventsApi.update = (async (cuid, body) => {
    updated.push({ cuid, body });
    return okResponse({
      ...sampleEvent,
      cuid,
      ...body,
      name: String((body as { name?: string }).name ?? sampleEvent.name),
      isPublic:
        (body as { isPublic?: boolean }).isPublic !== undefined
          ? Boolean((body as { isPublic?: boolean }).isPublic)
          : sampleEvent.isPublic,
    });
  }) as typeof eventsApi.update;

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [EventsPage],
    providers: [provideRouter(routes), EditorSession],
  }).compileComponents();

  const fixture = TestBed.createComponent(EventsPage);
  const session = TestBed.inject(MemberSession);
  await session.whenReady();
  session.loggedIn.set(true);
  session.cuid.set(viewer.cuid);
  session.isAdmin.set(viewer.isAdmin === true);
  session.isUserMod.set(viewer.isAdmin === true || viewer.isUserMod === true);
  session.displayName.set('Mod Erator');
  session.ready.set(true);

  fixture.detectChanges();
  await fixture.whenStable();
  await fixture.componentInstance.loadCatalog();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    root: nativeElement(fixture),
    page: fixture.componentInstance,
    session,
    created,
    updated,
    restore: () => {
      memberSessionApi.challenge = originals.challenge;
      memberSessionApi.getUser = originals.getUser;
      eventsApi.list = originals.list;
      eventsApi.create = originals.create;
      eventsApi.update = originals.update;
      eventsApi.get = originals.get;
    },
  };
}

function pageEl(root: HTMLElement): HTMLElement {
  return root.querySelector('.gssc-events-page')!;
}

async function fillRequiredFields(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  page: EventsPage,
): Promise<void> {
  page.name.set('Autumn Fair');
  page.month.set('10');
  page.day.set('5');
  page.year.set('2026');
  page.announcementStartMonth.set('9');
  page.announcementStartDay.set('1');
  page.announcementStartYear.set('2026');
  page.time.set('14:00');
  page.duration.set('3h');
  page.location.set('Lawn');
  page.header.set('Autumn Fair');
  page.body.set('Bring a dish');
  page.visibility.set('public');
  fixture.detectChanges();
  await fixture.whenStable();
}

async function markDirty(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
): Promise<void> {
  const input = root.querySelector<HTMLInputElement>('.gssc-form-text-field__control')!;
  input.value = `${input.value} `;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

// @relation(GSSC-MLLR-321, scope=range_start, role=Test)
test('GSSC-MLLR-321 Semantic', async () => {
  const { root, restore } = await setupEvents();
  try {
    expect(pageEl(root)).toBeTruthy();
    expect(root.querySelector('.gssc-events-catalog')).toBeTruthy();
    expect(root.querySelector('.gssc-event-editor-host .gssc-editor')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-321, scope=range_end, role=Test)

// @relation(GSSC-MLLR-322, scope=range_start, role=Test)
test('GSSC-MLLR-322 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const page = pageEl(root);
    expect(page.className).toContain('flex-col');
    const catalog = root.querySelector('.gssc-events-catalog')!;
    const editor = root.querySelector('.gssc-event-editor-host')!;
    expect(catalog.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-322, scope=range_end, role=Test)

// @relation(GSSC-MLLR-323, scope=range_start, role=Test)
test('GSSC-MLLR-323 Lexical', async () => {
  const { root, restore } = await setupEvents();
  try {
    const page = pageEl(root);
    expect(page.className).toContain('font-sans');
    expect(page.className).toContain('text-gssc-dark-green');
    expect(page.className).toContain('bg-gssc-white');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-323, scope=range_end, role=Test)

// @relation(GSSC-MLLR-324, scope=range_start, role=Test)
test('GSSC-MLLR-324 Semantic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const label = textContent(root, '.gssc-events-catalog__entry-button');
    expect(label).toContain('Spring Meeting');
    expect(label).toContain('2026-03-15');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-324, scope=range_end, role=Test)

// @relation(GSSC-MLLR-325, scope=range_start, role=Test)
test('GSSC-MLLR-325 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const catalog = root.querySelector('.gssc-events-catalog')!;
    const newBtn = catalog.querySelector('.gssc-events-new')!;
    const list = catalog.querySelector('.gssc-events-catalog__list')!;
    expect(catalog.className).toContain('flex-col');
    expect(newBtn.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-325, scope=range_end, role=Test)

// @relation(GSSC-MLLR-326, scope=range_start, role=Test)
test('GSSC-MLLR-326 Lexical', async () => {
  const { root, restore } = await setupEvents();
  try {
    const catalog = root.querySelector('.gssc-events-catalog')!;
    expect(catalog.className).toContain('font-sans');
    expect(catalog.className).toContain('text-gssc-dark-green');
    expect(catalog.className).toContain('border-gssc-gray');
    expect(textContent(root, '.gssc-events-catalog__heading')).toBe('Catalog');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-326, scope=range_end, role=Test)

// @relation(GSSC-MLLR-327, scope=range_start, role=Test)
test('GSSC-MLLR-327 Semantic', async () => {
  const { root, fixture, page, restore } = await setupEvents();
  try {
    const button = root.querySelector<HTMLButtonElement>('.gssc-events-catalog__entry-button')!;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.mode()).toBe('edit');
    expect(page.editingCuid()).toBe('evt_1');
    expect(page.name()).toBe('Spring Meeting');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-327, scope=range_end, role=Test)

// @relation(GSSC-MLLR-328, scope=range_start, role=Test)
test('GSSC-MLLR-328 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const entry = root.querySelector('.gssc-events-catalog__entry')!;
    expect(entry.tagName).toBe('LI');
    expect(entry.parentElement?.classList.contains('gssc-events-catalog__list')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-328, scope=range_end, role=Test)

// @relation(GSSC-MLLR-329, scope=range_start, role=Test)
test('GSSC-MLLR-329 Lexical', async () => {
  const { root, fixture, restore } = await setupEvents();
  try {
    const button = root.querySelector<HTMLButtonElement>('.gssc-events-catalog__entry-button')!;
    expect(button.className).toContain('font-sans');
    expect(button.className).toContain('text-gssc-dark-green');
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.className).toContain('bg-gssc-light-green');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-329, scope=range_end, role=Test)

// @relation(GSSC-MLLR-330, scope=range_start, role=Test)
test('GSSC-MLLR-330 Semantic', async () => {
  const { root, fixture, page, restore } = await setupEvents();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-events-catalog__entry-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.gssc-events-new')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.mode()).toBe('create');
    expect(page.name()).toBe('');
    expect(page.editingCuid()).toBeNull();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-330, scope=range_end, role=Test)

// @relation(GSSC-MLLR-331, scope=range_start, role=Test)
test('GSSC-MLLR-331 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const catalog = root.querySelector('.gssc-events-catalog')!;
    const newBtn = catalog.querySelector('.gssc-events-new')!;
    const list = catalog.querySelector('.gssc-events-catalog__list')!;
    expect(newBtn.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-331, scope=range_end, role=Test)

// @relation(GSSC-MLLR-332, scope=range_start, role=Test)
test('GSSC-MLLR-332 Lexical', async () => {
  const { root, restore } = await setupEvents();
  try {
    const newBtn = root.querySelector('.gssc-events-new')!;
    expect(newBtn.className).toContain('bg-gssc-light-green');
    expect(newBtn.className).toContain('border-gssc-dark-green');
    expect(newBtn.className).toContain('text-gssc-dark-green');
    expect(newBtn.className).toContain('font-sans');
    expect(newBtn.textContent?.trim()).toBe('New Event');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-332, scope=range_end, role=Test)

// @relation(GSSC-MLLR-333, scope=range_start, role=Test)
test('GSSC-MLLR-333 Semantic', async () => {
  const { root, page, restore } = await setupEvents();
  try {
    const editor = root.querySelector('.gssc-editor')!;
    expect(editor.getAttribute('data-resource-id')).toBe(page.editorResourceId());
    expect(root.querySelector('.gssc-event-fields')).toBeTruthy();
    expect(root.querySelector('.gssc-editor__save')).toBeTruthy();
    expect(root.querySelector('.gssc-editor__cancel')).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-333, scope=range_end, role=Test)

// @relation(GSSC-MLLR-334, scope=range_start, role=Test)
test('GSSC-MLLR-334 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const catalog = root.querySelector('.gssc-events-catalog')!;
    const host = root.querySelector('.gssc-event-editor-host')!;
    expect(host.className).toContain('w-full');
    expect(catalog.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-334, scope=range_end, role=Test)

// @relation(GSSC-MLLR-335, scope=range_start, role=Test)
test('GSSC-MLLR-335 Lexical', async () => {
  const { root, restore } = await setupEvents();
  try {
    expect(root.querySelector('.gssc-editor')).toBeTruthy();
    expect(root.querySelectorAll('.gssc-editor').length).toBe(1);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-335, scope=range_end, role=Test)

// @relation(GSSC-MLLR-336, scope=range_start, role=Test)
test('GSSC-MLLR-336 Semantic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const labels = Array.from(root.querySelectorAll('.gssc-form-text-field__label, .gssc-form-select-field__label')).map(
      (el) => el.textContent?.replace(/\s+/g, ' ').trim(),
    );
    for (const needed of [
      'Name',
      'Month',
      'Day',
      'Year',
      'Announcement Start Month',
      'Announcement Start Day',
      'Announcement Start Year',
      'Time',
      'Duration',
      'Location',
      'Header',
      'Body',
      'Visibility',
    ]) {
      expect(labels.some((label) => label?.startsWith(needed))).toBe(true);
    }
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-336, scope=range_end, role=Test)

// @relation(GSSC-MLLR-337, scope=range_start, role=Test)
test('GSSC-MLLR-337 Syntactic', async () => {
  const { root, restore } = await setupEvents();
  try {
    const fields = root.querySelector('.gssc-event-fields')!;
    expect(fields.className).toContain('flex-col');
    expect(fields.parentElement?.classList.contains('gssc-editor__fields')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-337, scope=range_end, role=Test)

// @relation(GSSC-MLLR-338, scope=range_start, role=Test)
test('GSSC-MLLR-338 Lexical', async () => {
  const { root, restore } = await setupEvents();
  try {
    const nameLabel = Array.from(root.querySelectorAll('.gssc-form-text-field__label')).find((el) =>
      el.textContent?.includes('Name'),
    );
    expect(nameLabel?.textContent).toContain('*');
    expect(nameLabel?.textContent?.trim().startsWith('Name')).toBe(true);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-338, scope=range_end, role=Test)

// @relation(GSSC-MLLR-339, scope=range_start, role=Test)
test('GSSC-MLLR-339 Catalog Load', async () => {
  const { root, page, restore } = await setupEvents({
    catalog: [sampleEvent, { ...sampleEvent, cuid: 'evt_2', name: 'Fall Social', month: 10, day: 1 }],
  });
  try {
    expect(page.catalog().length).toBe(2);
    expect(root.querySelectorAll('.gssc-events-catalog__entry').length).toBe(2);
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-339, scope=range_end, role=Test)

// @relation(GSSC-MLLR-340, scope=range_start, role=Test)
test('GSSC-MLLR-340 Event Creation Persist', async () => {
  const { root, fixture, page, created, restore } = await setupEvents({ catalog: [] });
  try {
    page.startCreate();
    await fillRequiredFields(fixture, page);
    await markDirty(fixture, root);
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(created.length).toBe(1);
    expect(created[0].body).toMatchObject({
      name: 'Autumn Fair',
      month: 10,
      day: 5,
      year: 2026,
      time: '14:00',
      duration: '3h',
      location: 'Lawn',
      isPublic: true,
    });
    expect(page.statusMessage()).toContain('created');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-340, scope=range_end, role=Test)

// @relation(GSSC-MLLR-341, scope=range_start, role=Test)
test('GSSC-MLLR-341 Event Publication Choice', async () => {
  const { root, fixture, page, created, restore } = await setupEvents({ catalog: [] });
  try {
    page.startCreate();
    await fillRequiredFields(fixture, page);
    page.visibility.set('members');
    fixture.detectChanges();
    await markDirty(fixture, root);
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(created[0].body).toMatchObject({ isPublic: false });
    const selectLabel = textContent(root, '.gssc-form-select-field__label');
    expect(selectLabel).toContain('Visibility');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-341, scope=range_end, role=Test)

// @relation(GSSC-MLLR-342, scope=range_start, role=Test)
test('GSSC-MLLR-342 Event Modification Persist', async () => {
  const { root, fixture, page, updated, restore } = await setupEvents();
  try {
    root.querySelector<HTMLButtonElement>('.gssc-events-catalog__entry-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    page.name.set('Spring Meeting Updated');
    fixture.detectChanges();
    await markDirty(fixture, root);
    root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(updated.length).toBe(1);
    expect(updated[0].cuid).toBe('evt_1');
    expect(updated[0].body).toMatchObject({ name: 'Spring Meeting Updated' });
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-342, scope=range_end, role=Test)

// @relation(GSSC-MLLR-343, scope=range_start, role=Test)
test('GSSC-MLLR-343 Event Editor Cancel', async () => {
  const { root, fixture, page, created, restore } = await setupEvents();
  try {
    page.startCreate();
    page.name.set('Temporary');
    fixture.detectChanges();
    await markDirty(fixture, root);
    root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.name()).toBe('');
    expect(created.length).toBe(0);
    expect(page.statusMessage()).toContain('discarded');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-343, scope=range_end, role=Test)

// @relation(GSSC-MLLR-344, scope=range_start, role=Test)
test('GSSC-MLLR-344 Event Editor Permission', async () => {
  const denied = await setupEvents({
    viewer: { cuid: 'user_1', isUserMod: false, isAdmin: false },
  });
  try {
    expect(denied.page.canEdit()).toBe(false);
    expect(denied.root.querySelector('.gssc-editor')?.getAttribute('data-editing')).toBe('false');
    expect(denied.root.querySelector<HTMLButtonElement>('.gssc-events-new')?.disabled).toBe(true);
  } finally {
    denied.restore();
  }

  const allowed = await setupEvents({
    viewer: { cuid: 'admin_1', isAdmin: true },
  });
  try {
    expect(allowed.page.canEdit()).toBe(true);
    expect(allowed.root.querySelector('.gssc-editor')?.getAttribute('data-editing')).toBe('true');
  } finally {
    allowed.restore();
  }
});
// @relation(GSSC-MLLR-344, scope=range_end, role=Test)

// @relation(GSSC-MLLR-345, scope=range_start, role=Test)
test('GSSC-MLLR-345 Events Page Route', () => {
  const eventsRoute = routes.find((route) => route.path === 'events');
  expect(eventsRoute).toBeTruthy();
  expect(eventsRoute?.component).toBe(PageDataEditorPage);
  expect(eventsRoute?.data?.['kind']).toBe('events');
  expect(eventsRoute?.canActivate).toEqual(expect.arrayContaining([expect.any(Function)]));
});
// @relation(GSSC-MLLR-345, scope=range_end, role=Test)

// @relation(GSSC-MLLR-346, scope=range_start, role=Test)
test('GSSC-MLLR-346 Event Exclusive Resource Identity', async () => {
  const { root, fixture, page, restore } = await setupEvents();
  try {
    expect(page.editorResourceId()).toBe('event:new');
    expect(root.querySelector('.gssc-editor')?.getAttribute('data-resource-id')).toBe('event:new');

    root.querySelector<HTMLButtonElement>('.gssc-events-catalog__entry-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.editorResourceId()).toBe('event:evt_1');
    expect(root.querySelector('.gssc-editor')?.getAttribute('data-resource-id')).toBe('event:evt_1');
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-346, scope=range_end, role=Test)

// @relation(GSSC-MLLR-687, GSSC-MLLR-690, scope=range_start, role=Test)
test('GSSC-MLLR-687/690 Events intro and idle disclaimer', async () => {
  const { root, page, restore } = await setupEvents({ catalog: [] });
  try {
    expect(root.querySelector('.gssc-events-page__lead')?.textContent).toContain('Browse events');
    expect(page.statusMessage()).toBe('Select an event or create a new one.');
    const title = root.querySelector('.gssc-events-page__title')!;
    expect(title.className).toContain('text-[1.75em]');
    expect(title.className).toContain('font-semibold');
    expect(root.querySelector('[data-slot="events-status"]')?.className).toContain(
      'text-gssc-dark-brown',
    );
  } finally {
    restore();
  }
});
// @relation(GSSC-MLLR-687, GSSC-MLLR-690, scope=range_end, role=Test)
