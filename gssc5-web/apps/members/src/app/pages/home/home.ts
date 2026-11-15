import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Editor } from '../../modules/editor/editor';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { Section, type SectionContents } from '../../modules/section/section';
import { backend } from '../../services/backend';

/** Temporary Wave 3 host for generic section display (GSSC5-83); dashboard replaces later. */
const demoSection: SectionContents = {
  header: 'Member section preview',
  body: 'Generic section display places header, body, and resources for logged-in members.',
  resources: [
    { name: 'Membership', href: '/membership' },
    { name: 'Directory', href: '/directory' },
  ],
};

/** Temporary Wave 3 host for generic editor (GSSC5-84); Wave 7 content editors replace later. */
@Component({
  selector: 'gssc-home-page',
  imports: [RouterLink, Section, Editor, FormTextField, FormSelectField],
  templateUrl: './home.html',
})
export class HomePage {
  protected readonly backendMessage = signal('…');
  protected readonly demoContents = demoSection;
  protected readonly editorHeader = signal('Member section preview');
  protected readonly editorBody = signal(
    'Generic editor shell composes GSSC5-85 form fields for Wave 7 hosts.',
  );
  protected readonly editorImagePosition = signal('none');
  protected readonly editorStatus = signal('Idle');
  protected readonly imagePositionOptions = [
    { value: 'none', label: 'None' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];

  private editorBaseline = {
    header: this.editorHeader(),
    body: this.editorBody(),
    imagePosition: this.editorImagePosition(),
  };

  constructor() {
    void backend.get().then(({ data, error }) => {
      this.backendMessage.set(error ? 'Backend unavailable' : String(data));
    });
  }

  protected onEditorSaved(): void {
    this.editorBaseline = {
      header: this.editorHeader(),
      body: this.editorBody(),
      imagePosition: this.editorImagePosition(),
    };
    this.editorStatus.set('Saved (local demo)');
  }

  protected onEditorCancelled(): void {
    this.editorHeader.set(this.editorBaseline.header);
    this.editorBody.set(this.editorBaseline.body);
    this.editorImagePosition.set(this.editorBaseline.imagePosition);
    this.editorStatus.set('Discarded');
  }
}
