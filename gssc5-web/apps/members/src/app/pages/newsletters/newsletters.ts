import {
  Component,
  computed,
  effect,
  inject,
  model,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import {
  formatKeywordsInput,
  newsletterLabel,
  newslettersApi,
  parseKeywordsInput,
  parseRequiredInteger,
  type NewsletterEntry,
  type NewsletterMetaFields,
} from '../../services/newsletters-api';

const NEW_RESOURCE_ID = 'newsletter:new';
const PENDING_FILE_PATH = 'pending';

type EditorDraft = {
  volume: string;
  number: string;
  month: string;
  year: string;
  filePath: string;
  keywords: string;
  fileLabel: string;
};

type NewsletterFieldKey = 'volume' | 'number' | 'month' | 'year' | 'keywords' | 'issueFile';

const emptyDraft = (): EditorDraft => ({
  volume: '',
  number: '',
  month: '',
  year: '',
  filePath: '',
  keywords: '',
  fileLabel: 'No file chosen',
});

function draftFromEntry(entry: NewsletterEntry): EditorDraft {
  return {
    volume: String(entry.volume),
    number: String(entry.number),
    month: String(entry.month),
    year: String(entry.year),
    filePath: entry.filePath,
    keywords: formatKeywordsInput(entry.keywords),
    fileLabel: entry.filePath.trim().length > 0 ? 'Current issue file on file' : 'No file chosen',
  };
}

@Component({
  selector: 'gssc-newsletters-page',
  imports: [Editor, FormTextField],
  templateUrl: './newsletters.html',
})
export class NewslettersPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  readonly entries = signal<NewsletterEntry[]>([]);
  readonly loadError = signal(false);
  readonly loading = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly selectedCuid = signal<string | null>(null);
  readonly resourceId = signal(NEW_RESOURCE_ID);

  readonly volume = model('');
  readonly number = model('');
  readonly month = model('');
  readonly year = model('');
  readonly keywords = model('');
  readonly fileLabel = signal('No file chosen');

  /** Chosen file awaiting upload on Save; cleared after a successful upload. */
  pendingFile: File | null = null;

  private baseline = emptyDraft();
  private storedFilePath = '';

  // @relation(GSSC-MLLR-706, GSSC-MLLR-707, scope=range_start, role=Implementation)
  private readonly invalidKeys = signal<ReadonlySet<NewsletterFieldKey>>(new Set());

  constructor() {
    // Clear a field's invalid mark when the member edits that value.
    effect(() => {
      this.volume();
      untracked(() => this.clearInvalidKey('volume'));
    });
    effect(() => {
      this.number();
      untracked(() => this.clearInvalidKey('number'));
    });
    effect(() => {
      this.month();
      untracked(() => this.clearInvalidKey('month'));
    });
    effect(() => {
      this.year();
      untracked(() => this.clearInvalidKey('year'));
    });
    effect(() => {
      this.keywords();
      untracked(() => this.clearInvalidKey('keywords'));
    });
  }

  fieldInvalid(key: NewsletterFieldKey): boolean {
    return this.invalidKeys().has(key);
  }

  private evaluateMetaFields(): {
    fields: NewsletterMetaFields | null;
    invalid: NewsletterFieldKey[];
  } {
    const volume = parseRequiredInteger(this.volume());
    const number = parseRequiredInteger(this.number());
    const month = parseRequiredInteger(this.month());
    const year = parseRequiredInteger(this.year());
    const keywords = parseKeywordsInput(this.keywords());
    const invalid: NewsletterFieldKey[] = [];
    if (volume == null) invalid.push('volume');
    if (number == null) invalid.push('number');
    if (month == null) invalid.push('month');
    if (year == null) invalid.push('year');
    if (invalid.length > 0) {
      return { fields: null, invalid };
    }
    return {
      fields: { volume: volume!, number: number!, month: month!, year: year!, keywords },
      invalid: [],
    };
  }

  private clearInvalidKeys(): void {
    this.invalidKeys.set(new Set());
  }

  private clearInvalidKey(key: NewsletterFieldKey): void {
    if (!this.invalidKeys().has(key)) return;
    const next = new Set(this.invalidKeys());
    next.delete(key);
    this.invalidKeys.set(next);
  }
  // @relation(GSSC-MLLR-706, GSSC-MLLR-707, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-367, scope=range_start, role=Implementation)
  /** Administrators and newsletter editors may create/publish/modify. */
  readonly canEdit = computed(
    () => this.memberSession.isAdmin() || this.memberSession.isNewsletterEditor(),
  );
  // @relation(GSSC-MLLR-367, scope=range_end, role=Implementation)

  readonly editorTitle = computed(() =>
    this.selectedCuid() == null ? 'New newsletter' : 'Edit newsletter',
  );

  async ngOnInit(): Promise<void> {
    await this.memberSession.whenReady();
    if (!this.canEdit()) return;
    // Reload first; only open create when nothing was selected during boot
    // (avoids a late beginCreate clearing a Save that finished mid-init).
    await this.reloadCatalog();
    if (this.selectedCuid() == null) {
      this.beginCreate();
    }
  }

  // @relation(GSSC-MLLR-357, scope=range_start, role=Implementation)
  beginCreate(): void {
    this.selectedCuid.set(null);
    this.resourceId.set(NEW_RESOURCE_ID);
    this.applyDraft(emptyDraft());
    this.saveError.set(null);
    this.clearInvalidKeys();
  }
  // @relation(GSSC-MLLR-357, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-373, scope=range_start, role=Implementation)
  async selectEntry(entry: NewsletterEntry): Promise<void> {
    this.saveError.set(null);
    this.clearInvalidKeys();
    this.loading.set(true);
    try {
      const { data, error } = await newslettersApi.get(entry.cuid);
      if (error || !data || typeof data !== 'object') {
        this.saveError.set('Newsletter unavailable.');
        return;
      }
      const loaded = data as NewsletterEntry;
      this.selectedCuid.set(loaded.cuid);
      this.resourceId.set(`newsletter:${loaded.cuid}`);
      this.applyDraft(draftFromEntry(loaded));
    } catch {
      this.saveError.set('Newsletter unavailable.');
    } finally {
      this.loading.set(false);
    }
  }
  // @relation(GSSC-MLLR-373, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-693, GSSC-MLLR-694, GSSC-MLLR-695, GSSC-MLLR-696, scope=range_start, role=Implementation)
  onIssueFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingFile = file;
    this.fileLabel.set(file?.name ?? 'No file chosen');
    this.clearInvalidKey('issueFile');
  }
  // @relation(GSSC-MLLR-693, GSSC-MLLR-694, GSSC-MLLR-695, GSSC-MLLR-696, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-368, GSSC-MLLR-369, GSSC-MLLR-370, GSSC-MLLR-696, scope=range_start, role=Implementation)
  async onEditorSaved(): Promise<void> {
    if (!this.canEdit()) return;
    const meta = this.evaluateMetaFields();
    if (meta.fields == null) {
      this.invalidKeys.set(new Set(meta.invalid));
      this.saveError.set('Enter valid volume, number, month, year, and keywords.');
      return;
    }

    const cuid = this.selectedCuid();
    if (cuid == null && this.pendingFile == null) {
      this.invalidKeys.set(new Set<NewsletterFieldKey>(['issueFile']));
      this.saveError.set('Choose a newsletter issue file before saving.');
      return;
    }

    this.clearInvalidKeys();
    this.saveError.set(null);
    const fields = meta.fields;
    try {
      if (cuid == null) {
        const { data, error } = await newslettersApi.create({
          ...fields,
          filePath: PENDING_FILE_PATH,
        });
        if (error || !data || typeof data !== 'object') {
          this.saveError.set('Create failed.');
          return;
        }
        const created = data as NewsletterEntry;
        const uploaded = await newslettersApi.uploadFile(this.pendingFile!, created.cuid);
        if (uploaded.error || !uploaded.data) {
          this.saveError.set('Issue file could not be uploaded.');
          return;
        }
        this.pendingFile = null;
        this.selectedCuid.set(created.cuid);
        this.resourceId.set(`newsletter:${created.cuid}`);
        this.applyDraft(
          draftFromEntry({
            ...created,
            filePath: uploaded.data.cuid,
          }),
        );
      } else {
        const { data, error } = await newslettersApi.update(cuid, {
          ...fields,
          filePath: this.storedFilePath,
        });
        if (error || !data || typeof data !== 'object') {
          this.saveError.set('Save failed.');
          return;
        }
        let saved = data as NewsletterEntry;
        if (this.pendingFile !== null) {
          const uploaded = await newslettersApi.uploadFile(this.pendingFile, cuid);
          if (uploaded.error || !uploaded.data) {
            this.saveError.set('Issue file could not be uploaded.');
            return;
          }
          this.pendingFile = null;
          saved = { ...saved, filePath: uploaded.data.cuid };
        }
        this.applyDraft(draftFromEntry(saved));
      }
      await this.reloadCatalog();
    } catch {
      this.saveError.set(cuid == null ? 'Create failed.' : 'Save failed.');
    }
  }
  // @relation(GSSC-MLLR-368, GSSC-MLLR-369, GSSC-MLLR-370, GSSC-MLLR-696, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-372, scope=range_start, role=Implementation)
  onEditorCancelled(): void {
    this.applyDraft({ ...this.baseline });
    this.saveError.set(null);
    this.clearInvalidKeys();
  }
  // @relation(GSSC-MLLR-372, scope=range_end, role=Implementation)

  catalogLabel(entry: NewsletterEntry): string {
    return newsletterLabel(entry);
  }

  // @relation(GSSC-MLLR-371, scope=range_start, role=Implementation)
  private async reloadCatalog(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const { data, error } = await newslettersApi.list();
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set(true);
        return;
      }
      this.entries.set(data as NewsletterEntry[]);
    } catch {
      this.entries.set([]);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  // @relation(GSSC-MLLR-371, scope=range_end, role=Implementation)

  private applyDraft(draft: EditorDraft): void {
    this.volume.set(draft.volume);
    this.number.set(draft.number);
    this.month.set(draft.month);
    this.year.set(draft.year);
    this.keywords.set(draft.keywords);
    this.fileLabel.set(draft.fileLabel);
    this.storedFilePath = draft.filePath;
    this.pendingFile = null;
    this.baseline = { ...draft };
  }
}
