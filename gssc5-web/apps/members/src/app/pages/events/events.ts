import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import {
  EventCreateBody,
  EventRecord,
  eventsApi,
} from '../../services/events-api';
import { MemberSession } from '../../services/member-session';

export type EventForm = {
  name: string;
  month: string;
  day: string;
  year: string;
  announcementStartMonth: string;
  announcementStartDay: string;
  announcementStartYear: string;
  time: string;
  duration: string;
  location: string;
  header: string;
  body: string;
  visibility: string;
};

const CREATE_RESOURCE = 'event:new';

const emptyForm = (): EventForm => ({
  name: '',
  month: '',
  day: '',
  year: '',
  announcementStartMonth: '',
  announcementStartDay: '',
  announcementStartYear: '',
  time: '',
  duration: '',
  location: '',
  header: '',
  body: '',
  visibility: 'public',
});

function formFromRecord(event: EventRecord): EventForm {
  return {
    name: event.name,
    month: String(event.month),
    day: String(event.day),
    year: String(event.year),
    announcementStartMonth: String(event.announcementStartMonth),
    announcementStartDay: String(event.announcementStartDay),
    announcementStartYear: String(event.announcementStartYear),
    time: event.time,
    duration: event.duration,
    location: event.location,
    header: event.header ?? event.name,
    body: event.body ?? '',
    visibility: event.isPublic ? 'public' : 'members',
  };
}

function parseIntField(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  if (label === 'month' && (n < 1 || n > 12)) return null;
  if (label === 'day' && (n < 1 || n > 31)) return null;
  if (label === 'year' && (n < 1 || n > 9999)) return null;
  return n;
}

function toCreateBody(form: EventForm): EventCreateBody | { error: string } {
  const month = parseIntField(form.month, 'month');
  const day = parseIntField(form.day, 'day');
  const year = parseIntField(form.year, 'year');
  const announcementStartMonth = parseIntField(form.announcementStartMonth, 'month');
  const announcementStartDay = parseIntField(form.announcementStartDay, 'day');
  const announcementStartYear = parseIntField(form.announcementStartYear, 'year');
  if (
    month == null ||
    day == null ||
    year == null ||
    announcementStartMonth == null ||
    announcementStartDay == null ||
    announcementStartYear == null
  ) {
    return { error: 'Enter valid month, day, and year values.' };
  }
  const name = form.name.trim();
  const time = form.time.trim();
  const duration = form.duration.trim();
  const location = form.location.trim();
  if (!name || !time || !duration || !location) {
    return { error: 'Name, time, duration, and location are required.' };
  }
  return {
    name,
    month,
    day,
    year,
    announcementStartMonth,
    announcementStartDay,
    announcementStartYear,
    time,
    duration,
    location,
    isPublic: form.visibility === 'public',
    header: form.header.trim() || name,
    body: form.body,
    resources: [],
  };
}

function formatEventDate(event: EventRecord): string {
  return `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
}

export type EventsTimeFilter = 'past' | 'future' | 'all';

function eventDateValue(event: EventRecord): number {
  return event.year * 10_000 + event.month * 100 + event.day;
}

function todayDateValue(now = new Date()): number {
  return now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function matchesTimeFilter(event: EventRecord, filter: EventsTimeFilter, today = todayDateValue()): boolean {
  if (filter === 'all') return true;
  const value = eventDateValue(event);
  if (filter === 'future') return value >= today;
  return value < today;
}

@Component({
  selector: 'gssc-events-page',
  imports: [Editor, FormTextField, FormSelectField],
  templateUrl: './events.html',
})
export class EventsPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly catalog = signal<EventRecord[]>([]);
  readonly loadError = signal('');
  readonly statusMessage = signal('Select an event or create a new one.');
  readonly mode = signal<'create' | 'edit'>('create');
  readonly editingCuid = signal<string | null>(null);
  // @relation(GSSC-MLLR-753, scope=range_start, role=Implementation)
  readonly timeFilter = signal<EventsTimeFilter>('future');
  // @relation(GSSC-MLLR-753, scope=range_end, role=Implementation)

  readonly timeFilterOptions: ReadonlyArray<{ value: EventsTimeFilter; label: string }> = [
    { value: 'past', label: 'Past' },
    { value: 'future', label: 'Future' },
    { value: 'all', label: 'All' },
  ];

  readonly name = signal('');
  readonly month = signal('');
  readonly day = signal('');
  readonly year = signal('');
  readonly announcementStartMonth = signal('');
  readonly announcementStartDay = signal('');
  readonly announcementStartYear = signal('');
  readonly time = signal('');
  readonly duration = signal('');
  readonly location = signal('');
  readonly header = signal('');
  readonly body = signal('');
  readonly visibility = signal('public');

  readonly visibilityOptions = [
    { value: 'public', label: 'Public Frontend' },
    { value: 'members', label: 'Members Only' },
  ];

  private baseline = emptyForm();

  // @relation(GSSC-MLLR-344, scope=range_start, role=Implementation)
  /** User moderators (and administrators via session gate) may create/modify. */
  readonly canEdit = computed(() => this.memberSession.isUserMod());
  // @relation(GSSC-MLLR-344, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-762, scope=range_start, role=Implementation)
  readonly canCopy = computed(
    () => this.canEdit() && this.mode() === 'edit' && this.editingCuid() != null,
  );
  // @relation(GSSC-MLLR-762, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-753, GSSC-MLLR-756, scope=range_start, role=Implementation)
  readonly filteredCatalog = computed(() => {
    const filter = this.timeFilter();
    const today = todayDateValue();
    return this.catalog().filter((event) => matchesTimeFilter(event, filter, today));
  });
  // @relation(GSSC-MLLR-753, GSSC-MLLR-756, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-346, scope=range_start, role=Implementation)
  readonly editorResourceId = computed(() => {
    const cuid = this.editingCuid();
    return this.mode() === 'edit' && cuid ? `event:${cuid}` : CREATE_RESOURCE;
  });
  // @relation(GSSC-MLLR-346, scope=range_end, role=Implementation)

  readonly editorTitle = computed(() =>
    this.mode() === 'edit' ? 'Modify Event' : 'Create Event',
  );

  ngOnInit(): void {
    void this.loadCatalog();
    this.startCreate({ announce: false });
  }

  // @relation(GSSC-MLLR-339, scope=range_start, role=Implementation)
  async loadCatalog(): Promise<void> {
    this.loadError.set('');
    const { data, error } = await eventsApi.list();
    if (error || !Array.isArray(data)) {
      this.loadError.set('Unable to load events.');
      this.catalog.set([]);
      return;
    }
    this.catalog.set(data as EventRecord[]);
  }
  // @relation(GSSC-MLLR-339, scope=range_end, role=Implementation)

  startCreate(options?: { announce?: boolean }): void {
    this.mode.set('create');
    this.editingCuid.set(null);
    this.applyForm(emptyForm());
    this.statusMessage.set(
      options?.announce === false
        ? 'Select an event or create a new one.'
        : 'Creating a new event.',
    );
  }

  selectEvent(event: EventRecord): void {
    this.mode.set('edit');
    this.editingCuid.set(event.cuid);
    this.applyForm(formFromRecord(event));
    this.statusMessage.set('Editing event.');
  }

  onTimeFilterChange(next: string): void {
    if (next === 'past' || next === 'future' || next === 'all') {
      this.timeFilter.set(next);
    }
  }

  catalogLabel(event: EventRecord): string {
    return `${event.name} · ${formatEventDate(event)}`;
  }

  // @relation(GSSC-MLLR-761, GSSC-MLLR-764, scope=range_start, role=Implementation)
  copyToNew(): void {
    if (!this.canCopy()) return;
    const cuid = this.editingCuid();
    if (cuid == null) return;
    const source = this.catalog().find((event) => event.cuid === cuid);
    const form = source != null ? formFromRecord(source) : this.currentForm();
    this.mode.set('create');
    this.editingCuid.set(null);
    this.applyForm(form);
    this.statusMessage.set('Copied — edit and save to create a new event.');
  }
  // @relation(GSSC-MLLR-761, GSSC-MLLR-764, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-749, GSSC-MLLR-752, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.canEdit() || this.mode() !== 'edit') return;
    const cuid = this.editingCuid();
    if (!cuid) return;

    const { error } = await eventsApi.remove(cuid);
    if (error) {
      this.statusMessage.set('Unable to delete event.');
      return;
    }

    await this.loadCatalog();
    this.startCreate({ announce: false });
    this.statusMessage.set('Event deleted.');
  }
  // @relation(GSSC-MLLR-749, GSSC-MLLR-752, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-340, GSSC-MLLR-342, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.canEdit()) return;
    const body = toCreateBody(this.currentForm());
    if ('error' in body) {
      this.statusMessage.set(body.error);
      return;
    }

    if (this.mode() === 'create') {
      const { data, error } = await eventsApi.create(body);
      if (error || !data) {
        this.statusMessage.set('Unable to create event.');
        return;
      }
      const created = data as EventRecord;
      this.baseline = formFromRecord(created);
      this.applyForm(this.baseline);
      this.mode.set('edit');
      this.editingCuid.set(created.cuid);
      this.statusMessage.set('Event created.');
      await this.loadCatalog();
      return;
    }

    const cuid = this.editingCuid();
    if (!cuid) {
      this.statusMessage.set('No event selected.');
      return;
    }
    const { data, error } = await eventsApi.update(cuid, body);
    if (error || !data) {
      this.statusMessage.set('Unable to update event.');
      return;
    }
    const updated = data as EventRecord;
    this.baseline = formFromRecord(updated);
    this.applyForm(this.baseline);
    this.statusMessage.set('Event saved.');
    await this.loadCatalog();
  }
  // @relation(GSSC-MLLR-340, GSSC-MLLR-342, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-343, scope=range_start, role=Implementation)
  onCancelled(): void {
    this.applyForm(this.baseline);
    this.statusMessage.set('Changes discarded.');
  }
  // @relation(GSSC-MLLR-343, scope=range_end, role=Implementation)

  private currentForm(): EventForm {
    return {
      name: this.name(),
      month: this.month(),
      day: this.day(),
      year: this.year(),
      announcementStartMonth: this.announcementStartMonth(),
      announcementStartDay: this.announcementStartDay(),
      announcementStartYear: this.announcementStartYear(),
      time: this.time(),
      duration: this.duration(),
      location: this.location(),
      header: this.header(),
      body: this.body(),
      visibility: this.visibility(),
    };
  }

  private applyForm(form: EventForm): void {
    this.baseline = { ...form };
    this.name.set(form.name);
    this.month.set(form.month);
    this.day.set(form.day);
    this.year.set(form.year);
    this.announcementStartMonth.set(form.announcementStartMonth);
    this.announcementStartDay.set(form.announcementStartDay);
    this.announcementStartYear.set(form.announcementStartYear);
    this.time.set(form.time);
    this.duration.set(form.duration);
    this.location.set(form.location);
    this.header.set(form.header);
    this.body.set(form.body);
    this.visibility.set(form.visibility);
  }
}
