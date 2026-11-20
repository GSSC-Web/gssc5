import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import { KeyValueEntry, kvsApi } from '../../services/kvs-api';

type KvDraft = {
  key: string;
  value: string;
  /** When editing an existing entry, the catalog key (immutable on save). */
  existingKey: string | null;
};

const emptyDraft = (): KvDraft => ({
  key: '',
  value: '',
  existingKey: null,
});

@Component({
  selector: 'gssc-kvs-editor-page',
  imports: [Editor, FormTextField],
  templateUrl: './kvs-editor.html',
})
export class KvsEditorPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly entries = signal<KeyValueEntry[]>([]);
  readonly loadError = signal('');
  readonly statusMessage = signal('');
  readonly key = signal('');
  readonly value = signal('');
  readonly selectedKey = signal<string | null>(null);
  readonly isCreating = signal(false);

  // @relation(GSSC-MLLR-726, scope=range_start, role=Implementation)
  readonly permitted = computed(() => this.memberSession.isAdmin());
  // @relation(GSSC-MLLR-726, scope=range_end, role=Implementation)

  readonly editorOpen = computed(
    () => this.isCreating() || this.selectedKey() !== null,
  );

  readonly resourceId = computed(() =>
    this.isCreating()
      ? 'kvs:new'
      : `kvs:${this.selectedKey() ?? 'none'}`,
  );

  readonly editorTitle = computed(() =>
    this.isCreating() ? 'New key-value entry' : 'Edit key-value entry',
  );

  /** Key is create-time only; editing keeps the catalog key. */
  readonly keyEditable = computed(
    () => this.permitted() && this.isCreating(),
  );

  private baseline = emptyDraft();

  ngOnInit(): void {
    void this.refreshList();
  }

  // @relation(GSSC-MLLR-711, GSSC-MLLR-727, scope=range_start, role=Implementation)
  async refreshList(): Promise<void> {
    this.loadError.set('');
    try {
      const { data, error } = await kvsApi.list();
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set('Key-value store catalog unavailable.');
        return;
      }
      this.entries.set(data as KeyValueEntry[]);
    } catch {
      this.entries.set([]);
      this.loadError.set('Key-value store catalog unavailable.');
    }
  }
  // @relation(GSSC-MLLR-711, GSSC-MLLR-727, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-711, scope=range_start, role=Implementation)
  selectEntry(entry: KeyValueEntry): void {
    this.isCreating.set(false);
    this.selectedKey.set(entry.key);
    this.statusMessage.set('');
    this.applyDraft({
      key: entry.key,
      value: entry.value,
      existingKey: entry.key,
    });
  }
  // @relation(GSSC-MLLR-711, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-714, scope=range_start, role=Implementation)
  startCreate(): void {
    if (!this.permitted()) return;
    this.isCreating.set(true);
    this.selectedKey.set(null);
    this.applyDraft(emptyDraft());
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-714, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-727, scope=range_start, role=Implementation)
  async onSaved(): Promise<void> {
    if (!this.permitted()) return;

    const key = this.key().trim();
    const value = this.value();

    if (this.isCreating() || this.selectedKey() === null) {
      if (!key) {
        this.statusMessage.set('Key is required.');
        return;
      }
      try {
        const { error } = await kvsApi.upsert(key, value);
        if (error) {
          this.statusMessage.set('Save failed.');
          return;
        }
        this.isCreating.set(false);
        this.selectedKey.set(key);
        this.applyDraft({ key, value, existingKey: key });
        this.statusMessage.set('Created.');
        await this.refreshList();
      } catch {
        this.statusMessage.set('Save failed.');
      }
      return;
    }

    const existingKey = this.baseline.existingKey ?? this.selectedKey()!;
    try {
      const { error } = await kvsApi.upsert(existingKey, value);
      if (error) {
        this.statusMessage.set('Save failed.');
        return;
      }
      this.applyDraft({ key: existingKey, value, existingKey });
      this.statusMessage.set('Saved.');
      await this.refreshList();
    } catch {
      this.statusMessage.set('Save failed.');
    }
  }
  // @relation(GSSC-MLLR-727, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-728, scope=range_start, role=Implementation)
  onCancelled(): void {
    this.applyDraft({ ...this.baseline });
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-728, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-717, GSSC-MLLR-727, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.permitted()) return;
    const key = this.selectedKey();
    if (!key || this.isCreating()) return;
    try {
      const { error } = await kvsApi.remove(key);
      if (error) {
        this.statusMessage.set('Delete failed.');
        return;
      }
      this.selectedKey.set(null);
      this.isCreating.set(false);
      this.applyDraft(emptyDraft());
      this.statusMessage.set('Deleted.');
      await this.refreshList();
    } catch {
      this.statusMessage.set('Delete failed.');
    }
  }
  // @relation(GSSC-MLLR-717, GSSC-MLLR-727, scope=range_end, role=Implementation)

  private applyDraft(draft: KvDraft): void {
    this.baseline = { ...draft };
    this.key.set(draft.key);
    this.value.set(draft.value);
    this.selectedKey.set(draft.existingKey);
  }
}
