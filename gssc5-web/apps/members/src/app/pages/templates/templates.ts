import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import {
  FormSelectField,
  FormSelectOption,
} from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import {
  ContentTemplateDetail,
  ContentTemplateListEntry,
  templatesApi,
} from '../../services/templates-api';

type TemplateDraft = {
  cuid: string | null;
  name: string;
  isPublic: boolean;
  tagsText: string;
  createPerm: string;
  modifyPerm: string;
  deletePerm: string;
};

const emptyDraft = (): TemplateDraft => ({
  cuid: null,
  name: '',
  isPublic: false,
  tagsText: '',
  createPerm: '0',
  modifyPerm: '0',
  deletePerm: '0',
});

const VISIBILITY_OPTIONS: readonly FormSelectOption[] = [
  { value: 'false', label: 'Members only' },
  { value: 'true', label: 'Public site' },
];

function parseNonNegInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function detailToDraft(detail: ContentTemplateDetail): TemplateDraft {
  return {
    cuid: detail.cuid,
    name: detail.name,
    isPublic: detail.isPublic,
    tagsText: detail.tags.join(', '),
    createPerm: String(detail.createPerm),
    modifyPerm: String(detail.modifyPerm),
    deletePerm: String(detail.deletePerm),
  };
}

@Component({
  selector: 'gssc-templates-page',
  imports: [Editor, FormTextField, FormSelectField],
  templateUrl: './templates.html',
})
export class TemplatesPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly visibilityOptions = VISIBILITY_OPTIONS;

  readonly entries = signal<ContentTemplateListEntry[]>([]);
  readonly loadError = signal('');
  readonly statusMessage = signal('');
  readonly name = signal('');
  readonly visibility = signal('false');
  readonly tagsText = signal('');
  readonly createPerm = signal('0');
  readonly modifyPerm = signal('0');
  readonly deletePerm = signal('0');
  readonly selectedCuid = signal<string | null>(null);
  readonly isCreating = signal(false);

  // @relation(GSSC-MLLR-553, scope=range_start, role=Implementation)
  readonly permitted = computed(() => this.memberSession.isAdmin());
  // @relation(GSSC-MLLR-553, scope=range_end, role=Implementation)

  readonly editorOpen = computed(
    () => this.isCreating() || this.selectedCuid() !== null,
  );

  readonly resourceId = computed(() =>
    this.isCreating()
      ? 'template:new'
      : `template:${this.selectedCuid() ?? 'none'}`,
  );

  readonly editorTitle = computed(() =>
    this.isCreating() ? 'New content template' : 'Edit content template',
  );

  /** Name and tags are create-time only on the Unified Backend. */
  readonly identityEditable = computed(
    () => this.permitted() && this.isCreating(),
  );

  private baseline = emptyDraft();

  ngOnInit(): void {
    void this.refreshList();
  }

  // @relation(GSSC-MLLR-554, GSSC-MLLR-557, scope=range_start, role=Implementation)
  async refreshList(): Promise<void> {
    this.loadError.set('');
    try {
      const { data, error } = await templatesApi.list();
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set('Content templates catalog unavailable.');
        return;
      }
      this.entries.set(data as ContentTemplateListEntry[]);
    } catch {
      this.entries.set([]);
      this.loadError.set('Content templates catalog unavailable.');
    }
  }
  // @relation(GSSC-MLLR-554, GSSC-MLLR-557, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-544, scope=range_start, role=Implementation)
  async selectEntry(entry: ContentTemplateListEntry): Promise<void> {
    this.isCreating.set(false);
    this.selectedCuid.set(entry.cuid);
    this.statusMessage.set('');

    if (this.permitted()) {
      try {
        const { data, error } = await templatesApi.get(entry.cuid);
        if (error || !data) {
          this.applyDraft({
            ...emptyDraft(),
            cuid: entry.cuid,
            name: entry.name,
          });
          this.statusMessage.set('Template detail unavailable.');
          return;
        }
        this.applyDraft(detailToDraft(data as ContentTemplateDetail));
        return;
      } catch {
        this.applyDraft({
          ...emptyDraft(),
          cuid: entry.cuid,
          name: entry.name,
        });
        this.statusMessage.set('Template detail unavailable.');
        return;
      }
    }

    this.applyDraft({
      ...emptyDraft(),
      cuid: entry.cuid,
      name: entry.name,
    });
  }
  // @relation(GSSC-MLLR-544, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-547, scope=range_start, role=Implementation)
  startCreate(): void {
    if (!this.permitted()) return;
    this.isCreating.set(true);
    this.selectedCuid.set(null);
    this.applyDraft(emptyDraft());
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-547, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-555, GSSC-MLLR-557, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.permitted()) return;

    const name = this.name().trim();
    const isPublic = this.visibility() === 'true';
    const tags = parseTags(this.tagsText());
    const createPerm = parseNonNegInt(this.createPerm());
    const modifyPerm = parseNonNegInt(this.modifyPerm());
    const deletePerm = parseNonNegInt(this.deletePerm());

    if (createPerm === null || modifyPerm === null || deletePerm === null) {
      this.statusMessage.set('Permission values must be non-negative integers.');
      return;
    }

    try {
      if (this.isCreating() || this.selectedCuid() === null) {
        if (!name) {
          this.statusMessage.set('Name is required.');
          return;
        }
        const { data, error } = await templatesApi.create({
          name,
          isPublic,
          tags,
          createPerm,
          modifyPerm,
          deletePerm,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        const created = data as ContentTemplateDetail;
        this.isCreating.set(false);
        this.selectedCuid.set(created.cuid);
        this.applyDraft(detailToDraft(created));
        this.statusMessage.set('Created.');
      } else {
        const cuid = this.selectedCuid()!;
        const { data, error } = await templatesApi.update(cuid, {
          isPublic,
          createPerm,
          modifyPerm,
          deletePerm,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        this.applyDraft(detailToDraft(data as ContentTemplateDetail));
        this.statusMessage.set('Saved.');
      }
      await this.refreshList();
    } catch {
      this.statusMessage.set('Save failed.');
    }
  }
  // @relation(GSSC-MLLR-555, GSSC-MLLR-557, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-556, scope=range_start, role=Implementation)
  onCancelled(): void {
    this.applyDraft({ ...this.baseline });
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-556, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-550, GSSC-MLLR-557, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.permitted()) return;
    const cuid = this.selectedCuid();
    if (!cuid || this.isCreating()) return;
    try {
      const { error } = await templatesApi.remove(cuid);
      if (error) {
        this.statusMessage.set('Delete failed.');
        return;
      }
      this.selectedCuid.set(null);
      this.isCreating.set(false);
      this.applyDraft(emptyDraft());
      this.statusMessage.set('Deleted.');
      await this.refreshList();
    } catch {
      this.statusMessage.set('Delete failed.');
    }
  }
  // @relation(GSSC-MLLR-550, GSSC-MLLR-557, scope=range_end, role=Implementation)

  private applyDraft(draft: TemplateDraft): void {
    this.baseline = { ...draft };
    this.name.set(draft.name);
    this.visibility.set(draft.isPublic ? 'true' : 'false');
    this.tagsText.set(draft.tagsText);
    this.createPerm.set(draft.createPerm);
    this.modifyPerm.set(draft.modifyPerm);
    this.deletePerm.set(draft.deletePerm);
    this.selectedCuid.set(draft.cuid);
  }
}
