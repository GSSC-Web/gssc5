import { Component, signal } from '@angular/core';
import { backend } from '../../services/backend';
import { Section, type SectionContents } from '../../modules/section/section';

/** Temporary Wave 3 host for generic section display (GSSC5-83); dashboard replaces later. */
const demoSection: SectionContents = {
  header: 'Member section preview',
  body: 'Generic section display places header, body, and resources for logged-in members.',
  resources: [
    { name: 'Membership', href: '/membership' },
    { name: 'Directory', href: '/directory' },
  ],
};

@Component({
  selector: 'gssc-home-page',
  imports: [Section],
  templateUrl: './home.html',
})
export class HomePage {
  protected readonly backendMessage = signal('…');
  protected readonly demoContents = demoSection;

  constructor() {
    void backend.get().then(({ data, error }) => {
      this.backendMessage.set(error ? 'Backend unavailable' : String(data));
    });
  }
}
