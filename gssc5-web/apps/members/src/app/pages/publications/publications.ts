import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import {
  PublicationEntry,
  publicationsApi,
} from '../../services/publications-api';

type PublicationDraft = {
  cuid: string | null;
  title: string;
  description: string;
  fileLabel: string;
};

const emptyDraft = (): PublicationDraft => ({
  cuid: null,
  title: '',
  description: '',
  fileLabel: 'No file chosen',
});

@Component({
  selector: 'gssc-publications-page',
  imports: [Editor, FormTextField],
  templateUrl: './publications.html',
})
export class PublicationsPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly entries = signal<PublicationEntry[]>([]);
  readonly loadError = signal('');
  readonly statusMessage = signal('');
  readonly title = signal('');
  readonly description = signal('');
  readonly selectedCuid = signal<string | null>(null);
  readonly isCreating = signal(false);
  readonly fileLabel = signal('No file chosen');
  private pendingFile: File | null = null;
  private hadExistingFile = false;

  // @relation(GSSC-MLLR-393, scope=range_start, role=Implementation)
  readonly permitted = computed(
    () =>
      this.memberSession.isAdmin() || this.memberSession.isPublicationEditor(),
  );
  // @relation(GSSC-MLLR-393, scope=range_end, role=Implementation)

  readonly editorOpen = computed(
    () => this.isCreating() || this.selectedCuid() !== null,
  );

  readonly resourceId = computed(() =>
    this.isCreating()
      ? 'publication:new'
      : `publication:${this.selectedCuid() ?? 'none'}`,
  );

  readonly editorTitle = computed(() =>
    this.isCreating() ? 'New publication' : 'Edit publication',
  );

  private baseline = emptyDraft();

  ngOnInit(): void {
    void this.refreshList();
  }

  // @relation(GSSC-MLLR-394, GSSC-MLLR-397, scope=range_start, role=Implementation)
  async refreshList(): Promise<void> {
    this.loadError.set('');
    try {
      const { data, error } = await publicationsApi.list();
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set('Publications catalog unavailable.');
        return;
      }
      this.entries.set(data as PublicationEntry[]);
    } catch {
      this.entries.set([]);
      this.loadError.set('Publications catalog unavailable.');
    }
  }
  // @relation(GSSC-MLLR-394, GSSC-MLLR-397, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-384, scope=range_start, role=Implementation)
  selectEntry(entry: PublicationEntry): void {
    this.isCreating.set(false);
    this.selectedCuid.set(entry.cuid);
    this.pendingFile = null;
    this.hadExistingFile = entry.referenceLink.trim().length > 0;
    this.applyDraft({
      cuid: entry.cuid,
      title: entry.title,
      description: entry.description ?? '',
      fileLabel: this.hadExistingFile ? 'Current file on file' : 'No file chosen',
    });
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-384, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-387, scope=range_start, role=Implementation)
  startCreate(): void {
    if (!this.permitted()) return;
    this.isCreating.set(true);
    this.selectedCuid.set(null);
    this.pendingFile = null;
    this.hadExistingFile = false;
    this.applyDraft(emptyDraft());
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-387, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-700, scope=range_start, role=Implementation)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.pendingFile = file;
    this.fileLabel.set(file?.name ?? 'No file chosen');
  }
  // @relation(GSSC-MLLR-700, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-395, GSSC-MLLR-397, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.permitted()) return;
    const title = this.title().trim();
    const descriptionRaw = this.description().trim();
    const description = descriptionRaw.length > 0 ? descriptionRaw : null;
    if (!title) {
      this.statusMessage.set('Title is required.');
      return;
    }
    if (this.isCreating() && this.pendingFile === null) {
      this.statusMessage.set('A publication file is required.');
      return;
    }

    try {
      if (this.isCreating() || this.selectedCuid() === null) {
        const { data, error } = await publicationsApi.create({
          title,
          description,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        const created = data as PublicationEntry;
        const uploaded = await publicationsApi.uploadFile(
          created.cuid,
          this.pendingFile!,
        );
        if (uploaded.error || !uploaded.data) {
          await publicationsApi.remove(created.cuid);
          this.statusMessage.set('File upload failed.');
          return;
        }
        this.pendingFile = null;
        this.hadExistingFile = true;
        this.isCreating.set(false);
        this.selectedCuid.set(created.cuid);
        this.applyDraft({
          cuid: created.cuid,
          title: created.title,
          description: created.description ?? '',
          fileLabel: 'Current file on file',
        });
        this.statusMessage.set('Created.');
      } else {
        const cuid = this.selectedCuid()!;
        const { data, error } = await publicationsApi.update(cuid, {
          title,
          description,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        if (this.pendingFile !== null) {
          const uploaded = await publicationsApi.uploadFile(cuid, this.pendingFile);
          if (uploaded.error || !uploaded.data) {
            this.statusMessage.set('File upload failed.');
            return;
          }
          this.pendingFile = null;
          this.hadExistingFile = true;
        }
        const updated = data as PublicationEntry;
        this.applyDraft({
          cuid: updated.cuid,
          title: updated.title,
          description: updated.description ?? '',
          fileLabel: this.hadExistingFile ? 'Current file on file' : 'No file chosen',
        });
        this.statusMessage.set('Saved.');
      }
      await this.refreshList();
    } catch {
      this.statusMessage.set('Save failed.');
    }
  }
  // @relation(GSSC-MLLR-395, GSSC-MLLR-397, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-396, scope=range_start, role=Implementation)
  onCancelled(): void {
    this.pendingFile = null;
    this.applyDraft({ ...this.baseline });
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-396, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-390, GSSC-MLLR-397, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.permitted()) return;
    const cuid = this.selectedCuid();
    if (!cuid || this.isCreating()) return;
    try {
      const { error } = await publicationsApi.remove(cuid);
      if (error) {
        this.statusMessage.set('Delete failed.');
        return;
      }
      this.selectedCuid.set(null);
      this.isCreating.set(false);
      this.pendingFile = null;
      this.hadExistingFile = false;
      this.applyDraft(emptyDraft());
      this.statusMessage.set('Deleted.');
      await this.refreshList();
    } catch {
      this.statusMessage.set('Delete failed.');
    }
  }
  // @relation(GSSC-MLLR-390, GSSC-MLLR-397, scope=range_end, role=Implementation)

  private applyDraft(draft: PublicationDraft): void {
    this.baseline = { ...draft };
    this.title.set(draft.title);
    this.description.set(draft.description);
    this.fileLabel.set(draft.fileLabel);
    this.selectedCuid.set(draft.cuid);
  }
}
