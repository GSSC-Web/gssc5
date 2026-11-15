import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
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
  type NewsletterFields,
} from '../../services/newsletters-api';

const NEW_RESOURCE_ID = 'newsletter:new';

type EditorDraft = {
  volume: string;
  number: string;
  month: string;
  year: string;
  filePath: string;
  keywords: string;
};

const emptyDraft = (): EditorDraft => ({
  volume: '',
  number: '',
  month: '',
  year: '',
  filePath: '',
  keywords: '',
});

function draftFromEntry(entry: NewsletterEntry): EditorDraft {
  return {
    volume: String(entry.volume),
    number: String(entry.number),
    month: String(entry.month),
    year: String(entry.year),
    filePath: entry.filePath,
    keywords: formatKeywordsInput(entry.keywords),
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
  readonly filePath = model('');
  readonly keywords = model('');

  private baseline = emptyDraft();

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
    if (this.canEdit()) {
      await this.reloadCatalog();
      this.beginCreate();
    }
  }

  // @relation(GSSC-MLLR-357, scope=range_start, role=Implementation)
  beginCreate(): void {
    this.selectedCuid.set(null);
    this.resourceId.set(NEW_RESOURCE_ID);
    this.applyDraft(emptyDraft());
    this.saveError.set(null);
  }
  // @relation(GSSC-MLLR-357, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-373, scope=range_start, role=Implementation)
  async selectEntry(entry: NewsletterEntry): Promise<void> {
    this.saveError.set(null);
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

  // @relation(GSSC-MLLR-368, GSSC-MLLR-369, GSSC-MLLR-370, scope=range_start, role=Implementation)
  async onEditorSaved(): Promise<void> {
    if (!this.canEdit()) return;
    const fields = this.readFields();
    if (fields == null) {
      this.saveError.set('Enter valid volume, number, month, year, file path, and keywords.');
      return;
    }

    this.saveError.set(null);
    const cuid = this.selectedCuid();
    try {
      if (cuid == null) {
        const { data, error } = await newslettersApi.create(fields);
        if (error || !data || typeof data !== 'object') {
          this.saveError.set('Create failed.');
          return;
        }
        const created = data as NewsletterEntry;
        this.selectedCuid.set(created.cuid);
        this.resourceId.set(`newsletter:${created.cuid}`);
        this.applyDraft(draftFromEntry(created));
      } else {
        const { data, error } = await newslettersApi.update(cuid, fields);
        if (error || !data || typeof data !== 'object') {
          this.saveError.set('Save failed.');
          return;
        }
        this.applyDraft(draftFromEntry(data as NewsletterEntry));
      }
      await this.reloadCatalog();
    } catch {
      this.saveError.set(cuid == null ? 'Create failed.' : 'Save failed.');
    }
  }
  // @relation(GSSC-MLLR-368, GSSC-MLLR-369, GSSC-MLLR-370, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-372, scope=range_start, role=Implementation)
  onEditorCancelled(): void {
    this.applyDraft({ ...this.baseline });
    this.saveError.set(null);
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
    this.filePath.set(draft.filePath);
    this.keywords.set(draft.keywords);
    this.baseline = { ...draft };
  }

  private readFields(): NewsletterFields | null {
    const volume = parseRequiredInteger(this.volume());
    const number = parseRequiredInteger(this.number());
    const month = parseRequiredInteger(this.month());
    const year = parseRequiredInteger(this.year());
    const filePath = this.filePath().trim();
    const keywords = parseKeywordsInput(this.keywords());
    if (
      volume == null ||
      number == null ||
      month == null ||
      year == null ||
      filePath.length === 0
    ) {
      return null;
    }
    return { volume, number, month, year, filePath, keywords };
  }
}
