import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';

/** One resource linked from Section Contents (FE presentation; no Contents API). */
export type SectionResource = {
  name: string;
  href: string;
};

/** Section data placed by the Section Container. */
export type SectionContents = {
  header?: string | null;
  body: string;
  resources?: readonly SectionResource[] | null;
};

/** Visible Resource Button slots by viewport band (implementation uses Tailwind sm/md). */
export type ResourceSlotBand = 'below-extra-small' | 'extra-small-to-medium' | 'medium-and-up';

const SLOT_COUNTS: Record<ResourceSlotBand, number> = {
  'below-extra-small': 2,
  'extra-small-to-medium': 3,
  'medium-and-up': 4,
};

@Component({
  selector: 'gssc-section',
  templateUrl: './section.html',
  styleUrl: './section.css',
})
export class Section {
  private readonly destroyRef = inject(DestroyRef);

  /** Section Contents supplied by the page (no Contents API in this task). */
  readonly contents = input.required<SectionContents>();

  /** Viewport band for Resource Button slot counts. */
  readonly slotBand = signal<ResourceSlotBand>('below-extra-small');

  /** Index of the first visible resource in the carousel strip. */
  readonly carouselOffset = signal(0);

  readonly resources = computed(() => this.contents().resources ?? []);

  readonly visibleSlotCount = computed(() => SLOT_COUNTS[this.slotBand()]);

  readonly isCarousel = computed(() => this.resources().length > this.visibleSlotCount());

  readonly visibleResources = computed(() => {
    const all = this.resources();
    const slots = this.visibleSlotCount();
    if (all.length === 0) return [];
    if (!this.isCarousel()) return [...all];
    const start = ((this.carouselOffset() % all.length) + all.length) % all.length;
    const visible: SectionResource[] = [];
    for (let i = 0; i < slots; i += 1) {
      visible.push(all[(start + i) % all.length]!);
    }
    return visible;
  });

  constructor() {
    effect(() => {
      // Reset offset when Contents or slot band change so the strip stays in range.
      this.resources();
      this.visibleSlotCount();
      this.carouselOffset.set(0);
    });

    if (typeof globalThis.matchMedia === 'function') {
      const mdQuery = globalThis.matchMedia('(min-width: 768px)');
      const smQuery = globalThis.matchMedia('(min-width: 640px)');
      const syncBand = () => {
        if (mdQuery.matches) this.slotBand.set('medium-and-up');
        else if (smQuery.matches) this.slotBand.set('extra-small-to-medium');
        else this.slotBand.set('below-extra-small');
      };
      syncBand();
      mdQuery.addEventListener('change', syncBand);
      smQuery.addEventListener('change', syncBand);
      this.destroyRef.onDestroy(() => {
        mdQuery.removeEventListener('change', syncBand);
        smQuery.removeEventListener('change', syncBand);
      });
    }
  }

  protected hasHeader(contents: SectionContents): boolean {
    return contents.header != null && contents.header.length > 0;
  }

  protected hasResources(contents: SectionContents): boolean {
    return (contents.resources?.length ?? 0) > 0;
  }

  // @relation(GSSC-PLLR-140, scope=range_start, role=Implementation)
  stepPrev(): void {
    if (!this.isCarousel()) return;
    const total = this.resources().length;
    this.carouselOffset.update((offset) => (offset - 1 + total) % total);
  }
  // @relation(GSSC-PLLR-140, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-143, scope=range_start, role=Implementation)
  stepNext(): void {
    if (!this.isCarousel()) return;
    const total = this.resources().length;
    this.carouselOffset.update((offset) => (offset + 1) % total);
  }
  // @relation(GSSC-PLLR-143, scope=range_end, role=Implementation)

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
}
