import {
  Component,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { backend } from '../../services/backend';

const RESEARCH_TOOLS_ORIGIN = 'http://localhost:3000';

/** Public research tool entry from Unified Backend GET /research-tools. */
export type ResearchToolEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
  hasFile: boolean;
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
    return result.data as ResearchToolEntry[];
  } catch {
    return null;
  }
}

/** Resolve href for a research tool: stored file URL or external reference link. */
export function researchToolHref(
  tool: Pick<ResearchToolEntry, 'cuid' | 'referenceLink' | 'hasFile'>,
  origin: string = RESEARCH_TOOLS_ORIGIN,
): string {
  // @relation(GSSC-PLLR-228, scope=range_start, role=Implementation)
  if (tool.hasFile) {
    return `${origin}/research-tools/${tool.cuid}/file`;
  }
  return tool.referenceLink;
  // @relation(GSSC-PLLR-228, scope=range_end, role=Implementation)
}

/**
 * Public Research Tools page (GSSC5-18 / GSSC-188): Society Resources and Tools
 * List as a refined hyperlink grid in normal page content (not nested under
 * Section / Section From CUID), sourced from GET /research-tools.
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

  toolHref(tool: ResearchToolEntry): string {
    return researchToolHref(tool);
  }

  private async loadTools(): Promise<void> {
    // @relation(GSSC-PLLR-159, scope=range_start, role=Implementation)
    const entries = await this.listGet();
    this.tools.set(entries === null ? [] : entries);
    // @relation(GSSC-PLLR-159, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-13, scope=range_end, role=Implementation)
