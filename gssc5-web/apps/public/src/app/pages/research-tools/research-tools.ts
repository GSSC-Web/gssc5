import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';

/** Public research tool entry from Unified Backend GET /research-tools. */
export type ResearchToolEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
};

export type ResearchToolsListGet = () => Promise<ResearchToolEntry[] | null>;

/** Default Unified Backend research tools list used by ResearchToolsPage. */
export const RESEARCH_TOOLS_LIST_GET = new InjectionToken<ResearchToolsListGet>(
  'RESEARCH_TOOLS_LIST_GET',
  {
    providedIn: 'root',
    factory: () => defaultResearchToolsListGet,
  },
);

async function defaultResearchToolsListGet(): Promise<ResearchToolEntry[] | null> {
  try {
    const result = await backend['research-tools'].get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Public Research Tools page (GSSC5-18): Society Resources and Tools List as a
 * refined hyperlink grid sourced from the research-tools catalog.
 */
// @relation(GSSC-PLLR-13, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-research-tools-page',
  templateUrl: './research-tools.html',
})
export class ResearchToolsPage {
  private readonly listGet = inject(RESEARCH_TOOLS_LIST_GET);

  /** Research tools for the grid, in backend list order. */
  readonly tools = signal<ResearchToolEntry[]>([]);

  constructor() {
    void this.loadTools();
  }

  private async loadTools(): Promise<void> {
    // @relation(GSSC-PLLR-159, scope=range_start, role=Implementation)
    const entries = await this.listGet();
    this.tools.set(entries === null ? [] : entries);
    // @relation(GSSC-PLLR-159, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-13, scope=range_end, role=Implementation)
