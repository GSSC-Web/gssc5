import {
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MemberSession } from '../../services/member-session';
import { MembersApp } from '../../services/members-app';
import { SocietyContact } from '../../services/society-contact/society-contact';
import {
  SEARCH_OVERLAY_LIMIT,
  SITE_SEARCH_GET,
  type SiteSearchResult,
} from '../../services/site-search/site-search';
import {
  SiteTree,
  type SiteTreeNavNode,
} from '../../services/site-tree/site-tree';
import { ThemeMode } from '../../services/theme-mode/theme-mode';

/** Viewport width at and below which narrow chrome is used (Tailwind `sm`). */
export const NARROW_CHROME_MAX_WIDTH_PX = 639;

export type HeaderChromeTier = 'wide' | 'mid' | 'narrow';

@Component({
  selector: 'gssc-header',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  private readonly memberSession = inject(MemberSession);
  private readonly membersApp = inject(MembersApp);
  private readonly contactOverlay = inject(ContactOverlay);
  private readonly siteTree = inject(SiteTree);
  private readonly siteSearchGet = inject(SITE_SEARCH_GET);
  private readonly router = inject(Router);
  protected readonly societyContact = inject(SocietyContact);
  readonly themeMode = inject(ThemeMode);

  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;
  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly quickResults = signal<SiteSearchResult[]>([]);
  readonly menuOpen = signal(false);
  readonly chromeTier = signal<HeaderChromeTier>('wide');
  readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  readonly navItems = this.siteTree.navItems;

  private readonly probe = viewChild<ElementRef<HTMLElement>>('navProbe');
  private readonly chromeHost =
    viewChild<ElementRef<HTMLElement>>('chromeHost');
  private resizeObserver: ResizeObserver | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private quickSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private quickSearchSeq = 0;

  constructor() {
    afterNextRender(() => {
      this.installChromeObservers();
      this.recomputeChromeTier();
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.societyContact.refresh(), this.siteTree.refresh()]);
    this.recomputeChromeTier();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mediaQuery?.removeEventListener('change', this.onViewportChange);
    if (this.quickSearchTimer !== null) clearTimeout(this.quickSearchTimer);
  }

  // @relation(GSSC-PLLR-55, GSSC-PLLR-58, scope=range_start, role=Implementation)
  protected openMembersApp(): void {
    this.membersApp.navigate();
  }
  // @relation(GSSC-PLLR-55, GSSC-PLLR-58, scope=range_end, role=Implementation)

  /** Session end Implementation owned by MemberSession.logout (GSSC-PLLR-64). */
  protected async logout(): Promise<void> {
    await this.memberSession.logout();
  }

  // @relation(GSSC-PLLR-67, scope=range_start, role=Implementation)
  protected openContact(): void {
    this.contactOverlay.open();
  }
  // @relation(GSSC-PLLR-67, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-391, GSSC-PLLR-392, scope=range_start, role=Implementation)
  protected toggleTheme(): void {
    this.themeMode.toggle();
  }

  protected themeToggleLabel(): string {
    return this.themeMode.mode() === 'dark'
      ? 'Switch to light mode'
      : 'Switch to dark mode';
  }
  // @relation(GSSC-PLLR-391, GSSC-PLLR-392, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-70, scope=range_start, role=Implementation)
  protected toggleSearch(): void {
    this.searchOpen.update((open) => {
      const next = !open;
      if (!next) this.resetSearchOverlay();
      return next;
    });
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.resetSearchOverlay();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.searchOpen()) this.closeSearch();
    if (this.menuOpen()) this.closeMenu();
  }
  // @relation(GSSC-PLLR-70, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-354, GSSC-PLLR-357, scope=range_start, role=Implementation)
  protected onSearchQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.scheduleQuickSearch(value);
  }

  protected submitOverlaySearch(event: Event): void {
    event.preventDefault();
    const q = this.searchQuery().trim();
    void this.router.navigate(['/search'], {
      queryParams: q.length > 0 ? { q } : {},
    });
    this.closeSearch();
  }

  protected onQuickResultNavigate(): void {
    this.closeSearch();
  }

  private resetSearchOverlay(): void {
    this.searchQuery.set('');
    this.quickResults.set([]);
    if (this.quickSearchTimer !== null) {
      clearTimeout(this.quickSearchTimer);
      this.quickSearchTimer = null;
    }
  }

  private scheduleQuickSearch(raw: string): void {
    if (this.quickSearchTimer !== null) clearTimeout(this.quickSearchTimer);
    this.quickSearchTimer = setTimeout(() => {
      this.quickSearchTimer = null;
      void this.runQuickSearch(raw);
    }, 200);
  }

  private async runQuickSearch(raw: string): Promise<void> {
    const q = raw.trim();
    const seq = ++this.quickSearchSeq;
    if (q.length === 0) {
      this.quickResults.set([]);
      return;
    }
    const entries = await this.siteSearchGet({
      q,
      limit: SEARCH_OVERLAY_LIMIT,
    });
    if (seq !== this.quickSearchSeq) return;
    this.quickResults.set(entries ?? []);
  }
  // @relation(GSSC-PLLR-354, GSSC-PLLR-357, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-338, scope=range_start, role=Implementation)
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.expandedIds.set(new Set());
  }
  // @relation(GSSC-PLLR-338, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-341, scope=range_start, role=Implementation)
  protected toggleExpanded(cuid: string): void {
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (next.has(cuid)) next.delete(cuid);
      else next.add(cuid);
      return next;
    });
  }

  isExpanded(cuid: string): boolean {
    return this.expandedIds().has(cuid);
  }
  // @relation(GSSC-PLLR-341, scope=range_end, role=Implementation)

  protected hasChildren(item: SiteTreeNavNode): boolean {
    return (item.children?.length ?? 0) > 0;
  }

  /** Equal item columns with auto divider tracks between them (GSSC5-121 / GSSC5-137). */
  protected wideNavGridColumns(): string {
    const count = this.navItems().length;
    if (count <= 0) return 'none';
    if (count === 1) return 'minmax(0, 1fr)';
    const tracks: string[] = [];
    for (let i = 0; i < count; i++) {
      tracks.push('minmax(0, 1fr)');
      if (i < count - 1) tracks.push('auto');
    }
    return tracks.join(' ');
  }

  // @relation(GSSC-PLLR-336, scope=range_start, role=Implementation)
  /** Top-level submenu cuids that end-align to stay in the viewport. */
  readonly topSubmenuAlignEnd = signal<ReadonlySet<string>>(new Set());
  /** Nested submenu cuids that open toward the start to stay in the viewport. */
  readonly nestedOpenTowardStart = signal<ReadonlySet<string>>(new Set());

  protected isTopSubmenuAlignEnd(cuid: string): boolean {
    return this.topSubmenuAlignEnd().has(cuid);
  }

  protected isNestedOpenTowardStart(cuid: string): boolean {
    return this.nestedOpenTowardStart().has(cuid);
  }

  protected onTopSubmenuPlace(event: Event, item: SiteTreeNavNode): void {
    if (!this.hasChildren(item) || typeof window === 'undefined') return;
    const cluster = event.currentTarget as HTMLElement | null;
    const submenu = cluster?.querySelector<HTMLElement>(
      ':scope > .gssc-header__submenu',
    );
    if (!cluster || !submenu) return;
    const width = this.submenuMeasureWidth(submenu);
    const startRight = cluster.getBoundingClientRect().left + width;
    this.setCuidFlag(this.topSubmenuAlignEnd, item.cuid, startRight > window.innerWidth);
  }

  protected onNestedSubmenuPlace(event: Event, child: SiteTreeNavNode): void {
    if (!this.hasChildren(child) || typeof window === 'undefined') return;
    const host = event.currentTarget as HTMLElement | null;
    const nested = host?.querySelector<HTMLElement>(
      '.gssc-header__submenu--nested',
    );
    if (!host || !nested) return;
    const width = this.submenuMeasureWidth(nested);
    const endRight = host.getBoundingClientRect().right + width;
    this.setCuidFlag(
      this.nestedOpenTowardStart,
      child.cuid,
      endRight > window.innerWidth,
    );
  }

  private submenuMeasureWidth(el: HTMLElement): number {
    const measured = Math.max(el.offsetWidth, el.scrollWidth);
    // min-w-44 (11rem) fallback when the closed overlay has not laid out yet.
    return measured > 0 ? measured : 176;
  }

  private setCuidFlag(
    store: ReturnType<typeof signal<ReadonlySet<string>>>,
    cuid: string,
    enabled: boolean,
  ): void {
    const current = store();
    if (current.has(cuid) === enabled) return;
    const next = new Set(current);
    if (enabled) next.add(cuid);
    else next.delete(cuid);
    store.set(next);
  }
  // @relation(GSSC-PLLR-336, scope=range_end, role=Implementation)

  // @relation(GSSC-PHLR-154, GSSC-PLLR-396, GSSC-PLLR-397, GSSC-PLLR-398, scope=range_start, role=Implementation)
  readonly safeTrianglePath = signal<string | null>(null);
  readonly safeTriangleCuid = signal<string | null>(null);

  protected onNestedBridgeMove(
    event: MouseEvent,
    child: SiteTreeNavNode,
  ): void {
    if (!this.hasChildren(child)) {
      this.clearSafeTriangle();
      return;
    }
    const host = event.currentTarget as HTMLElement | null;
    const nested = host?.querySelector<HTMLElement>(
      '.gssc-header__submenu--nested',
    );
    if (!host || !nested) {
      this.clearSafeTriangle();
      return;
    }
    this.onNestedSubmenuPlace(event, child);
    const nestedRect = nested.getBoundingClientRect();
    if (nestedRect.width <= 0 || nestedRect.height <= 0) {
      this.clearSafeTriangle();
      return;
    }
    const hostRect = host.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    // Near vertical edge of the nested panel (host side), including before CD applies flip classes.
    const nearX = this.isNestedOpenTowardStart(child.cuid)
      ? hostRect.left
      : hostRect.right;
    const path = `M ${x} ${y} L ${nearX} ${nestedRect.top} L ${nearX} ${nestedRect.bottom} Z`;
    this.safeTriangleCuid.set(child.cuid);
    this.safeTrianglePath.set(path);
  }

  protected onNestedBridgeLeave(child: SiteTreeNavNode): void {
    if (this.safeTriangleCuid() === child.cuid) this.clearSafeTriangle();
  }

  private clearSafeTriangle(): void {
    this.safeTriangleCuid.set(null);
    this.safeTrianglePath.set(null);
  }
  // @relation(GSSC-PHLR-154, GSSC-PLLR-396, GSSC-PLLR-397, GSSC-PLLR-398, scope=range_end, role=Implementation)

  /** Test / harness hook to force a chrome tier without resize geometry. */
  setChromeTierForTest(tier: HeaderChromeTier): void {
    this.chromeTier.set(tier);
    if (tier === 'wide') this.closeMenu();
  }

  private readonly onViewportChange = (): void => {
    this.recomputeChromeTier();
  };

  private installChromeObservers(): void {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia(
        `(max-width: ${NARROW_CHROME_MAX_WIDTH_PX}px)`,
      );
      this.mediaQuery.addEventListener('change', this.onViewportChange);
    }

    const host = this.chromeHost()?.nativeElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.recomputeChromeTier());
      this.resizeObserver.observe(host);
    }
  }

  // @relation(GSSC-PHLR-139, GSSC-PLLR-47, scope=range_start, role=Implementation)
  private recomputeChromeTier(): void {
    if (typeof window === 'undefined') return;
    if (window.innerWidth <= NARROW_CHROME_MAX_WIDTH_PX) {
      this.chromeTier.set('narrow');
      return;
    }

    const probe = this.probe()?.nativeElement;
    const host = this.chromeHost()?.nativeElement;
    if (!probe || !host) {
      this.chromeTier.set('wide');
      return;
    }

    // Wide when equal-grid nowrap cells fit: host >= n × max label width.
    const items = probe.querySelectorAll<HTMLElement>(
      '.gssc-header__nav-probe-item',
    );
    const count = items.length;
    let maxWidth = 0;
    for (const item of items) {
      maxWidth = Math.max(maxWidth, item.scrollWidth);
    }
    const fits =
      count === 0 || maxWidth * count <= host.clientWidth;
    const next: HeaderChromeTier = fits ? 'wide' : 'mid';
    this.chromeTier.set(next);
    if (next === 'wide') this.closeMenu();
  }
  // @relation(GSSC-PHLR-139, GSSC-PLLR-47, scope=range_end, role=Implementation)
}
