import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { resolveStoredFileObjectUrl } from '../../services/files-api';

/** One resource linked from Section Contents (FE presentation; no Contents API). */
export type SectionResource = {
  name: string;
  href: string;
};

/** Featured-image side from page_data / section payloads. */
export type SectionImagePosition = 'none' | 'left' | 'right';

/** Section data placed by the Section Container. */
export type SectionContents = {
  header?: string | null;
  body: string;
  resources?: readonly SectionResource[] | null;
  imageFile?: string | null;
  imagePosition?: SectionImagePosition | null;
};

export type SectionFeaturedImageResolve = (imageFile: string) => Promise<string | null>;

/** Default: credentialed GET /files/{cuid} (StoredFileEntry), matching newsletters. */
export const SECTION_FEATURED_IMAGE_RESOLVE = new InjectionToken<SectionFeaturedImageResolve>(
  'SECTION_FEATURED_IMAGE_RESOLVE',
  {
    providedIn: 'root',
    factory: () => defaultSectionFeaturedImageResolve,
  },
);

async function defaultSectionFeaturedImageResolve(imageFile: string): Promise<string | null> {
  return resolveStoredFileObjectUrl(imageFile);
}

/** Matches `.gssc-section__resource` fit-mode width (`w-[8.5rem]` at 16px root). */
export const RESOURCE_BUTTON_WIDTH_PX = 8.5 * 16;
/** Matches Tailwind `gap-2` between Resource Buttons. */
export const RESOURCE_BUTTON_GAP_PX = 0.5 * 16;
/**
 * Reserved width for Prev + Next + gaps so enabling carousel chrome does not
 * oscillate overflow detection.
 */
/** Prev + Next icon controls (size-8 each) plus gaps. */
export const RESOURCE_ARROW_CHROME_RESERVE_PX = 80;

@Component({
  selector: 'gssc-section',
  templateUrl: './section.html',
})
export class Section {
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageResolve = inject(SECTION_FEATURED_IMAGE_RESOLVE);
  private readonly resourcesHost = viewChild<ElementRef<HTMLElement>>('resourcesHost');
  private resizeObserver: ResizeObserver | null = null;
  private observedHost: HTMLElement | null = null;
  private imageLoadGeneration = 0;
  private objectUrlToRevoke: string | null = null;

  /** Section Contents supplied by the page (no Contents API in this task). */
  readonly contents = input.required<SectionContents>();

  /** Index of the first visible resource in the carousel strip. */
  readonly carouselOffset = signal(0);

  /** True when the resource strip overflows the Section width. */
  readonly isCarousel = signal(false);

  /** How many Resource Buttons fit in the carousel viewport (all of them when not carousel). */
  readonly visibleSlotCount = signal(0);

  /**
   * Equal Resource Button width in carousel mode (CSS px), sized so `visibleSlotCount`
   * buttons fill the viewport between Prev/Next. `0` when not a carousel.
   */
  readonly carouselButtonWidthPx = signal(0);

  /**
   * Test/harness override for the resources container width in CSS pixels.
   * `null` uses the live element `clientWidth`.
   */
  readonly containerWidthOverride = signal<number | null>(null);

  /** Resolved object URL for the featured image when shown. */
  readonly featuredImageUrl = signal<string | null>(null);

  readonly resources = computed(() => this.contents().resources ?? []);

  /**
   * Track contents: full strip, doubled in carousel mode so a wrap window
   * (last + first) can sit under the viewport without replace-in-place.
   */
  readonly trackResources = computed(() => {
    const all = this.resources();
    if (all.length === 0) return [];
    if (!this.isCarousel()) return [...all];
    return [...all, ...all];
  });

  /** Logical visible window (for callers/tests); DOM slides via transform. */
  readonly visibleResources = computed(() => {
    const all = this.resources();
    if (all.length === 0) return [];
    if (!this.isCarousel()) return [...all];
    const slots = Math.max(1, this.visibleSlotCount());
    const start = ((this.carouselOffset() % all.length) + all.length) % all.length;
    const visible: SectionResource[] = [];
    for (let i = 0; i < Math.min(slots, all.length); i += 1) {
      visible.push(all[(start + i) % all.length]!);
    }
    return visible;
  });

  /** Pixel `translateX` for the resource track; animates via CSS transition (GSSC-MLLR-109). */
  readonly trackTransform = computed(() => {
    if (!this.isCarousel()) return 'none';
    const offset = this.carouselOffset();
    if (offset === 0) return 'none';
    const buttonW = this.carouselButtonWidthPx();
    if (buttonW <= 0) return 'none';
    const stride = buttonW + RESOURCE_BUTTON_GAP_PX;
    return `translateX(-${offset * stride}px)`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.observedHost = null;
      this.revokeObjectUrl();
    });

    effect(() => {
      const contents = this.contents();
      void this.resolveFeaturedImage(contents);
    });

    afterRenderEffect(() => {
      // Re-bind observer and re-measure whenever the host exists or Contents / width override change.
      const host = this.resourcesHost()?.nativeElement ?? null;
      this.resources();
      this.containerWidthOverride();
      this.bindResizeObserver(host);
      this.remeasureFromLayout();
    });
  }

  protected hasHeader(contents: SectionContents): boolean {
    return contents.header != null && contents.header.length > 0;
  }

  protected hasResources(contents: SectionContents): boolean {
    return (contents.resources?.length ?? 0) > 0;
  }

  /** True when Contents request a side image and a resolved URL is ready. */
  protected showFeaturedImage(): boolean {
    return this.wantsFeaturedImage(this.contents()) && this.featuredImageUrl() != null;
  }

  private wantsFeaturedImage(contents: SectionContents): boolean {
    const position = contents.imagePosition;
    const file = contents.imageFile;
    if (position !== 'left' && position !== 'right') return false;
    return file != null && file.length > 0;
  }

  private async resolveFeaturedImage(contents: SectionContents): Promise<void> {
    const generation = ++this.imageLoadGeneration;
    if (!this.wantsFeaturedImage(contents)) {
      this.revokeObjectUrl();
      this.featuredImageUrl.set(null);
      return;
    }
    const file = contents.imageFile!;
    const url = await this.imageResolve(file);
    if (generation !== this.imageLoadGeneration) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      return;
    }
    this.revokeObjectUrl();
    if (url?.startsWith('blob:')) this.objectUrlToRevoke = url;
    this.featuredImageUrl.set(url);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrlToRevoke != null) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }

  /** Recompute overflow carousel state from container width and equal button sizes. */
  remeasureFromLayout(): void {
    const all = this.resources();
    const n = all.length;
    if (n === 0) {
      this.isCarousel.set(false);
      this.visibleSlotCount.set(0);
      this.carouselOffset.set(0);
      this.carouselButtonWidthPx.set(0);
      return;
    }

    const buttonW = RESOURCE_BUTTON_WIDTH_PX;
    const gap = RESOURCE_BUTTON_GAP_PX;
    const contentW = n * buttonW + (n - 1) * gap;
    const host = this.resourcesHost()?.nativeElement;
    const width = this.containerWidthOverride() ?? host?.clientWidth ?? 0;

    if (width <= 0) {
      // Not laid out yet (or jsdom without override): show the full strip.
      this.isCarousel.set(false);
      this.visibleSlotCount.set(n);
      this.carouselOffset.set(0);
      this.carouselButtonWidthPx.set(0);
      return;
    }

    if (contentW <= width) {
      this.isCarousel.set(false);
      this.visibleSlotCount.set(n);
      this.carouselOffset.set(0);
      this.carouselButtonWidthPx.set(0);
      return;
    }

    const viewportW = Math.max(buttonW, width - RESOURCE_ARROW_CHROME_RESERVE_PX);
    const slots = Math.max(1, Math.floor((viewportW + gap) / (buttonW + gap)));
    if (slots >= n) {
      this.isCarousel.set(false);
      this.visibleSlotCount.set(n);
      this.carouselOffset.set(0);
      this.carouselButtonWidthPx.set(0);
      return;
    }

    this.isCarousel.set(true);
    this.visibleSlotCount.set(slots);
    const filledButtonW = (viewportW - (slots - 1) * gap) / slots;
    this.carouselButtonWidthPx.set(filledButtonW);
    const maxOffset = n;
    if (this.carouselOffset() >= maxOffset) this.carouselOffset.set(0);
  }

  // @relation(GSSC-MLLR-114, scope=range_start, role=Implementation)
  stepPrev(): void {
    if (!this.isCarousel()) return;
    const total = this.resources().length;
    this.carouselOffset.update((offset) => (offset - 1 + total) % total);
  }
  // @relation(GSSC-MLLR-114, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-117, scope=range_start, role=Implementation)
  stepNext(): void {
    if (!this.isCarousel()) return;
    const total = this.resources().length;
    this.carouselOffset.update((offset) => (offset + 1) % total);
  }
  // @relation(GSSC-MLLR-117, scope=range_end, role=Implementation)

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.isCarousel()) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('gssc-section__resource')) return;

    const key = event.key;
    if (key === 'ArrowLeft' || key === 'h' || key === 'H') {
      event.preventDefault();
      this.stepPrev();
    } else if (key === 'ArrowRight' || key === 'l' || key === 'L') {
      event.preventDefault();
      this.stepNext();
    }
  }

  private bindResizeObserver(host: HTMLElement | null): void {
    if (host === this.observedHost) return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedHost = host;
    if (!host || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.remeasureFromLayout();
    });
    this.resizeObserver.observe(host);
  }
}
