import { Component, input } from '@angular/core';

/** One resource linked from Section Contents (FE presentation; no Contents API). */
export type SectionResource = {
  name: string;
  href: string;
};

/** Section data placed by the Section Container. */
export type SectionContents = {
  header?: string | null;
  body: string;
  resources?: readonly SectionResource[] | null;
};

@Component({
  selector: 'gssc-section',
  templateUrl: './section.html',
})
export class Section {
  /** Section Contents supplied by the page (no Contents API in this task). */
  readonly contents = input.required<SectionContents>();

  protected hasHeader(contents: SectionContents): boolean {
    return contents.header != null && contents.header.length > 0;
  }

  protected hasResources(contents: SectionContents): boolean {
    return (contents.resources?.length ?? 0) > 0;
  }
}
