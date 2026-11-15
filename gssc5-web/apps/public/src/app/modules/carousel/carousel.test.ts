import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { SECTION_FEATURED_IMAGE_RESOLVE } from '../section/section';
import {
  CAROUSEL_AUTO_ADVANCE_INTERVAL_MS,
  Carousel,
  type CarouselItem,
} from './carousel';

const sampleItems: readonly CarouselItem[] = [
  {
    id: 'ann-1',
    header: 'General Meeting',
    body: 'Program starts at 7pm.',
    resources: ['https://example.com/program', '/files/flyer'],
  },
  {
    id: 'ann-2',
    header: 'Library Closure',
    body: 'The library is closed Monday.',
  },
  {
    id: 'ann-3',
    body: 'Body-only slide without a header.',
    resources: ['https://example.com/more'],
    imageFile: 'img-cuid',
    imagePosition: 'left',
  },
];

async function setupCarousel(
  contents: readonly CarouselItem[],
  options?: {
    focusedItemId?: string | null;
    imageUrl?: string | null;
    autoAdvanceMs?: number;
  },
) {
  TestBed.resetTestingModule();
  const imageUrl =
    options?.imageUrl === undefined ? 'blob:carousel-test/graphic' : options.imageUrl;
  await TestBed.configureTestingModule({
    imports: [Carousel],
    providers: [
      {
        provide: SECTION_FEATURED_IMAGE_RESOLVE,
        useValue: async () => imageUrl,
      },
      {
        provide: CAROUSEL_AUTO_ADVANCE_INTERVAL_MS,
        useValue: options?.autoAdvanceMs ?? 0,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Carousel);
  fixture.componentRef.setInput('contents', contents);
  if (options?.focusedItemId !== undefined) {
    fixture.componentRef.setInput('focusedItemId', options.focusedItemId);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), carousel: fixture.componentInstance };
}

function linkHrefs(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLAnchorElement>('.gssc-carousel__link')].map(
    (el) => el.getAttribute('href') ?? '',
  );
}

// @relation(GSSC-PLLR-263, scope=range_start, role=Test)
test('GSSC-PLLR-263 Semantic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  expect(textContent(root, '.gssc-carousel__title')).toBe('General Meeting');
  expect(textContent(root, '.gssc-carousel__description')).toBe('Program starts at 7pm.');
  expect(linkHrefs(root)).toEqual(['https://example.com/program', '/files/flyer']);

  carousel.stepNext();
  fixture.detectChanges();
  expect(textContent(root, '.gssc-carousel__title')).toBe('Library Closure');

  const { root: empty } = await setupCarousel([]);
  expect(empty.querySelector('.gssc-carousel')).toBeNull();

  const { root: focused } = await setupCarousel(sampleItems, { focusedItemId: 'ann-2' });
  expect(textContent(focused, '.gssc-carousel__title')).toBe('Library Closure');
  expect(focused.querySelector('.gssc-carousel')?.getAttribute('data-active-index')).toBe('1');
});
// @relation(GSSC-PLLR-263, scope=range_end, role=Test)

// @relation(GSSC-PLLR-264, scope=range_start, role=Test)
test('GSSC-PLLR-264 Syntactic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  const section = root.querySelector('.gssc-carousel');
  expect(section?.classList.contains('w-full')).toBe(true);
  expect(root.querySelectorAll('.gssc-carousel__slide').length).toBe(1);
  expect(root.querySelector('.gssc-carousel__prev')).not.toBeNull();
  expect(root.querySelector('.gssc-carousel__next')).not.toBeNull();
  expect(root.querySelector('.gssc-carousel__slide')?.classList.contains('gap-4')).toBe(true);
  expect(root.querySelector('.gssc-carousel__slide')?.classList.contains('transition-opacity')).toBe(
    true,
  );

  carousel.stepNext();
  fixture.detectChanges();
  expect(section?.getAttribute('data-active-index')).toBe('1');

  const { root: single } = await setupCarousel([sampleItems[0]!]);
  expect(single.querySelector('.gssc-carousel__prev')).toBeNull();
  expect(single.querySelector('.gssc-carousel__next')).toBeNull();
});
// @relation(GSSC-PLLR-264, scope=range_end, role=Test)

// @relation(GSSC-PLLR-265, scope=range_start, role=Test)
test('GSSC-PLLR-265 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const section = root.querySelector('.gssc-carousel');
  expect(section?.classList.contains('bg-gssc-white')).toBe(true);
  expect(section?.classList.contains('border-gssc-gray')).toBe(true);
  expect(section?.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(section?.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-265, scope=range_end, role=Test)

// @relation(GSSC-PLLR-266, scope=range_start, role=Test)
test('GSSC-PLLR-266 Semantic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  expect(textContent(root, '.gssc-carousel__title')).toBe('General Meeting');
  carousel.activeIndex.set(2);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-carousel__title')).toBeNull();
  expect(textContent(root, '.gssc-carousel__description')).toBe(
    'Body-only slide without a header.',
  );
});
// @relation(GSSC-PLLR-266, scope=range_end, role=Test)

// @relation(GSSC-PLLR-267, scope=range_start, role=Test)
test('GSSC-PLLR-267 Syntactic', async () => {
  const { root } = await setupCarousel(sampleItems);
  const slide = root.querySelector('.gssc-carousel__slide');
  const title = root.querySelector('.gssc-carousel__title');
  const description = root.querySelector('.gssc-carousel__description');
  expect(slide?.contains(title)).toBe(true);
  expect(slide?.contains(description)).toBe(true);
  expect(
    title!.compareDocumentPosition(description!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
// @relation(GSSC-PLLR-267, scope=range_end, role=Test)

// @relation(GSSC-PLLR-268, scope=range_start, role=Test)
test('GSSC-PLLR-268 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const title = root.querySelector('.gssc-carousel__title');
  expect(title?.classList.contains('font-semibold')).toBe(true);
  expect(title?.classList.contains('text-[1.5em]')).toBe(true);
  expect(title?.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-268, scope=range_end, role=Test)

// @relation(GSSC-PLLR-269, scope=range_start, role=Test)
test('GSSC-PLLR-269 Semantic', async () => {
  const { root } = await setupCarousel(sampleItems);
  expect(textContent(root, '.gssc-carousel__description')).toBe('Program starts at 7pm.');
});
// @relation(GSSC-PLLR-269, scope=range_end, role=Test)

// @relation(GSSC-PLLR-270, scope=range_start, role=Test)
test('GSSC-PLLR-270 Syntactic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  const description = root.querySelector('.gssc-carousel__description');
  expect(description?.parentElement?.classList.contains('gssc-carousel__slide')).toBe(true);

  carousel.activeIndex.set(2);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
  const media = root.querySelector('.gssc-carousel__media');
  expect(media).not.toBeNull();
  expect(media?.classList.contains('sm:flex-row')).toBe(true);
  expect(media?.querySelector('.gssc-carousel__graphic')).not.toBeNull();
  expect(media?.querySelector('.gssc-carousel__description')).not.toBeNull();
  expect(media?.getAttribute('data-image-position')).toBe('left');
});
// @relation(GSSC-PLLR-270, scope=range_end, role=Test)

// @relation(GSSC-PLLR-271, scope=range_start, role=Test)
test('GSSC-PLLR-271 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const description = root.querySelector('.gssc-carousel__description');
  expect(description?.classList.contains('font-normal')).toBe(true);
  expect(description?.classList.contains('text-base')).toBe(true);
  expect(description?.classList.contains('text-gssc-black')).toBe(true);
});
// @relation(GSSC-PLLR-271, scope=range_end, role=Test)

// @relation(GSSC-PLLR-272, scope=range_start, role=Test)
test('GSSC-PLLR-272 Semantic', async () => {
  const { root } = await setupCarousel(sampleItems);
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.gssc-carousel__link')];
  expect(links.map((el) => el.textContent?.trim())).toEqual([
    'https://example.com/program',
    '/files/flyer',
  ]);
  expect(links.map((el) => el.getAttribute('href'))).toEqual([
    'https://example.com/program',
    '/files/flyer',
  ]);
});
// @relation(GSSC-PLLR-272, scope=range_end, role=Test)

// @relation(GSSC-PLLR-273, scope=range_start, role=Test)
test('GSSC-PLLR-273 Syntactic', async () => {
  const { root } = await setupCarousel(sampleItems);
  const links = root.querySelector('.gssc-carousel__links');
  const description = root.querySelector('.gssc-carousel__description');
  expect(links?.classList.contains('flex-wrap')).toBe(true);
  expect(links?.classList.contains('justify-start')).toBe(true);
  expect(
    description!.compareDocumentPosition(links!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const { root: noLinks } = await setupCarousel([sampleItems[1]!]);
  expect(noLinks.querySelector('.gssc-carousel__links')).toBeNull();
});
// @relation(GSSC-PLLR-273, scope=range_end, role=Test)

// @relation(GSSC-PLLR-274, scope=range_start, role=Test)
test('GSSC-PLLR-274 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const link = root.querySelector('.gssc-carousel__link');
  expect(link?.classList.contains('font-normal')).toBe(true);
  expect(link?.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link?.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(link?.classList.contains('bg-gssc-white')).toBe(true);
  expect(link?.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-274, scope=range_end, role=Test)

// @relation(GSSC-PLLR-275, scope=range_start, role=Test)
test('GSSC-PLLR-275 Semantic', async () => {
  const withGraphic: CarouselItem = {
    body: 'With graphic',
    imageFile: 'img-cuid',
    imagePosition: 'right',
  };
  const { root } = await setupCarousel([withGraphic]);
  expect(root.querySelector('.gssc-carousel__graphic')).not.toBeNull();
  expect(root.querySelector('.gssc-carousel__media')?.getAttribute('data-image-position')).toBe(
    'right',
  );

  const none: CarouselItem = {
    body: 'Suppressed',
    imageFile: 'img-cuid',
    imagePosition: 'none',
  };
  const { root: omitted } = await setupCarousel([none]);
  expect(omitted.querySelector('.gssc-carousel__graphic')).toBeNull();

  const missing: CarouselItem = { body: 'No file', imagePosition: 'left' };
  const { root: noFile } = await setupCarousel([missing]);
  expect(noFile.querySelector('.gssc-carousel__graphic')).toBeNull();
});
// @relation(GSSC-PLLR-275, scope=range_end, role=Test)

// @relation(GSSC-PLLR-276, scope=range_start, role=Test)
test('GSSC-PLLR-276 Syntactic', async () => {
  const item: CarouselItem = {
    header: 'Title',
    body: 'Body',
    imageFile: 'img-cuid',
    imagePosition: 'left',
  };
  const { root } = await setupCarousel([item]);
  const media = root.querySelector('.gssc-carousel__media');
  const graphic = root.querySelector('.gssc-carousel__graphic');
  expect(media?.classList.contains('flex-col')).toBe(true);
  expect(media?.classList.contains('sm:flex-row')).toBe(true);
  expect(media?.classList.contains('sm:flex-row-reverse')).toBe(false);
  expect(graphic?.classList.contains('max-w-[60%]')).toBe(true);
  expect(graphic?.classList.contains('max-h-[40%]')).toBe(true);

  const right: CarouselItem = { ...item, imagePosition: 'right' };
  const { root: rightRoot } = await setupCarousel([right]);
  expect(
    rightRoot.querySelector('.gssc-carousel__media')?.classList.contains('sm:flex-row-reverse'),
  ).toBe(true);
});
// @relation(GSSC-PLLR-276, scope=range_end, role=Test)

// @relation(GSSC-PLLR-277, scope=range_start, role=Test)
test('GSSC-PLLR-277 Lexical', async () => {
  const item: CarouselItem = {
    body: 'Body',
    imageFile: 'img-cuid',
    imagePosition: 'left',
  };
  const { root } = await setupCarousel([item]);
  const graphic = root.querySelector('.gssc-carousel__graphic');
  expect(graphic?.classList.contains('object-contain')).toBe(true);
  expect(graphic?.classList.contains('border')).toBe(false);
  expect(graphic?.classList.contains('bg-gssc-white')).toBe(false);
});
// @relation(GSSC-PLLR-277, scope=range_end, role=Test)

// @relation(GSSC-PLLR-278, scope=range_start, role=Test)
test('GSSC-PLLR-278 Semantic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  expect(carousel.activeIndex()).toBe(0);
  carousel.stepPrev();
  fixture.detectChanges();
  expect(carousel.activeIndex()).toBe(2);
  expect(textContent(root, '.gssc-carousel__description')).toBe(
    'Body-only slide without a header.',
  );
});
// @relation(GSSC-PLLR-278, scope=range_end, role=Test)

// @relation(GSSC-PLLR-279, scope=range_start, role=Test)
test('GSSC-PLLR-279 Syntactic', async () => {
  const { root } = await setupCarousel(sampleItems);
  const prev = root.querySelector('.gssc-carousel__prev');
  const section = root.querySelector('.gssc-carousel');
  expect(prev).not.toBeNull();
  expect(section?.firstElementChild).toBe(prev);

  const { root: single } = await setupCarousel([sampleItems[0]!]);
  expect(single.querySelector('.gssc-carousel__prev')).toBeNull();
});
// @relation(GSSC-PLLR-279, scope=range_end, role=Test)

// @relation(GSSC-PLLR-280, scope=range_start, role=Test)
test('GSSC-PLLR-280 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const prev = root.querySelector('.gssc-carousel__prev');
  expect(prev?.classList.contains('rounded')).toBe(true);
  expect(prev?.classList.contains('border-0')).toBe(true);
  expect(prev?.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(prev?.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(prev?.querySelector('.nf-md-chevron_left')).not.toBeNull();
});
// @relation(GSSC-PLLR-280, scope=range_end, role=Test)

// @relation(GSSC-PLLR-281, scope=range_start, role=Test)
test('GSSC-PLLR-281 Semantic', async () => {
  const { root, carousel, fixture } = await setupCarousel(sampleItems);
  carousel.stepNext();
  fixture.detectChanges();
  expect(carousel.activeIndex()).toBe(1);
  expect(textContent(root, '.gssc-carousel__title')).toBe('Library Closure');
  carousel.activeIndex.set(2);
  fixture.detectChanges();
  carousel.stepNext();
  fixture.detectChanges();
  expect(carousel.activeIndex()).toBe(0);
});
// @relation(GSSC-PLLR-281, scope=range_end, role=Test)

// @relation(GSSC-PLLR-282, scope=range_start, role=Test)
test('GSSC-PLLR-282 Syntactic', async () => {
  const { root } = await setupCarousel(sampleItems);
  const next = root.querySelector('.gssc-carousel__next');
  const section = root.querySelector('.gssc-carousel');
  expect(next).not.toBeNull();
  expect(section?.lastElementChild).toBe(next);

  const { root: single } = await setupCarousel([sampleItems[0]!]);
  expect(single.querySelector('.gssc-carousel__next')).toBeNull();
});
// @relation(GSSC-PLLR-282, scope=range_end, role=Test)

// @relation(GSSC-PLLR-283, scope=range_start, role=Test)
test('GSSC-PLLR-283 Lexical', async () => {
  const { root } = await setupCarousel(sampleItems);
  const next = root.querySelector('.gssc-carousel__next');
  expect(next?.classList.contains('rounded')).toBe(true);
  expect(next?.classList.contains('border-0')).toBe(true);
  expect(next?.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(next?.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(next?.querySelector('.nf-md-chevron_right')).not.toBeNull();
});
// @relation(GSSC-PLLR-283, scope=range_end, role=Test)

// Auto-advance (Container Semantic / PHLR-56) — timer inject for STD.
test('GSSC-PLLR-263 auto-advances when multiple items are present', async () => {
  vi.useFakeTimers();
  try {
    const { carousel, fixture } = await setupCarousel(sampleItems, { autoAdvanceMs: 1000 });
    expect(carousel.activeIndex()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});
