import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PAGE_SEARCH_LIMIT,
  SITE_SEARCH_GET,
  SITE_SEARCH_KINDS,
  type SiteSearchKind,
  type SiteSearchResult,
} from '../../services/site-search/site-search';

/**
 * Members Site Search page (GSSC5-109): query + kind filter against
 * GET /search?frontend=members, distinct from Directory Search (GSSC5-92).
 */
@Component({
  selector: 'gssc-search-page',
  imports: [RouterLink],
  templateUrl: './search.html',
})
export class SearchPage implements OnInit {
  private readonly searchGet = inject(SITE_SEARCH_GET);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private loadGeneration = 0;

  readonly kindOptions = SITE_SEARCH_KINDS;
  readonly query = signal('');
  readonly kind = signal<SiteSearchKind | ''>('');
  readonly results = signal<SiteSearchResult[]>([]);
  /** True when site search retrieval failed (null); distinct from empty match. */
  readonly loadError = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.query.set(params.get('q') ?? '');
    const kindParam = params.get('kind') ?? '';
    this.kind.set(
      (SITE_SEARCH_KINDS as readonly string[]).includes(kindParam)
        ? (kindParam as SiteSearchKind)
        : '',
    );
    void this.reload();
  }

  // @relation(GSSC-MLLR-474, GSSC-MLLR-477, GSSC-MLLR-471, scope=range_start, role=Implementation)
  protected onQueryInput(value: string): void {
    this.query.set(value);
  }

  protected onKindChange(value: string): void {
    this.kind.set(
      (SITE_SEARCH_KINDS as readonly string[]).includes(value)
        ? (value as SiteSearchKind)
        : '',
    );
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await this.router.navigate(['/search'], {
      queryParams: {
        q: this.query().trim() || null,
        kind: this.kind() || null,
      },
    });
    await this.reload();
  }
  // @relation(GSSC-MLLR-474, GSSC-MLLR-477, GSSC-MLLR-471, scope=range_end, role=Implementation)

  private async reload(): Promise<void> {
    const generation = ++this.loadGeneration;
    const q = this.query().trim();
    // @relation(GSSC-MLLR-471, scope=range_start, role=Implementation)
    if (q.length === 0) {
      if (generation === this.loadGeneration) {
        this.results.set([]);
        this.loadError.set(false);
      }
      return;
    }
    const rows = await this.searchGet({
      q,
      limit: PAGE_SEARCH_LIMIT,
      ...(this.kind() ? { kind: this.kind() } : {}),
    });
    if (generation !== this.loadGeneration) return;
    if (rows === null) {
      this.results.set([]);
      this.loadError.set(true);
      return;
    }
    this.loadError.set(false);
    this.results.set(rows);
    // @relation(GSSC-MLLR-471, scope=range_end, role=Implementation)
  }
}
