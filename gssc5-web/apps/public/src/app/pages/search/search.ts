import {
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  labelForSearchKind,
  PUBLIC_SEARCH_KINDS,
  SEARCH_PAGE_LIMIT,
  SITE_SEARCH_GET,
  type PublicSearchKind,
  type SiteSearchResult,
} from '../../services/site-search/site-search';

/**
 * Public Search Page (GSSC5-47): query + kind filter + results from
 * GET /search?frontend=public.
 */
@Component({
  selector: 'gssc-search-page',
  imports: [RouterLink],
  templateUrl: './search.html',
})
export class SearchPage implements OnDestroy {
  private readonly searchGet = inject(SITE_SEARCH_GET);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sub = new Subscription();

  readonly kindOptions = PUBLIC_SEARCH_KINDS;
  readonly labelForKind = labelForSearchKind;

  readonly query = signal('');
  readonly kind = signal<PublicSearchKind | ''>('');
  readonly results = signal<SiteSearchResult[]>([]);
  /** True when site search retrieval failed (null); distinct from empty match. */
  readonly loadError = signal(false);

  constructor() {
    this.sub.add(
      this.route.queryParamMap.subscribe((params) => {
        const q = (params.get('q') ?? '').trim();
        const kindRaw = (params.get('kind') ?? '').trim();
        const kind = this.parseKind(kindRaw);
        this.query.set(q);
        this.kind.set(kind);
        void this.loadResults(q, kind);
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // @relation(GSSC-PLLR-366, GSSC-PLLR-369, scope=range_start, role=Implementation)
  protected onQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
  }

  protected onKindChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.kind.set(this.parseKind(value));
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    void this.navigateWithFilters();
  }

  protected applyFilters(): void {
    void this.navigateWithFilters();
  }
  // @relation(GSSC-PLLR-366, GSSC-PLLR-369, scope=range_end, role=Implementation)

  private async navigateWithFilters(): Promise<void> {
    const q = this.query().trim();
    const kind = this.kind();
    const queryParams: Record<string, string> = {};
    if (q.length > 0) queryParams['q'] = q;
    if (kind) queryParams['kind'] = kind;
    await this.router.navigate(['/search'], { queryParams });
  }

  // @relation(GSSC-PLLR-363, scope=range_start, role=Implementation)
  private async loadResults(
    q: string,
    kind: PublicSearchKind | '',
  ): Promise<void> {
    if (q.length === 0) {
      this.results.set([]);
      this.loadError.set(false);
      return;
    }
    const entries = await this.searchGet({
      q,
      limit: SEARCH_PAGE_LIMIT,
      kind,
    });
    if (entries === null) {
      this.results.set([]);
      this.loadError.set(true);
      return;
    }
    this.loadError.set(false);
    this.results.set(entries);
  }
  // @relation(GSSC-PLLR-363, scope=range_end, role=Implementation)

  private parseKind(raw: string): PublicSearchKind | '' {
    return (PUBLIC_SEARCH_KINDS as readonly string[]).includes(raw)
      ? (raw as PublicSearchKind)
      : '';
  }
}
