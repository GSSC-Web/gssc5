import {
  Component,
  computed,
  effect,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';
import { backend } from '../../services/backend';
import {
  catalogVolumes,
  catalogYears,
  entryByCuid,
  entryForVolumeNumber,
  entryForYearMonth,
  filesApiUrl,
  monthLabel,
  monthsForYear,
  mostRecentEntry,
  numbersForVolume,
  type NewsletterCatalogEntry,
  type NewsletterSelectionMode,
} from './newsletter-catalog';

export type NewsletterCatalogListGet = () => Promise<NewsletterCatalogEntry[]>;

export type NewsletterSectionListEntry = {
  cuid: string;
  header: string | null;
  body: string;
  tags: string[];
  index: number;
};

export type NewsletterSectionListByTag = (
  tag: string,
) => Promise<NewsletterSectionListEntry[]>;

/**
 * Resolve a newsletter filePath to a browser-usable object URL.
 * Returns null when the Unified Backend denies the file (ACL) or it is missing/soft-deleted.
 */
export type NewsletterFileResolve = (filePath: string) => Promise<string | null>;

/** Backend tag that binds public Newsletter Intro sections to this page. */
export const NEWSLETTER_INTRO_TAG = 'newsletter';

/** Default Unified Backend public newsletter catalog list. */
export const NEWSLETTER_CATALOG_GET = new InjectionToken<NewsletterCatalogListGet>(
  'NEWSLETTER_CATALOG_GET',
  {
    providedIn: 'root',
    factory: () => defaultNewsletterCatalogGet,
  },
);

/** Default Unified Backend public section list filtered by tag (intro). */
export const NEWSLETTER_SECTION_LIST_BY_TAG =
  new InjectionToken<NewsletterSectionListByTag>('NEWSLETTER_SECTION_LIST_BY_TAG', {
    providedIn: 'root',
    factory: () => defaultNewsletterSectionListByTag,
  });

/** Default: credentialed GET /files/{cuid} respecting ACL + soft-delete (GSSC5-71). */
export const NEWSLETTER_FILE_RESOLVE = new InjectionToken<NewsletterFileResolve>(
  'NEWSLETTER_FILE_RESOLVE',
  {
    providedIn: 'root',
    factory: () => defaultNewsletterFileResolve,
  },
);

async function defaultNewsletterCatalogGet(): Promise<NewsletterCatalogEntry[]> {
  try {
    const result = await backend.newsletters.get();
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return result.data.map((row) => ({
      cuid: row.cuid,
      volume: row.volume,
      number: row.number,
      month: row.month,
      year: row.year,
      filePath: row.filePath,
      keywords: row.keywords,
    }));
  } catch {
    return [];
  }
}

async function defaultNewsletterSectionListByTag(
  tag: string,
): Promise<NewsletterSectionListEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    return result.data;
  } catch {
    return [];
  }
}

async function defaultNewsletterFileResolve(filePath: string): Promise<string | null> {
  // @relation(GSSC-PLLR-225, GSSC-PLLR-252, scope=range_start, role=Implementation)
  const url = filesApiUrl(filePath);
  try {
    const response = await fetch(url, { credentials: 'include' });
    // Soft-deleted / missing → 404; ACL denial → 403; both omit preview/download.
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
  // @relation(GSSC-PLLR-225, GSSC-PLLR-252, scope=range_end, role=Implementation)
}

function sortIntroByIndex(
  entries: NewsletterSectionListEntry[],
): NewsletterSectionListEntry[] {
  return [...entries].sort((a, b) => a.index - b.index);
}

function parseOptionalInt(raw: string | null): number | null {
  if (raw === null || raw.trim().length === 0) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

// @relation(GSSC-PLLR-14, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-newsletters-page',
  imports: [SectionFromCuid],
  templateUrl: './newsletters.html',
})
export class NewslettersPage {
  private readonly catalogGet = inject(NEWSLETTER_CATALOG_GET);
  private readonly sectionListByTag = inject(NEWSLETTER_SECTION_LIST_BY_TAG);
  private readonly fileResolve = inject(NEWSLETTER_FILE_RESOLVE);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly catalog = signal<NewsletterCatalogEntry[]>([]);
  readonly introCuids = signal<string[]>([]);
  readonly selectedCuid = signal<string | null>(null);
  /** Default Volume/Number unless year+month query selected the issue. */
  readonly selectionMode = signal<NewsletterSelectionMode>('volume-number');

  /** Browser object URL for the readable selected issue file; null when unavailable. */
  readonly resolvedFileUrl = signal<string | null>(null);

  private resolveGeneration = 0;
  private objectUrlToRevoke: string | null = null;
  private syncingQuery = false;
  private catalogReady = false;

  readonly selected = computed(() => {
    const cuid = this.selectedCuid();
    if (cuid === null) return null;
    return entryByCuid(this.catalog(), cuid);
  });

  // @relation(GSSC-PLLR-210, scope=range_start, role=Implementation)
  readonly volumes = computed(() => catalogVolumes(this.catalog()));
  // @relation(GSSC-PLLR-210, scope=range_end, role=Implementation)

  readonly selectedVolume = computed(() => this.selected()?.volume ?? null);

  // @relation(GSSC-PLLR-213, scope=range_start, role=Implementation)
  readonly numbers = computed(() => {
    const volume = this.selectedVolume();
    if (volume === null) return [] as number[];
    return numbersForVolume(this.catalog(), volume);
  });
  // @relation(GSSC-PLLR-213, scope=range_end, role=Implementation)

  readonly selectedNumber = computed(() => this.selected()?.number ?? null);

  // @relation(GSSC-PLLR-219, scope=range_start, role=Implementation)
  readonly years = computed(() => catalogYears(this.catalog()));
  // @relation(GSSC-PLLR-219, scope=range_end, role=Implementation)

  readonly selectedYear = computed(() => this.selected()?.year ?? null);

  // @relation(GSSC-PLLR-216, scope=range_start, role=Implementation)
  readonly months = computed(() => {
    const year = this.selectedYear();
    if (year === null) return [] as number[];
    return monthsForYear(this.catalog(), year);
  });
  // @relation(GSSC-PLLR-216, scope=range_end, role=Implementation)

  readonly selectedMonth = computed(() => this.selected()?.month ?? null);

  readonly selectedFilePath = computed(() => this.selected()?.filePath ?? null);

  /** Alias used by tests: resolved browser URL when the file is readable. */
  readonly selectedFileUrl = computed(() => this.resolvedFileUrl());

  // @relation(GSSC-PLLR-225, scope=range_start, role=Implementation)
  readonly previewSafeUrl = computed((): SafeResourceUrl | null => {
    const url = this.resolvedFileUrl();
    return url === null ? null : this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
  // @relation(GSSC-PLLR-225, scope=range_end, role=Implementation)

  constructor() {
    void this.load();

    effect(() => {
      const path = this.selectedFilePath();
      void this.resolveSelectedFile(path);
    });

    effect(() => {
      const cuid = this.selectedCuid();
      if (!this.catalogReady || this.syncingQuery) return;
      void this.writeQueryCuid(cuid);
    });
  }

  // @relation(GSSC-PLLR-207, GSSC-PLLR-255, scope=range_start, role=Implementation)
  private async load(): Promise<void> {
    const [entries, intro] = await Promise.all([
      this.catalogGet(),
      this.sectionListByTag(NEWSLETTER_INTRO_TAG),
    ]);
    this.catalog.set(entries);
    this.introCuids.set(sortIntroByIndex(intro).map((entry) => entry.cuid));

    const fromQuery = this.resolveFromQuery(entries);
    if (fromQuery) {
      this.selectedCuid.set(fromQuery.entry.cuid);
      this.selectionMode.set(fromQuery.mode);
    } else {
      const newest = mostRecentEntry(entries);
      this.selectedCuid.set(newest?.cuid ?? null);
      this.selectionMode.set('volume-number');
    }
    this.catalogReady = true;
    void this.writeQueryCuid(this.selectedCuid());
  }
  // @relation(GSSC-PLLR-207, GSSC-PLLR-255, scope=range_end, role=Implementation)

  private resolveFromQuery(
    entries: NewsletterCatalogEntry[],
  ): { entry: NewsletterCatalogEntry; mode: NewsletterSelectionMode } | null {
    const params = this.route.snapshot.queryParamMap;
    const cuid = params.get('cuid');
    if (cuid) {
      const entry = entryByCuid(entries, cuid);
      if (entry) return { entry, mode: 'volume-number' };
    }

    const volume = parseOptionalInt(params.get('volume'));
    const number = parseOptionalInt(params.get('number'));
    if (volume !== null && number !== null) {
      const entry = entryForVolumeNumber(entries, volume, number);
      if (entry) return { entry, mode: 'volume-number' };
    }

    const year = parseOptionalInt(params.get('year'));
    const month = parseOptionalInt(params.get('month'));
    if (year !== null && month !== null) {
      const entry = entryForYearMonth(entries, year, month);
      if (entry) return { entry, mode: 'month-year' };
    }

    return null;
  }

  private async writeQueryCuid(cuid: string | null): Promise<void> {
    this.syncingQuery = true;
    try {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: cuid ? { cuid } : {},
        replaceUrl: true,
      });
    } finally {
      this.syncingQuery = false;
    }
  }

  private async resolveSelectedFile(filePath: string | null): Promise<void> {
    const generation = ++this.resolveGeneration;
    this.revokeObjectUrl();
    this.resolvedFileUrl.set(null);
    if (filePath === null) return;

    const objectUrl = await this.fileResolve(filePath);
    if (generation !== this.resolveGeneration) {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
      return;
    }
    this.objectUrlToRevoke = objectUrl;
    this.resolvedFileUrl.set(objectUrl);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrlToRevoke !== null) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }

  labelForMonth(month: number): string {
    return monthLabel(month);
  }

  // @relation(GSSC-PLLR-222, scope=range_start, role=Implementation)
  setSelectionMode(mode: NewsletterSelectionMode): void {
    this.selectionMode.set(mode);
  }
  // @relation(GSSC-PLLR-222, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-210, scope=range_start, role=Implementation)
  onVolumeChange(volumeValue: string): void {
    const volume = Number(volumeValue);
    if (!Number.isInteger(volume)) return;
    const numbers = numbersForVolume(this.catalog(), volume);
    const current = this.selectedNumber();
    const number = numbers.includes(current ?? -1)
      ? (current as number)
      : (numbers[numbers.length - 1] ?? numbers[0]);
    if (number === undefined) {
      this.selectedCuid.set(null);
      return;
    }
    const entry = entryForVolumeNumber(this.catalog(), volume, number);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-210, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-213, scope=range_start, role=Implementation)
  onNumberChange(numberValue: string): void {
    const number = Number(numberValue);
    if (!Number.isInteger(number)) return;
    const volume = this.selectedVolume();
    if (volume === null) return;
    const entry = entryForVolumeNumber(this.catalog(), volume, number);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-213, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-219, scope=range_start, role=Implementation)
  onYearChange(yearValue: string): void {
    const year = Number(yearValue);
    if (!Number.isInteger(year)) return;
    const months = monthsForYear(this.catalog(), year);
    const current = this.selectedMonth();
    const month = months.includes(current ?? -1)
      ? (current as number)
      : (months[months.length - 1] ?? months[0]);
    if (month === undefined) {
      this.selectedCuid.set(null);
      return;
    }
    const entry = entryForYearMonth(this.catalog(), year, month);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-219, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-216, scope=range_start, role=Implementation)
  onMonthChange(monthValue: string): void {
    const month = Number(monthValue);
    if (!Number.isInteger(month)) return;
    const year = this.selectedYear();
    if (year === null) return;
    const entry = entryForYearMonth(this.catalog(), year, month);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-216, scope=range_end, role=Implementation)
}
// @relation(GSSC-PLLR-14, scope=range_end, role=Implementation)
