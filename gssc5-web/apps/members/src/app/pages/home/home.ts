import {
  Component,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import {
  SECTION_BACKEND_GET,
  SectionFromCuid,
} from '../../modules/section-from-cuid/section-from-cuid';
import { backend } from '../../services/backend';
import { MemberSession } from '../../services/member-session';
import { filterSectionsVisibleOn } from '../../services/section-display-window/section-display-window';

/** Backend tag that binds member dashboard sections to this page. */
export const DASHBOARD_SECTIONS_TAG = 'dashboard';

/** One section list entry from Unified Backend GET /sections. */
export type DashboardSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
};

export type DashboardSectionListByTag = (
  tag: string,
) => Promise<DashboardSectionListEntry[]>;

export type DashboardSectionPatch = (
  cuid: string,
  body: {
    header: string | null;
    body: string;
    imagePosition: 'none' | 'left' | 'right' | null;
  },
) => Promise<boolean>;

/** Default Unified Backend section list filtered by tag. */
export const DASHBOARD_SECTION_LIST_BY_TAG =
  new InjectionToken<DashboardSectionListByTag>(
    'DASHBOARD_SECTION_LIST_BY_TAG',
    {
      providedIn: 'root',
      factory: () => defaultDashboardSectionListByTag,
    },
  );

/** Default Unified Backend section PATCH used by dashboard modification. */
export const DASHBOARD_SECTION_PATCH = new InjectionToken<DashboardSectionPatch>(
  'DASHBOARD_SECTION_PATCH',
  {
    providedIn: 'root',
    factory: () => defaultDashboardSectionPatch,
  },
);

async function defaultDashboardSectionListByTag(
  tag: string,
): Promise<DashboardSectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return filterSectionsVisibleOn(result.data as DashboardSectionListEntry[]);
  } catch {
    return [];
  }
}

async function defaultDashboardSectionPatch(
  cuid: string,
  body: {
    header: string | null;
    body: string;
    imagePosition: 'none' | 'left' | 'right' | null;
  },
): Promise<boolean> {
  try {
    const result = await backend.sections({ cuid }).patch(body as never);
    return !result.error;
  } catch {
    return false;
  }
}

type DashboardSectionView = {
  cuid: string;
  viewKey: string;
};

function parseImagePosition(
  value: string | null | undefined,
): 'none' | 'left' | 'right' | null {
  if (value === 'none' || value === 'left' || value === 'right') return value;
  return null;
}

/**
 * Per-section Generic Editor host for dashboard modification (GSSC5-89).
 */
// @relation(GSSC-MLLR-237, GSSC-MLLR-238, GSSC-MLLR-239, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-dashboard-section-editor',
  imports: [Editor, FormTextField, FormSelectField],
  template: `
    <gssc-editor
      [resourceId]="cuid()"
      [permitted]="true"
      title="Edit section"
      (saved)="onSaved()"
      (cancelled)="onCancelled()"
    >
      <gssc-form-text-field label="Header" [(value)]="header" />
      <gssc-form-text-field label="Body" [(value)]="body" />
      <gssc-form-select-field
        label="Image Position"
        [options]="imagePositionOptions"
        [(value)]="imagePosition"
      />
    </gssc-editor>
  `,
})
export class DashboardSectionEditor {
  private readonly sectionGet = inject(SECTION_BACKEND_GET);
  private readonly sectionPatch = inject(DASHBOARD_SECTION_PATCH);

  readonly cuid = input.required<string>();
  readonly saved = output<void>();
  readonly failed = output<void>();
  readonly cancelled = output<void>();

  readonly header = signal('');
  readonly body = signal('');
  readonly imagePosition = signal('none');

  readonly imagePositionOptions = [
    { value: 'none', label: 'None' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];

  private baseline = { header: '', body: '', imagePosition: 'none' };
  private loadGeneration = 0;

  constructor() {
    effect(() => {
      const cuid = this.cuid();
      void this.loadDraft(cuid);
    });
  }

  protected async onSaved(): Promise<void> {
    const cuid = this.cuid();
    const ok = await this.sectionPatch(cuid, {
      header: this.header().length > 0 ? this.header() : null,
      body: this.body().length > 0 ? this.body() : ' ',
      imagePosition: parseImagePosition(this.imagePosition()),
    });
    if (!ok) {
      this.failed.emit();
      return;
    }
    this.baseline = {
      header: this.header(),
      body: this.body(),
      imagePosition: this.imagePosition(),
    };
    this.saved.emit();
  }

  protected onCancelled(): void {
    this.header.set(this.baseline.header);
    this.body.set(this.baseline.body);
    this.imagePosition.set(this.baseline.imagePosition);
    this.cancelled.emit();
  }

  private async loadDraft(cuid: string): Promise<void> {
    const generation = ++this.loadGeneration;
    const data = await this.sectionGet(cuid);
    if (generation !== this.loadGeneration || data === null) return;
    const header = data.header ?? '';
    const body = data.body;
    const imagePosition = parseImagePosition(data.imagePosition) ?? 'none';
    this.header.set(header);
    this.body.set(body);
    this.imagePosition.set(imagePosition);
    this.baseline = { header, body, imagePosition };
  }
}
// @relation(GSSC-MLLR-237, GSSC-MLLR-238, GSSC-MLLR-239, scope=range_end, role=Implementation)

/**
 * Member Dashboard Page (GSSC5-89): dashboard-tagged backend sections via
 * Section From CUID, with Generic Editor modification for permitted members.
 */
// @relation(GSSC-MLLR-231, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-home-page',
  imports: [SectionFromCuid, DashboardSectionEditor],
  templateUrl: './home.html',
})
export class HomePage {
  private readonly listByTag = inject(DASHBOARD_SECTION_LIST_BY_TAG);
  private readonly memberSession = inject(MemberSession);
  private loadGeneration = 0;

  /** Dashboard section views in Unified Backend section order. */
  readonly sectionViews = signal<DashboardSectionView[]>([]);

  readonly saveStatus = signal('');

  /**
   * User moderators (administrators included) hold typical section modify
   * authority; Unified Backend still enforces each section's modify permission.
   */
  // @relation(GSSC-MLLR-237, GSSC-MLLR-238, scope=range_start, role=Implementation)
  readonly canModify = computed(() => this.memberSession.isUserMod());
  // @relation(GSSC-MLLR-237, GSSC-MLLR-238, scope=range_end, role=Implementation)

  constructor() {
    void this.load();
  }

  protected onSectionSaved(cuid: string): void {
    this.saveStatus.set('Saved');
    this.bumpViewKey(cuid);
  }

  protected onSectionSaveFailed(): void {
    this.saveStatus.set('Save failed');
  }

  protected onSectionCancelled(): void {
    this.saveStatus.set('Discarded');
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-MLLR-234, GSSC-MLLR-235, scope=range_start, role=Implementation)
    const sections = await this.listByTag(DASHBOARD_SECTIONS_TAG);
    if (generation !== this.loadGeneration) return;
    // Backend GET /sections already returns index order; do not invent FE ordering.
    this.sectionViews.set(
      sections.map((entry) => ({
        cuid: entry.cuid,
        viewKey: `${entry.cuid}:0`,
      })),
    );
    // @relation(GSSC-MLLR-234, GSSC-MLLR-235, scope=range_end, role=Implementation)
  }

  private bumpViewKey(cuid: string): void {
    this.sectionViews.set(
      this.sectionViews().map((view) => {
        if (view.cuid !== cuid) return view;
        const generation = Number(view.viewKey.split(':')[1] ?? '0') + 1;
        return { cuid, viewKey: `${cuid}:${generation}` };
      }),
    );
  }
}
// @relation(GSSC-MLLR-231, scope=range_end, role=Implementation)
