import { Component, computed, effect, inject, signal } from '@angular/core';
import { Editor } from '../../modules/editor/editor';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import {
  Section,
  type SectionContents,
  type SectionImagePosition,
  type SectionResource,
} from '../../modules/section/section';
import {
  PUBLIC_PAGE_OPTIONS,
  SECTION_GET_BY_CUID,
  SECTION_PATCH_BY_CUID,
  SECTIONS_LIST_BY_TAG,
  type SectionDetail,
  type SectionListEntry,
} from '../../services/sections-api';

type EditorBaseline = {
  header: string;
  body: string;
  imagePosition: string;
  imageFile: string;
  resourcesText: string;
};

/**
 * Page/Section Content Editor (GSSC5-93 / PIR-20): select a public page tag,
 * pick a section, edit via Generic Editor, persist with PATCH /sections/{cuid}.
 */
@Component({
  selector: 'gssc-page-section-editor-page',
  imports: [Editor, FormTextField, FormSelectField, Section],
  templateUrl: './page-section-editor.html',
})
export class PageSectionEditorPage {
  private readonly listByTag = inject(SECTIONS_LIST_BY_TAG);
  private readonly getByCuid = inject(SECTION_GET_BY_CUID);
  private readonly patchByCuid = inject(SECTION_PATCH_BY_CUID);

  private listGeneration = 0;
  private detailGeneration = 0;

  protected readonly pageOptions = [
    { value: '', label: 'Select a page…' },
    ...PUBLIC_PAGE_OPTIONS,
  ];
  protected readonly imagePositionOptions = [
    { value: 'none', label: 'None' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];

  /** Selected public page tag (empty until the member chooses). */
  readonly selectedPageTag = signal('');

  /** Sections for the selected page tag, backend index order. */
  readonly sections = signal<SectionListEntry[]>([]);

  /** Selected section cuid. */
  readonly selectedCuid = signal<string | null>(null);

  /** True while list or detail load is in flight. */
  readonly loading = signal(false);

  /** Host permission for Generic Editor; false after 403 or missing section. */
  readonly permitted = signal(true);

  /** Status line for save/cancel/load feedback. */
  readonly statusMessage = signal('');

  readonly editorHeader = signal('');
  readonly editorBody = signal('');
  readonly editorImagePosition = signal('none');
  readonly editorImageFile = signal('');
  readonly editorResourcesText = signal('');

  private baseline: EditorBaseline = {
    header: '',
    body: '',
    imagePosition: 'none',
    imageFile: '',
    resourcesText: '',
  };

  /** Resource id for exclusive edit — section cuid when selected. */
  readonly editorResourceId = computed(() => {
    const cuid = this.selectedCuid();
    return cuid != null && cuid.length > 0 ? `section:${cuid}` : 'section:none';
  });

  /** Live preview contents from editor fields. */
  readonly previewContents = computed<SectionContents>(() => {
    const resources = parseResourcesText(this.editorResourcesText());
    const position = parseImagePosition(this.editorImagePosition());
    const imageFile = this.editorImageFile().trim();
    return {
      header: this.editorHeader() || null,
      body: this.editorBody() || ' ',
      resources: resources.length > 0 ? resources : null,
      imageFile: imageFile.length > 0 ? imageFile : null,
      imagePosition: position,
    };
  });

  readonly hasSelection = computed(() => this.selectedCuid() != null);

  constructor() {
    effect(() => {
      const tag = this.selectedPageTag();
      void this.loadSectionsForPage(tag);
    });

    effect(() => {
      const cuid = this.selectedCuid();
      if (cuid == null) return;
      void this.loadSectionDetail(cuid);
    });
  }

  // @relation(GSSC-MLLR-264, GSSC-MLLR-279, GSSC-MLLR-286, scope=range_start, role=Implementation)
  onPageTagChange(tag: string): void {
    this.selectedPageTag.set(tag);
    this.selectedCuid.set(null);
    this.statusMessage.set('');
    this.permitted.set(true);
    this.clearEditorFields();
  }
  // @relation(GSSC-MLLR-264, GSSC-MLLR-279, GSSC-MLLR-286, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-270, GSSC-MLLR-280, scope=range_start, role=Implementation)
  onSelectSection(cuid: string): void {
    this.selectedCuid.set(cuid);
    this.statusMessage.set('');
    this.permitted.set(true);
  }
  // @relation(GSSC-MLLR-270, GSSC-MLLR-280, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-281, GSSC-MLLR-283, scope=range_start, role=Implementation)
  async onEditorSaved(): Promise<void> {
    const cuid = this.selectedCuid();
    if (cuid == null || !this.permitted()) return;

    const body = this.editorBody().trim();
    if (body.length === 0) {
      this.statusMessage.set('Body is required.');
      return;
    }

    const imageFile = this.editorImageFile().trim();
    const result = await this.patchByCuid(cuid, {
      header: this.editorHeader().trim() || null,
      body,
      resources: parseResourcesText(this.editorResourcesText()).map((r) => r.href),
      imageFile: imageFile.length > 0 ? imageFile : null,
      imagePosition: parseImagePosition(this.editorImagePosition()),
    });

    if (!result.ok) {
      if (result.forbidden) {
        this.permitted.set(false);
        this.statusMessage.set('You do not have permission to modify this section.');
      } else {
        this.statusMessage.set('Save failed.');
      }
      return;
    }

    this.applyDetail(result.detail);
    this.statusMessage.set('Saved.');
    // Refresh list headers after save.
    const tag = this.selectedPageTag();
    if (tag.length > 0) {
      const list = await this.listByTag(tag);
      this.sections.set(list);
    }
  }
  // @relation(GSSC-MLLR-281, GSSC-MLLR-283, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-282, scope=range_start, role=Implementation)
  protected onEditorCancelled(): void {
    this.editorHeader.set(this.baseline.header);
    this.editorBody.set(this.baseline.body);
    this.editorImagePosition.set(this.baseline.imagePosition);
    this.editorImageFile.set(this.baseline.imageFile);
    this.editorResourcesText.set(this.baseline.resourcesText);
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-282, scope=range_end, role=Implementation)

  protected sectionLabel(entry: SectionListEntry): string {
    const header = entry.header?.trim();
    if (header != null && header.length > 0) return header;
    const body = entry.body.trim();
    if (body.length > 0) return body.slice(0, 48) + (body.length > 48 ? '…' : '');
    return entry.cuid;
  }

  private async loadSectionsForPage(tag: string): Promise<void> {
    const generation = ++this.listGeneration;
    if (tag.length === 0) {
      this.sections.set([]);
      return;
    }
    this.loading.set(true);
    const list = await this.listByTag(tag);
    if (generation !== this.listGeneration) return;
    this.sections.set(list);
    this.loading.set(false);
  }

  private async loadSectionDetail(cuid: string): Promise<void> {
    const generation = ++this.detailGeneration;
    this.loading.set(true);
    const detail = await this.getByCuid(cuid);
    if (generation !== this.detailGeneration) return;
    this.loading.set(false);
    if (detail == null) {
      this.permitted.set(false);
      this.clearEditorFields();
      this.statusMessage.set('Section could not be loaded.');
      return;
    }
    this.permitted.set(true);
    this.applyDetail(detail);
  }

  private applyDetail(detail: SectionDetail): void {
    const header = detail.header ?? '';
    const body = detail.body;
    const imagePosition = detail.imagePosition ?? 'none';
    const imageFile = detail.imageFile ?? '';
    const resourcesText = (detail.resources ?? []).join('\n');
    this.editorHeader.set(header);
    this.editorBody.set(body);
    this.editorImagePosition.set(imagePosition);
    this.editorImageFile.set(imageFile);
    this.editorResourcesText.set(resourcesText);
    this.baseline = {
      header,
      body,
      imagePosition,
      imageFile,
      resourcesText,
    };
  }

  private clearEditorFields(): void {
    this.editorHeader.set('');
    this.editorBody.set('');
    this.editorImagePosition.set('none');
    this.editorImageFile.set('');
    this.editorResourcesText.set('');
    this.baseline = {
      header: '',
      body: '',
      imagePosition: 'none',
      imageFile: '',
      resourcesText: '',
    };
  }
}

function parseImagePosition(value: string): SectionImagePosition {
  if (value === 'left' || value === 'right' || value === 'none') return value;
  return 'none';
}

function parseResourcesText(text: string): SectionResource[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ name: line, href: line }));
}
