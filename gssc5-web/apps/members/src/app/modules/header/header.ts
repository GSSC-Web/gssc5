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
import { MemberSession } from '../../services/member-session';
import { SocietyContact } from '../../services/society-contact/society-contact';
import {
  SiteTree,
  type SiteTreeNavNode,
} from '../../services/site-tree/site-tree';

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
  private readonly siteTree = inject(SiteTree);
  private readonly router = inject(Router);
  protected readonly societyContact = inject(SocietyContact);

  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;
  readonly searchOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly chromeTier = signal<HeaderChromeTier>('wide');
  readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  readonly navItems = this.siteTree.navItems;

  private readonly probe = viewChild<ElementRef<HTMLElement>>('navProbe');
  private readonly chromeHost =
    viewChild<ElementRef<HTMLElement>>('chromeHost');
  private resizeObserver: ResizeObserver | null = null;
  private mediaQuery: MediaQueryList | null = null;

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
  }

  /**
   * Session end Implementation owned by MemberSession.logout (GSSC-MLLR-26).
   * Explicit Header logout navigates to login without a return-path query
   * (GSSC-MLLR-93).
   */
  // @relation(GSSC-MLLR-93, scope=range_start, role=Implementation)
  protected async logout(): Promise<void> {
    const ended = await this.memberSession.logout();
    if (ended) {
      await this.router.navigateByUrl('/login');
    }
  }
  // @relation(GSSC-MLLR-93, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-459, scope=range_start, role=Implementation)
  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.searchOpen()) this.closeSearch();
    if (this.menuOpen()) this.closeMenu();
  }
  // @relation(GSSC-MLLR-459, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-450, scope=range_start, role=Implementation)
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.expandedIds.set(new Set());
  }
  // @relation(GSSC-MLLR-450, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-453, scope=range_start, role=Implementation)
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
  // @relation(GSSC-MLLR-453, scope=range_end, role=Implementation)

  protected hasChildren(item: SiteTreeNavNode): boolean {
    return (item.children?.length ?? 0) > 0;
  }

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

  // @relation(GSSC-MHLR-83, GSSC-MLLR-15, scope=range_start, role=Implementation)
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

    // Wide when the nowrap probe fits the host; otherwise mid (hamburger).
    const fits = probe.scrollWidth <= host.clientWidth;
    const next: HeaderChromeTier = fits ? 'wide' : 'mid';
    this.chromeTier.set(next);
    if (next === 'wide') this.closeMenu();
  }
  // @relation(GSSC-MHLR-83, GSSC-MLLR-15, scope=range_end, role=Implementation)
}
