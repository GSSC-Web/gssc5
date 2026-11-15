import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  SECTION_FEATURED_IMAGE_RESOLVE,
  type SectionImagePosition,
} from '../section/section';

/** One carousel item (page-data / announcement shape; no new endpoints). */
export type CarouselItem = {
  /** Optional id (e.g. announcement cuid) for focused-slide deep links. */
  id?: string | null;
  header?: string | null;
  body: string;
  /** Each string is both link label and href (same as Section From CUID resources). */
  resources?: readonly string[] | null;
  imageFile?: string | null;
  imagePosition?: SectionImagePosition | null;
};

/** Default auto-advance interval (ms). HLR does not set the interval. */
export const CAROUSEL_AUTO_ADVANCE_MS = 8_000;

/** Test harness: override auto-advance interval; `0` disables the timer. */
export const CAROUSEL_AUTO_ADVANCE_INTERVAL_MS = new InjectionToken<number>(
  'CAROUSEL_AUTO_ADVANCE_INTERVAL_MS',
  { providedIn: 'root', factory: () => CAROUSEL_AUTO_ADVANCE_MS },
);

@Component({
  selector: 'gssc-carousel',
  templateUrl: './carousel.html',
})
export class Carousel {
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageResolve = inject(SECTION_FEATURED_IMAGE_RESOLVE);
  private readonly autoAdvanceMs = inject(CAROUSEL_AUTO_ADVANCE_INTERVAL_MS);

  private imageLoadGeneration = 0;
  private objectUrlToRevoke: string | null = null;
  private autoAdvanceHandle: ReturnType<typeof setInterval> | null = null;

  /** Carousel Contents: items supplied by the page (no Contents API in this task). */
  readonly contents = input.required<readonly CarouselItem[]>();

  /** Optional item id to show first (e.g. Announcements Bar focus). */
  readonly focusedItemId = input<string | null>(null);

  /** Index of the visible slide. */
  readonly activeIndex = signal(0);

  /** Resolved object URL for the visible slide graphic when shown. */
  readonly slideGraphicUrl = signal<string | null>(null);

  readonly items = computed(() => this.contents() ?? []);

  readonly hasMultiple = computed(() => this.items().length > 1);

  readonly visibleItem = computed(() => {
    const all = this.items();
    if (all.length === 0) return null;
    const index = ((this.activeIndex() % all.length) + all.length) % all.length;
    return all[index] ?? null;
  });

  readonly slideLinks = computed(() => {
    const item = this.visibleItem();
    if (item == null) return [];
    return (item.resources ?? []).filter((resource) => resource.length > 0);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearAutoAdvance();
      this.revokeObjectUrl();
    });

    effect(() => {
      const all = this.items();
      const focusId = this.focusedItemId();
      // Depend only on Contents / focused id — do not re-apply focus when the
      // visitor steps slides (activeIndex must stay untracked here).
      untracked(() => {
        if (all.length === 0) {
          this.activeIndex.set(0);
          return;
        }
        if (focusId != null && focusId.length > 0) {
          const focused = all.findIndex((item) => item.id === focusId);
          if (focused >= 0) {
            this.activeIndex.set(focused);
            return;
          }
        }
        if (this.activeIndex() >= all.length) this.activeIndex.set(0);
      });
    });

    effect(() => {
      const item = this.visibleItem();
      void this.resolveSlideGraphic(item);
    });

    effect(() => {
      const multi = this.hasMultiple();
      this.clearAutoAdvance();
      if (!multi || this.autoAdvanceMs <= 0) return;
      this.autoAdvanceHandle = setInterval(() => {
        this.stepNext();
      }, this.autoAdvanceMs);
    });
  }

  // @relation(GSSC-PLLR-278, scope=range_start, role=Implementation)
  stepPrev(): void {
    const total = this.items().length;
    if (total < 2) return;
    this.activeIndex.update((index) => (index - 1 + total) % total);
    this.restartAutoAdvance();
  }
  // @relation(GSSC-PLLR-278, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-281, scope=range_start, role=Implementation)
  stepNext(): void {
    const total = this.items().length;
    if (total < 2) return;
    this.activeIndex.update((index) => (index + 1) % total);
    this.restartAutoAdvance();
  }
  // @relation(GSSC-PLLR-281, scope=range_end, role=Implementation)

  protected hasHeader(item: CarouselItem): boolean {
    return item.header != null && item.header.length > 0;
  }

  protected hasLinks(item: CarouselItem): boolean {
    return (item.resources?.length ?? 0) > 0;
  }

  protected showSlideGraphic(): boolean {
    return this.wantsSlideGraphic(this.visibleItem()) && this.slideGraphicUrl() != null;
  }

  private wantsSlideGraphic(item: CarouselItem | null): boolean {
    if (item == null) return false;
    const position = item.imagePosition;
    const file = item.imageFile;
    if (position !== 'left' && position !== 'right') return false;
    return file != null && file.length > 0;
  }

  private async resolveSlideGraphic(item: CarouselItem | null): Promise<void> {
    const generation = ++this.imageLoadGeneration;
    if (!this.wantsSlideGraphic(item)) {
      this.revokeObjectUrl();
      this.slideGraphicUrl.set(null);
      return;
    }
    const file = item!.imageFile!;
    const url = await this.imageResolve(file);
    if (generation !== this.imageLoadGeneration) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      return;
    }
    this.revokeObjectUrl();
    if (url?.startsWith('blob:')) this.objectUrlToRevoke = url;
    this.slideGraphicUrl.set(url);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrlToRevoke != null) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceHandle != null) {
      clearInterval(this.autoAdvanceHandle);
      this.autoAdvanceHandle = null;
    }
  }

  private restartAutoAdvance(): void {
    this.clearAutoAdvance();
    if (!this.hasMultiple() || this.autoAdvanceMs <= 0) return;
    this.autoAdvanceHandle = setInterval(() => {
      this.stepNext();
    }, this.autoAdvanceMs);
  }
}
