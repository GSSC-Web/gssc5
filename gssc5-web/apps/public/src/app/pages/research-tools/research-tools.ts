import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';

/** Public section list entry from Unified Backend GET /sections. */
export type ResearchToolsSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
};

/** Page-ownership tag for research tools sections (GSSC5-37 tags). */
export const RESEARCH_TOOLS_PAGE_TAG = 'research-tools';

export type ResearchToolsSectionListGet = () => Promise<
  ResearchToolsSectionListEntry[] | null
>;

/** Default Unified Backend public section list used by ResearchToolsPage. */
export const RESEARCH_TOOLS_SECTION_LIST_GET =
  new InjectionToken<ResearchToolsSectionListGet>(
    'RESEARCH_TOOLS_SECTION_LIST_GET',
    {
      providedIn: 'root',
      factory: () => defaultResearchToolsSectionListGet,
    },
  );

async function defaultResearchToolsSectionListGet(): Promise<
  ResearchToolsSectionListEntry[] | null
> {
  try {
    const result = await backend.sections.get({
      query: { tag: RESEARCH_TOOLS_PAGE_TAG },
    });
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Public Research Tools page (GSSC5-18): lists society resources and tools
 * from the Unified Backend and places each through Section From CUID.
 */
// @relation(GSSC-PLLR-13, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-research-tools-page',
  imports: [SectionFromCuid],
  templateUrl: './research-tools.html',
})
export class ResearchToolsPage {
  private readonly listGet = inject(RESEARCH_TOOLS_SECTION_LIST_GET);

  /** Backend section cuids for tools on this page, in list order. */
  readonly toolCuids = signal<string[]>([]);

  constructor() {
    void this.loadTools();
  }

  private async loadTools(): Promise<void> {
    // @relation(GSSC-PLLR-159, scope=range_start, role=Implementation)
    const entries = await this.listGet();
    this.toolCuids.set(
      entries === null ? [] : entries.map((entry) => entry.cuid),
    );
    // @relation(GSSC-PLLR-159, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-13, scope=range_end, role=Implementation)
