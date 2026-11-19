import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import {
  ResearchToolEntry,
  researchToolsApi,
} from '../../services/research-tools-api';

type ResearchToolDraft = {
  cuid: string | null;
  title: string;
  referenceLink: string;
  hasFile: boolean;
};

const emptyDraft = (): ResearchToolDraft => ({
  cuid: null,
  title: '',
  referenceLink: '',
  hasFile: false,
});

@Component({
  selector: 'gssc-research-tools-page',
  imports: [Editor, FormTextField],
  templateUrl: './research-tools.html',
})
export class ResearchToolsPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly entries = signal<ResearchToolEntry[]>([]);
  readonly loadError = signal('');
  readonly statusMessage = signal('');
  readonly title = signal('');
  readonly referenceLink = signal('');
  readonly hasFile = signal(false);
  readonly selectedFileName = signal('');
  readonly selectedCuid = signal<string | null>(null);
  readonly isCreating = signal(false);

  private pendingFile: File | null = null;

  // @relation(GSSC-MLLR-410, scope=range_start, role=Implementation)
  readonly permitted = computed(
    () => this.memberSession.isAdmin() || this.memberSession.isToolEditor(),
  );
  // @relation(GSSC-MLLR-410, scope=range_end, role=Implementation)

  readonly editorOpen = computed(
    () => this.isCreating() || this.selectedCuid() !== null,
  );

  readonly resourceId = computed(() =>
    this.isCreating()
      ? 'research-tool:new'
      : `research-tool:${this.selectedCuid() ?? 'none'}`,
  );

  readonly editorTitle = computed(() =>
    this.isCreating() ? 'New research tool' : 'Edit research tool',
  );

  private baseline = emptyDraft();

  ngOnInit(): void {
    void this.refreshList();
  }

  // @relation(GSSC-MLLR-411, GSSC-MLLR-414, scope=range_start, role=Implementation)
  async refreshList(): Promise<void> {
    this.loadError.set('');
    try {
      const { data, error } = await researchToolsApi.list();
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set('Research tools catalog unavailable.');
        return;
      }
      this.entries.set(data as ResearchToolEntry[]);
    } catch {
      this.entries.set([]);
      this.loadError.set('Research tools catalog unavailable.');
    }
  }
  // @relation(GSSC-MLLR-411, GSSC-MLLR-414, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-401, scope=range_start, role=Implementation)
  selectEntry(entry: ResearchToolEntry): void {
    this.isCreating.set(false);
    this.selectedCuid.set(entry.cuid);
    this.applyDraft({
      cuid: entry.cuid,
      title: entry.title,
      referenceLink: entry.referenceLink,
      hasFile: entry.hasFile,
    });
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-401, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-404, scope=range_start, role=Implementation)
  startCreate(): void {
    if (!this.permitted()) return;
    this.isCreating.set(true);
    this.selectedCuid.set(null);
    this.applyDraft(emptyDraft());
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-404, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-697, GSSC-MLLR-698, GSSC-MLLR-699, scope=range_start, role=Implementation)
  onFileSelected(event: Event): void {
    if (!this.permitted()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingFile = file;
    this.selectedFileName.set(file?.name ?? '');
    if (file) {
      this.referenceLink.set('');
    }
  }
  // @relation(GSSC-MLLR-697, GSSC-MLLR-698, GSSC-MLLR-699, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-412, GSSC-MLLR-414, GSSC-MLLR-697, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.permitted()) return;
    const title = this.title().trim();
    const referenceLink = this.referenceLink().trim();
    const file = this.pendingFile;
    if (!title) {
      this.statusMessage.set('Title is required.');
      return;
    }
    if (!file && !referenceLink && !this.hasFile()) {
      this.statusMessage.set('Provide a reference link or choose a file.');
      return;
    }

    try {
      if (this.isCreating() || this.selectedCuid() === null) {
        const { data, error } = await researchToolsApi.create({
          title,
          referenceLink: file ? '' : referenceLink,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        let created = data as ResearchToolEntry;
        if (file) {
          const uploaded = await researchToolsApi.uploadFile(created.cuid, file);
          if (uploaded.error || !uploaded.data) {
            this.statusMessage.set('File upload failed.');
            return;
          }
          const refreshed = await researchToolsApi.get(created.cuid);
          if (!refreshed.error && refreshed.data) {
            created = refreshed.data as ResearchToolEntry;
          } else {
            created = { ...created, hasFile: true, referenceLink: '' };
          }
        }
        this.isCreating.set(false);
        this.selectedCuid.set(created.cuid);
        this.applyDraft({
          cuid: created.cuid,
          title: created.title,
          referenceLink: created.referenceLink,
          hasFile: created.hasFile,
        });
        this.statusMessage.set('Created.');
      } else {
        const cuid = this.selectedCuid()!;
        if (file) {
          const uploaded = await researchToolsApi.uploadFile(cuid, file);
          if (uploaded.error || !uploaded.data) {
            this.statusMessage.set('File upload failed.');
            return;
          }
        }
        const patch: { title: string; referenceLink?: string } = { title };
        if (!file && referenceLink) {
          patch.referenceLink = referenceLink;
        } else if (!file && !this.hasFile()) {
          patch.referenceLink = referenceLink;
        }
        const { data, error } = await researchToolsApi.update(cuid, patch);
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        const updated = data as ResearchToolEntry;
        this.applyDraft({
          cuid: updated.cuid,
          title: updated.title,
          referenceLink: updated.referenceLink,
          hasFile: updated.hasFile,
        });
        this.statusMessage.set('Saved.');
      }
      await this.refreshList();
    } catch {
      this.statusMessage.set('Save failed.');
    }
  }
  // @relation(GSSC-MLLR-412, GSSC-MLLR-414, GSSC-MLLR-697, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-413, scope=range_start, role=Implementation)
  onCancelled(): void {
    this.applyDraft({ ...this.baseline });
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-413, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-407, GSSC-MLLR-414, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.permitted()) return;
    const cuid = this.selectedCuid();
    if (!cuid || this.isCreating()) return;
    try {
      const { error } = await researchToolsApi.remove(cuid);
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
  // @relation(GSSC-MLLR-407, GSSC-MLLR-414, scope=range_end, role=Implementation)

  private applyDraft(draft: ResearchToolDraft): void {
    this.baseline = { ...draft };
    this.title.set(draft.title);
    this.referenceLink.set(draft.referenceLink);
    this.hasFile.set(draft.hasFile);
    this.selectedCuid.set(draft.cuid);
    this.pendingFile = null;
    this.selectedFileName.set('');
  }
}
