import {
  Component,
  effect,
  inject,
  InjectionToken,
  input,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';
import { Section, type SectionContents, type SectionResource } from '../section/section';

/** Public section payload from Unified Backend GET /sections/{cuid}. */
export type BackendSectionData = {
  cuid: string;
  header: string | null;
  body: string;
  resources: string[];
  tags: string[];
  index: number;
};

export type SectionBackendGet = (cuid: string) => Promise<BackendSectionData | null>;

/** Default Unified Backend public section GET used by SectionFromCuid. */
export const SECTION_BACKEND_GET = new InjectionToken<SectionBackendGet>(
  'SECTION_BACKEND_GET',
  {
    providedIn: 'root',
    factory: () => defaultSectionBackendGet,
  },
);

async function defaultSectionBackendGet(cuid: string): Promise<BackendSectionData | null> {
  try {
    const result = await backend.sections({ cuid }).get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/** Map backend section data into Section Contents for the Section Container. */
export function sectionContentsFromBackend(data: BackendSectionData): SectionContents {
  const resources: SectionResource[] = data.resources.map((resource) => ({
    name: resource,
    href: resource,
  }));
  return {
    header: data.header,
    body: data.body,
    resources: resources.length > 0 ? resources : null,
  };
}

/**
 * Public Section loader: takes a backend section cuid, fetches Contents, and
 * places them through the GSSC5-25 Section Container.
 */
@Component({
  selector: 'gssc-section-from-cuid',
  imports: [Section],
  templateUrl: './section-from-cuid.html',
})
export class SectionFromCuid {
  private readonly backendGet = inject(SECTION_BACKEND_GET);
  private loadGeneration = 0;

  /** Backend generic section cuid. */
  readonly cuid = input.required<string>();

  /** Built Section Contents when retrieval succeeds; null when unavailable. */
  readonly contents = signal<SectionContents | null>(null);

  constructor() {
    effect(() => {
      const cuid = this.cuid();
      void this.load(cuid);
    });
  }

  private async load(cuid: string): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-PLLR-152, scope=range_start, role=Implementation)
    const data = await this.backendGet(cuid);
    if (generation !== this.loadGeneration) return;
    this.contents.set(data === null ? null : sectionContentsFromBackend(data));
    // @relation(GSSC-PLLR-152, scope=range_end, role=Implementation)
  }
}
