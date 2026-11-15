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
  referenceLink: string;
  description: string;
};

const emptyDraft = (): PublicationDraft => ({
  cuid: null,
  title: '',
  referenceLink: '',
  description: '',
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
  readonly referenceLink = signal('');
  readonly description = signal('');
  readonly selectedCuid = signal<string | null>(null);
  readonly isCreating = signal(false);

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
    this.applyDraft({
      cuid: entry.cuid,
      title: entry.title,
      referenceLink: entry.referenceLink,
      description: entry.description ?? '',
    });
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-384, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-387, scope=range_start, role=Implementation)
  startCreate(): void {
    if (!this.permitted()) return;
    this.isCreating.set(true);
    this.selectedCuid.set(null);
    this.applyDraft(emptyDraft());
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-387, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-395, GSSC-MLLR-397, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.permitted()) return;
    const title = this.title().trim();
    const referenceLink = this.referenceLink().trim();
    const descriptionRaw = this.description().trim();
    const description = descriptionRaw.length > 0 ? descriptionRaw : null;
    if (!title || !referenceLink) {
      this.statusMessage.set('Title and reference link are required.');
      return;
    }

    try {
      if (this.isCreating() || this.selectedCuid() === null) {
        const { data, error } = await publicationsApi.create({
          title,
          referenceLink,
          description,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        const created = data as PublicationEntry;
        this.isCreating.set(false);
        this.selectedCuid.set(created.cuid);
        this.applyDraft({
          cuid: created.cuid,
          title: created.title,
          referenceLink: created.referenceLink,
          description: created.description ?? '',
        });
        this.statusMessage.set('Created.');
      } else {
        const cuid = this.selectedCuid()!;
        const { data, error } = await publicationsApi.update(cuid, {
          title,
          referenceLink,
          description,
        });
        if (error || !data) {
          this.statusMessage.set('Save failed.');
          return;
        }
        const updated = data as PublicationEntry;
        this.applyDraft({
          cuid: updated.cuid,
          title: updated.title,
          referenceLink: updated.referenceLink,
          description: updated.description ?? '',
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
    this.referenceLink.set(draft.referenceLink);
    this.description.set(draft.description);
    this.selectedCuid.set(draft.cuid);
  }
}
