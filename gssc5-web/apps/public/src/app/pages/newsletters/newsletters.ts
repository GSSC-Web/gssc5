import {
  Component,
  computed,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { backend } from '../../services/backend';
import {
  catalogYears,
  currentYearEntries,
  entryForYearMonth,
  entryLabel,
  issueFileUrl,
  monthLabel,
  monthsForYear,
  mostRecentEntry,
  searchOlderCatalog,
  yearFromTags,
  monthFromTags,
  type NewsletterCatalogEntry,
} from './newsletter-catalog';

export type NewsletterCatalogListGet = () => Promise<NewsletterCatalogEntry[]>;

/** Default Unified Backend public newsletter catalog list. */
export const NEWSLETTER_CATALOG_GET = new InjectionToken<NewsletterCatalogListGet>(
  'NEWSLETTER_CATALOG_GET',
  {
    providedIn: 'root',
    factory: () => defaultNewsletterCatalogGet,
  },
);

/** Injectable current calendar year so tests can freeze it. */
export const NEWSLETTER_CURRENT_YEAR = new InjectionToken<number>(
  'NEWSLETTER_CURRENT_YEAR',
  {
    providedIn: 'root',
    factory: () => new Date().getFullYear(),
  },
);

async function defaultNewsletterCatalogGet(): Promise<NewsletterCatalogEntry[]> {
  try {
    const result = await backend.sections.get({ query: { tag: 'newsletter' } });
    if (result.error || result.data === null || result.data === undefined) {
      return [];
    }
    // List payload omits resources; map with empty resources until selection needs detail.
    // Page selection uses list rows enriched via optional detail — for public catalog,
    // request full rows by fetching each detail when resources are required.
    const list = result.data;
    const detailed = await Promise.all(
      list.map(async (row) => {
        try {
          const detail = await backend.sections({ cuid: row.cuid }).get();
          if (detail.error || !detail.data) {
            return {
              cuid: row.cuid,
              header: row.header,
              body: row.body,
              resources: [] as string[],
              tags: row.tags,
              index: row.index,
            };
          }
          return {
            cuid: detail.data.cuid,
            header: detail.data.header,
            body: detail.data.body,
            resources: detail.data.resources,
            tags: detail.data.tags,
            index: detail.data.index,
          };
        } catch {
          return {
            cuid: row.cuid,
            header: row.header,
            body: row.body,
            resources: [] as string[],
            tags: row.tags,
            index: row.index,
          };
        }
      }),
    );
    return detailed;
  } catch {
    return [];
  }
}

// @relation(GSSC-PLLR-14, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-newsletters-page',
  templateUrl: './newsletters.html',
})
export class NewslettersPage {
  private readonly catalogGet = inject(NEWSLETTER_CATALOG_GET);
  private readonly sanitizer = inject(DomSanitizer);
  readonly currentYear = inject(NEWSLETTER_CURRENT_YEAR);

  readonly catalog = signal<NewsletterCatalogEntry[]>([]);
  readonly selectedCuid = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly selected = computed(() => {
    const cuid = this.selectedCuid();
    if (cuid === null) return null;
    return this.catalog().find((entry) => entry.cuid === cuid) ?? null;
  });

  // @relation(GSSC-PLLR-213, scope=range_start, role=Implementation)
  readonly volumeYears = computed(() => catalogYears(this.catalog()));
  // @relation(GSSC-PLLR-213, scope=range_end, role=Implementation)

  readonly selectedYear = computed(() => {
    const entry = this.selected();
    if (entry) return yearFromTags(entry.tags) ?? this.currentYear;
    return this.currentYear;
  });

  // @relation(GSSC-PLLR-216, scope=range_start, role=Implementation)
  readonly numberMonths = computed(() =>
    monthsForYear(this.catalog(), this.selectedYear()),
  );
  // @relation(GSSC-PLLR-216, scope=range_end, role=Implementation)

  readonly selectedMonth = computed(() => {
    const entry = this.selected();
    return entry ? monthFromTags(entry.tags) : null;
  });

  // @relation(GSSC-PLLR-210, scope=range_start, role=Implementation)
  readonly currentYearList = computed(() =>
    currentYearEntries(this.catalog(), this.currentYear),
  );
  // @relation(GSSC-PLLR-210, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-225, scope=range_start, role=Implementation)
  readonly searchResults = computed(() =>
    searchOlderCatalog(this.catalog(), this.currentYear, this.searchQuery()),
  );
  // @relation(GSSC-PLLR-225, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-219, GSSC-PLLR-222, scope=range_start, role=Implementation)
  readonly selectedFileUrl = computed(() => issueFileUrl(this.selected()));

  readonly previewSafeUrl = computed((): SafeResourceUrl | null => {
    const url = this.selectedFileUrl();
    return url === null ? null : this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
  // @relation(GSSC-PLLR-219, GSSC-PLLR-222, scope=range_end, role=Implementation)

  constructor() {
    void this.loadCatalog();
  }

  // @relation(GSSC-PLLR-207, scope=range_start, role=Implementation)
  private async loadCatalog(): Promise<void> {
    const entries = await this.catalogGet();
    this.catalog.set(entries);
    const newest = mostRecentEntry(entries);
    this.selectedCuid.set(newest?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-207, scope=range_end, role=Implementation)

  labelFor(entry: NewsletterCatalogEntry): string {
    return entryLabel(entry);
  }

  labelForMonth(month: number): string {
    return monthLabel(month);
  }

  selectEntry(entry: NewsletterCatalogEntry): void {
    this.selectedCuid.set(entry.cuid);
  }

  // @relation(GSSC-PLLR-213, scope=range_start, role=Implementation)
  onVolumeChange(yearValue: string): void {
    const year = Number(yearValue);
    if (!Number.isFinite(year)) return;
    const months = monthsForYear(this.catalog(), year);
    const month = months.includes(this.selectedMonth() ?? -1)
      ? (this.selectedMonth() as number)
      : (months[months.length - 1] ?? months[0]);
    if (month === undefined) {
      this.selectedCuid.set(null);
      return;
    }
    const entry = entryForYearMonth(this.catalog(), year, month);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-213, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-216, scope=range_start, role=Implementation)
  onNumberChange(monthValue: string): void {
    const month = Number(monthValue);
    if (!Number.isFinite(month)) return;
    const entry = entryForYearMonth(this.catalog(), this.selectedYear(), month);
    this.selectedCuid.set(entry?.cuid ?? null);
  }
  // @relation(GSSC-PLLR-216, scope=range_end, role=Implementation)

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }
}
// @relation(GSSC-PLLR-14, scope=range_end, role=Implementation)
