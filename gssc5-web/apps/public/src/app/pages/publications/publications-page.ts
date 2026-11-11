import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';

/** Public publication entry from Unified Backend GET /publications. */
export type PublicationEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
  description: string | null;
};

export type PublicationsListGet = () => Promise<PublicationEntry[] | null>;

/** Default Unified Backend publications list used by PublicationsPage. */
export const PUBLICATIONS_LIST_GET = new InjectionToken<PublicationsListGet>(
  'PUBLICATIONS_LIST_GET',
  {
    providedIn: 'root',
    factory: () => defaultPublicationsListGet,
  },
);

async function defaultPublicationsListGet(): Promise<PublicationEntry[] | null> {
  try {
    const result = await backend.publications.get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Public Publications page (GSSC5-19): Society Publications List as a refined
 * hyperlink grid in normal page content (not nested under Section / Section
 * From CUID), sourced from GET /publications. Optional description renders
 * below each title.
 */
// @relation(GSSC-PLLR-12, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-publications-page',
  templateUrl: './publications-page.html',
})
export class PublicationsPage {
  private readonly listGet = inject(PUBLICATIONS_LIST_GET);

  /** Publications for the grid, in backend list order. */
  readonly publications = signal<PublicationEntry[]>([]);

  constructor() {
    void this.loadPublications();
  }

  private async loadPublications(): Promise<void> {
    // @relation(GSSC-PLLR-243, scope=range_start, role=Implementation)
    const entries = await this.listGet();
    this.publications.set(entries === null ? [] : entries);
    // @relation(GSSC-PLLR-243, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-12, scope=range_end, role=Implementation)
