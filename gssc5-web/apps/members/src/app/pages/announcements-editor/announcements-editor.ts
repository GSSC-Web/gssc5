import { Component, InjectionToken, OnInit, computed, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import {
  announcementsApi,
  type AnnouncementListEntry,
  type AnnouncementRecord,
  type ContentTemplateListEntry,
  type PublicationTarget,
  isPublicToPublicationTarget,
  publicationTargetToIsPublic,
} from '../../services/announcements-api';

const CREATE_RESOURCE_ID = 'announcement:new';

export type AnnouncementsApi = typeof announcementsApi;

export const AnnouncementsApiToken = new InjectionToken<AnnouncementsApi>(
  'AnnouncementsApiToken',
);

type EditorBaseline = {
  header: string;
  body: string;
  publication: PublicationTarget | '';
  templateId: string;
};

@Component({
  selector: 'gssc-announcements-editor-page',
  imports: [Editor, FormTextField, FormSelectField],
  templateUrl: './announcements-editor.html',
})
export class AnnouncementsEditorPage implements OnInit {
  private readonly api = inject(AnnouncementsApiToken, { optional: true }) ?? announcementsApi;

  protected readonly catalog = signal<AnnouncementListEntry[]>([]);
  protected readonly templates = signal<ContentTemplateListEntry[]>([]);
  protected readonly mode = signal<'idle' | 'create' | 'edit'>('idle');
  protected readonly selectedCuid = signal<string | null>(null);
  protected readonly statusMessage = signal('Select an announcement or create a new one.');
  protected readonly permitted = signal(true);

  protected readonly header = signal('');
  protected readonly body = signal('');
  protected readonly publication = signal<PublicationTarget | ''>('');
  protected readonly templateId = signal('');

  private baseline: EditorBaseline = {
    header: '',
    body: '',
    publication: '',
    templateId: '',
  };

  private templateIsPublic: boolean | null = null;

  protected readonly publicationOptions = [
    { value: 'members', label: 'Member Frontend only' },
    { value: 'public', label: 'Public Frontend' },
    { value: 'both', label: 'Public and Member Frontends' },
  ];

  protected readonly editPublicationOptions = [
    { value: '', label: 'Keep current visibility' },
    ...this.publicationOptions,
  ];

  protected readonly templateOptions = computed(() =>
    this.templates().map((row) => ({ value: row.cuid, label: row.name })),
  );

  protected readonly editorResourceId = computed(() => {
    if (this.mode() === 'create') return CREATE_RESOURCE_ID;
    const cuid = this.selectedCuid();
    return cuid != null ? `announcement:${cuid}` : CREATE_RESOURCE_ID;
  });

  protected readonly editorTitle = computed(() => {
    if (this.mode() === 'create') return 'New announcement';
    if (this.mode() === 'edit') return 'Edit announcement';
    return 'Announcement';
  });

  protected readonly showEditor = computed(() => this.mode() === 'create' || this.mode() === 'edit');

  protected readonly fieldsEnabled = computed(() => this.permitted() && this.showEditor());

  // @relation(GSSC-MLLR-738, scope=range_start, role=Implementation)
  protected readonly canCopy = computed(
    () => this.permitted() && this.mode() === 'edit' && this.selectedCuid() != null,
  );
  // @relation(GSSC-MLLR-738, scope=range_end, role=Implementation)

  protected readonly activePublicationOptions = computed(() =>
    this.mode() === 'edit' ? this.editPublicationOptions : this.publicationOptions,
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reloadCatalog(), this.reloadTemplates()]);
  }

  // @relation(GSSC-MLLR-300, scope=range_start, role=Implementation)
  protected async reloadCatalog(): Promise<void> {
    const rows = await this.api.list();
    this.catalog.set(rows);
  }
  // @relation(GSSC-MLLR-300, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-305, scope=range_start, role=Implementation)
  protected async reloadTemplates(): Promise<void> {
    const rows = await this.api.listTemplates();
    this.templates.set(rows);
  }
  // @relation(GSSC-MLLR-305, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-306, scope=range_start, role=Implementation)
  protected startCreate(): void {
    this.mode.set('create');
    this.selectedCuid.set(null);
    this.permitted.set(true);
    this.header.set('');
    this.body.set('');
    this.publication.set('both');
    this.templateId.set('');
    this.templateIsPublic = true;
    this.baseline = {
      header: '',
      body: '',
      publication: 'both',
      templateId: '',
    };
    this.statusMessage.set('Creating a new announcement.');
  }

  protected async selectAnnouncement(cuid: string): Promise<void> {
    this.mode.set('edit');
    this.selectedCuid.set(cuid);
    this.permitted.set(true);
    const detail = await this.api.get(cuid);
    if (detail == null) {
      this.statusMessage.set('Could not load that announcement.');
      this.mode.set('idle');
      this.selectedCuid.set(null);
      return;
    }
    this.applyRecord(detail);
    this.statusMessage.set('Editing announcement.');
  }
  // @relation(GSSC-MLLR-306, scope=range_end, role=Implementation)

  protected async onTemplateChange(next: string): Promise<void> {
    this.templateId.set(next);
    if (!next) {
      this.templateIsPublic = null;
      return;
    }
    const detail = await this.api.getTemplate(next);
    if (detail == null) return;
    this.templateIsPublic = detail.isPublic;
    this.publication.set(isPublicToPublicationTarget(detail.isPublic));
  }

  // @relation(GSSC-MLLR-301, GSSC-MLLR-302, GSSC-MLLR-303, GSSC-MLLR-307, scope=range_start, role=Implementation)
  protected async onEditorSaved(): Promise<void> {
    if (this.mode() === 'create') {
      await this.saveCreate();
      return;
    }
    if (this.mode() === 'edit' && this.selectedCuid() != null) {
      await this.saveEdit(this.selectedCuid()!);
    }
  }

  private async saveCreate(): Promise<void> {
    const templateId = this.templateId().trim();
    const body = this.body().trim();
    if (!templateId || !body) {
      this.statusMessage.set('Template and body are required to create an announcement.');
      return;
    }
    const created = await this.api.create({
      body,
      templateId,
      header: this.header().trim() || null,
    });
    if (!created.ok) {
      this.statusMessage.set('Announcement was not saved.');
      if (created.status === 403) this.permitted.set(false);
      return;
    }

    const publication = this.publication();
    if (publication !== '') {
      const desired = publicationTargetToIsPublic(publication);
      const fromTemplate = this.templateIsPublic ?? true;
      if (desired !== fromTemplate) {
        const updated = await this.api.update(created.data.cuid, { isPublic: desired });
        if (!updated.ok) {
          this.statusMessage.set('Announcement was created but publication was not saved.');
          await this.reloadCatalog();
          await this.selectAnnouncement(created.data.cuid);
          return;
        }
      }
    }

    this.statusMessage.set('Announcement created.');
    await this.reloadCatalog();
    await this.selectAnnouncement(created.data.cuid);
  }

  private async saveEdit(cuid: string): Promise<void> {
    const body = this.body().trim();
    if (!body) {
      this.statusMessage.set('Body is required.');
      return;
    }
    const patch: {
      header: string | null;
      body: string;
      isPublic?: boolean;
    } = {
      header: this.header().trim() || null,
      body,
    };
    const publication = this.publication();
    if (publication !== '') {
      patch.isPublic = publicationTargetToIsPublic(publication);
    }
    const updated = await this.api.update(cuid, patch);
    if (!updated.ok) {
      this.statusMessage.set('Announcement was not saved.');
      if (updated.status === 403) this.permitted.set(false);
      return;
    }
    this.applyRecord(updated.data);
    if (publication !== '') {
      this.publication.set(publication);
      this.baseline = { ...this.baseline, publication };
    }
    this.statusMessage.set('Announcement saved.');
    await this.reloadCatalog();
  }
  // @relation(GSSC-MLLR-301, GSSC-MLLR-302, GSSC-MLLR-303, GSSC-MLLR-307, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-304, scope=range_start, role=Implementation)
  protected onEditorCancelled(): void {
    this.header.set(this.baseline.header);
    this.body.set(this.baseline.body);
    this.publication.set(this.baseline.publication);
    this.templateId.set(this.baseline.templateId);
    this.statusMessage.set('Discarded unsaved changes.');
  }
  // @relation(GSSC-MLLR-304, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-725, GSSC-MLLR-728, scope=range_start, role=Implementation)
  protected async onDelete(): Promise<void> {
    if (!this.permitted() || this.mode() !== 'edit') return;
    const cuid = this.selectedCuid();
    if (cuid == null) return;

    const result = await this.api.remove(cuid);
    if (!result.ok) {
      this.statusMessage.set('Announcement was not deleted.');
      if (result.status === 403) this.permitted.set(false);
      return;
    }

    await this.reloadCatalog();
    this.mode.set('idle');
    this.selectedCuid.set(null);
    this.header.set('');
    this.body.set('');
    this.publication.set('');
    this.templateId.set('');
    this.baseline = { header: '', body: '', publication: '', templateId: '' };
    this.permitted.set(true);
    this.statusMessage.set('Announcement deleted.');
  }
  // @relation(GSSC-MLLR-725, GSSC-MLLR-728, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-737, GSSC-MLLR-740, scope=range_start, role=Implementation)
  protected async copyToNew(): Promise<void> {
    if (!this.canCopy()) return;
    const cuid = this.selectedCuid();
    if (cuid == null) return;

    const detail = await this.api.get(cuid);
    if (detail == null) {
      this.statusMessage.set('Could not load that announcement to copy.');
      return;
    }

    const publication =
      detail.isPublic === undefined
        ? ('both' as PublicationTarget)
        : isPublicToPublicationTarget(detail.isPublic);
    const header = detail.header ?? '';
    const body = detail.body;

    this.mode.set('create');
    this.selectedCuid.set(null);
    this.permitted.set(true);
    this.header.set(header);
    this.body.set(body);
    this.publication.set(publication);
    this.templateId.set('');
    this.templateIsPublic = detail.isPublic ?? null;
    this.baseline = {
      header,
      body,
      publication,
      templateId: '',
    };
    this.statusMessage.set('Copied — choose a template and save.');
  }
  // @relation(GSSC-MLLR-737, GSSC-MLLR-740, scope=range_end, role=Implementation)

  protected catalogLabel(row: AnnouncementListEntry): string {
    const header = row.header?.trim();
    if (header) return header;
    const body = row.body.trim();
    return body.length > 48 ? `${body.slice(0, 48)}…` : body || row.cuid;
  }

  private applyRecord(detail: AnnouncementRecord): void {
    const header = detail.header ?? '';
    const body = detail.body;
    this.header.set(header);
    this.body.set(body);
    this.publication.set('');
    this.templateId.set('');
    this.baseline = {
      header,
      body,
      publication: '',
      templateId: '',
    };
  }
}
