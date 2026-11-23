import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  RESOURCE_ARROW_CHROME_RESERVE_PX,
  RESOURCE_BUTTON_GAP_PX,
  RESOURCE_BUTTON_WIDTH_PX,
  SECTION_FEATURED_IMAGE_RESOLVE,
  Section,
  type SectionContents,
} from './section';

const sampleWithAll: SectionContents = {
  header: 'Society Purpose',
  body: 'The society promotes genealogical research in Stanislaus County.',
  resources: [
    { name: 'Membership flyer', href: '/publications/membership-flyer' },
    { name: 'Research guide', href: '/research-tools/guide' },
  ],
};

const sampleBodyOnly: SectionContents = {
  body: 'Body without a header or resources.',
};

const manyResources: SectionContents = {
  header: 'Resources',
  body: 'Many linked materials.',
  resources: [
    { name: 'R1', href: '/r1' },
    { name: 'R2', href: '/r2' },
    { name: 'R3', href: '/r3' },
    { name: 'R4', href: '/r4' },
    { name: 'R5', href: '/r5' },
  ],
};

/** Wide enough for five equal buttons without overflow. */
const WIDE_FIT_PX =
  5 * RESOURCE_BUTTON_WIDTH_PX + 4 * RESOURCE_BUTTON_GAP_PX + RESOURCE_ARROW_CHROME_RESERVE_PX;
/** Narrow enough that five buttons overflow and only two carousel slots fit. */
const NARROW_OVERFLOW_PX =
  2 * RESOURCE_BUTTON_WIDTH_PX + RESOURCE_BUTTON_GAP_PX + RESOURCE_ARROW_CHROME_RESERVE_PX - 1;

async function setupSection(
  contents: SectionContents,
  options?: { containerWidthPx?: number; imageUrl?: string | null },
) {
  TestBed.resetTestingModule();
  const imageUrl = options?.imageUrl === undefined ? 'blob:section-test/featured' : options.imageUrl;
  await TestBed.configureTestingModule({
    imports: [Section],
    providers: [
      {
        provide: SECTION_FEATURED_IMAGE_RESOLVE,
        useValue: async () => imageUrl,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Section);
  fixture.componentRef.setInput('contents', contents);
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  if (options?.containerWidthPx != null) {
    fixture.componentInstance.containerWidthOverride.set(options.containerWidthPx);
    fixture.componentInstance.remeasureFromLayout();
    fixture.detectChanges();
  }
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), section: fixture.componentInstance };
}

function resourceNames(root: HTMLElement): string[] {
  return [...root.querySelectorAll('.gssc-section__resource')].map(
    (el) => el.textContent?.trim() ?? '',
  );
}

/** Logical visible window (carousel slides the full track; DOM holds clones). */
function visibleNames(section: Section): string[] {
  return section.visibleResources().map((resource) => resource.name);
}

function trackTransform(root: HTMLElement): string {
  return (
    root.querySelector<HTMLElement>('.gssc-section__track')?.style.transform ?? ''
  );
}

// @relation(GSSC-MLLR-96, scope=range_start, role=Test)
test('GSSC-MLLR-96 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__header')).toBe(sampleWithAll.header!);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleWithAll.body);
  expect(resourceNames(root)).toEqual(sampleWithAll.resources!.map((r) => r.name));

  const { root: bodyOnly } = await setupSection(sampleBodyOnly);
  expect(bodyOnly.querySelector('.gssc-section__header')).toBeNull();
  expect(bodyOnly.querySelector('.gssc-section__resources')).toBeNull();
  expect(textContent(bodyOnly, '.gssc-section__body')).toBe(sampleBodyOnly.body);
});
// @relation(GSSC-MLLR-96, scope=range_end, role=Test)

// @relation(GSSC-MLLR-97, scope=range_start, role=Test)
test('GSSC-MLLR-97 Syntactic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('w-full')).toBe(true);
  expect(container.classList.contains('flex')).toBe(true);
  expect(container.classList.contains('flex-col')).toBe(true);
  expect(container.classList.contains('py-5')).toBe(true);
  expect(container.classList.contains('gap-4')).toBe(true);
});
// @relation(GSSC-MLLR-97, scope=range_end, role=Test)

// @relation(GSSC-MLLR-98, scope=range_start, role=Test)
test('GSSC-MLLR-98 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
  expect(container.classList.contains('bg-gssc-cream')).toBe(false);
});
// @relation(GSSC-MLLR-98, scope=range_end, role=Test)

// @relation(GSSC-MLLR-99, scope=range_start, role=Test)
test('GSSC-MLLR-99 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__header')).toBe(sampleWithAll.header!);

  const { root: without } = await setupSection(sampleBodyOnly);
  expect(without.querySelector('.gssc-section__header')).toBeNull();
});
// @relation(GSSC-MLLR-99, scope=range_end, role=Test)

// @relation(GSSC-MLLR-100, scope=range_start, role=Test)
test('GSSC-MLLR-100 Syntactic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector('.gssc-section')!;
  const children = [...container.children].filter((child) => child instanceof HTMLElement);
  expect(children[0]?.classList.contains('gssc-section__header')).toBe(true);
  expect(children[1]?.classList.contains('gssc-section__body')).toBe(true);
});
// @relation(GSSC-MLLR-100, scope=range_end, role=Test)

// @relation(GSSC-MLLR-101, scope=range_start, role=Test)
test('GSSC-MLLR-101 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const header = root.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = root.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  // Prefer text-[1.5em] over getComputedStyle ratio (jsdom h2 UA default is also 1.5×).
  expect(header.classList.contains('text-[1.5em]')).toBe(true);
  expect(body.classList.contains('text-base')).toBe(true);
});
// @relation(GSSC-MLLR-101, scope=range_end, role=Test)

// @relation(GSSC-MLLR-105, scope=range_start, role=Test)
test('GSSC-MLLR-105 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleWithAll.body);
});
// @relation(GSSC-MLLR-105, scope=range_end, role=Test)

// @relation(GSSC-MLLR-106, scope=range_start, role=Test)
test('GSSC-MLLR-106 Syntactic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const withHeader = [...root.querySelector('.gssc-section')!.children].filter(
    (child) => child instanceof HTMLElement,
  );
  expect(withHeader[0]?.classList.contains('gssc-section__header')).toBe(true);
  expect(withHeader[1]?.classList.contains('gssc-section__body')).toBe(true);

  const { root: withoutHeader } = await setupSection(sampleBodyOnly);
  const bodyFirst = [...withoutHeader.querySelector('.gssc-section')!.children].filter(
    (child) => child instanceof HTMLElement,
  );
  expect(bodyFirst[0]?.classList.contains('gssc-section__body')).toBe(true);
});
// @relation(GSSC-MLLR-106, scope=range_end, role=Test)

// @relation(GSSC-MLLR-107, scope=range_start, role=Test)
test('GSSC-MLLR-107 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const body = root.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
  expect(body.classList.contains('text-gssc-dark-brown')).toBe(false);
});
// @relation(GSSC-MLLR-107, scope=range_end, role=Test)

// @relation(GSSC-MLLR-108, scope=range_start, role=Test)
test('GSSC-MLLR-108 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.gssc-section__resource')];
  expect(links.map((link) => link.textContent?.trim())).toEqual(
    sampleWithAll.resources!.map((resource) => resource.name),
  );
  expect(links.map((link) => link.getAttribute('href'))).toEqual(
    sampleWithAll.resources!.map((resource) => resource.href),
  );

  const { root: without } = await setupSection(sampleBodyOnly);
  expect(without.querySelector('.gssc-section__resources')).toBeNull();
});
// @relation(GSSC-MLLR-108, scope=range_end, role=Test)

// @relation(GSSC-MLLR-109, scope=range_start, role=Test)
test('GSSC-MLLR-109 Syntactic', async () => {
  // Fit: strip within Section width → all buttons, no carousel chrome.
  const { root: fitRoot } = await setupSection(sampleWithAll, {
    containerWidthPx: WIDE_FIT_PX,
  });
  expect(fitRoot.querySelector('.gssc-section__resources')?.classList.contains('flex')).toBe(
    true,
  );
  expect(fitRoot.querySelector('.gssc-section__resources')?.getAttribute('data-carousel')).toBe(
    'false',
  );
  expect(fitRoot.querySelector('.gssc-section__resources-prev')).toBeNull();
  expect(fitRoot.querySelector('.gssc-section__resources-next')).toBeNull();
  expect(resourceNames(fitRoot)).toEqual(sampleWithAll.resources!.map((r) => r.name));
  expect(trackTransform(fitRoot)).toBe('none');

  // Overflow: narrow container + many resources → carousel + keyboard.
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  const children = [...root.querySelector('.gssc-section')!.children].filter(
    (child) => child instanceof HTMLElement,
  );
  expect(children.at(-1)?.classList.contains('gssc-section__resources')).toBe(true);
  expect(root.querySelector('.gssc-section__resources')?.getAttribute('data-carousel')).toBe(
    'true',
  );
  expect(root.querySelector('.gssc-section__resources-prev')).not.toBeNull();
  expect(root.querySelector('.gssc-section__resources-next')).not.toBeNull();
  expect(visibleNames(section).length).toBe(section.visibleSlotCount());
  expect(section.visibleSlotCount()).toBeGreaterThan(0);
  expect(section.visibleSlotCount()).toBeLessThan(manyResources.resources!.length);
  // Full strip stays in the track (doubled for wrap); movement is transform slide.
  expect(resourceNames(root).length).toBe(manyResources.resources!.length * 2);
  const track = root.querySelector<HTMLElement>('.gssc-section__track')!;
  expect(track.classList.contains('transition-transform')).toBe(true);
  expect(track.classList.contains('duration-200')).toBe(true);
  expect(trackTransform(root)).toBe('none');
  // Carousel fill: equal button widths sized to fill the strip between arrows.
  expect(section.carouselButtonWidthPx()).toBeGreaterThan(0);
  const filled = [...root.querySelectorAll<HTMLElement>('.gssc-section__resource')];
  expect(filled.length).toBeGreaterThan(0);
  for (const btn of filled) {
    expect(btn.style.width).toBe(`${section.carouselButtonWidthPx()}px`);
  }

  // Width change re-measures: widen → fit, no arrows.
  section.containerWidthOverride.set(WIDE_FIT_PX);
  section.remeasureFromLayout();
  fixture.detectChanges();
  expect(root.querySelector('.gssc-section__resources')?.getAttribute('data-carousel')).toBe(
    'false',
  );
  expect(root.querySelector('.gssc-section__resources-prev')).toBeNull();
  expect(resourceNames(root).length).toBe(manyResources.resources!.length);

  // Narrow again for keyboard coverage + slide transform.
  section.containerWidthOverride.set(NARROW_OVERFLOW_PX);
  section.remeasureFromLayout();
  fixture.detectChanges();
  expect(root.querySelector('.gssc-section__resources')?.getAttribute('data-carousel')).toBe(
    'true',
  );

  const first = root.querySelector<HTMLAnchorElement>('.gssc-section__resource')!;
  first.focus();
  first.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
  );
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R2');
  expect(trackTransform(root)).toMatch(/^translateX\(-/);
  expect(trackTransform(root)).not.toBe('none');

  const afterAdvance = root.querySelector<HTMLAnchorElement>('.gssc-section__resource')!;
  afterAdvance.focus();
  afterAdvance.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }),
  );
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R1');
  expect(trackTransform(root)).toBe('none');
});
// @relation(GSSC-MLLR-109, scope=range_end, role=Test)

// @relation(GSSC-MLLR-110, scope=range_start, role=Test)
test('GSSC-MLLR-110 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll, { containerWidthPx: WIDE_FIT_PX });
  const link = root.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(link.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('bg-gssc-white')).toBe(true);
  expect(link.classList.contains('hover:bg-gssc-gray')).toBe(true);
  // Fit mode keeps fixed equal width/height via Tailwind utilities
  // (8.5rem × 2.75rem / h-11). Prefer class asserts: jsdom skips global Tailwind.
  expect(link.classList.contains('h-11')).toBe(true);
  expect(link.classList.contains('in-data-[carousel=false]:w-[8.5rem]')).toBe(true);
  expect(link.classList.contains('in-data-[carousel=false]:flex-none')).toBe(true);
});
// @relation(GSSC-MLLR-110, scope=range_end, role=Test)

// @relation(GSSC-MLLR-111, scope=range_start, role=Test)
test('GSSC-MLLR-111 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const link = root.querySelector<HTMLAnchorElement>('.gssc-section__resource')!;
  expect(link.textContent?.trim()).toBe(sampleWithAll.resources![0]!.name);
  expect(link.getAttribute('href')).toBe(sampleWithAll.resources![0]!.href);
});
// @relation(GSSC-MLLR-111, scope=range_end, role=Test)

// @relation(GSSC-MLLR-112, scope=range_start, role=Test)
test('GSSC-MLLR-112 Syntactic', async () => {
  const { section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(visibleNames(section).length).toBe(section.visibleSlotCount());
  const before = visibleNames(section);
  section.stepNext();
  fixture.detectChanges();
  const after = visibleNames(section);
  expect(after.length).toBe(before.length);
  expect(after[0]).toBe('R2');
});
// @relation(GSSC-MLLR-112, scope=range_end, role=Test)

// @relation(GSSC-MLLR-113, scope=range_start, role=Test)
test('GSSC-MLLR-113 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll, { containerWidthPx: WIDE_FIT_PX });
  const buttons = [...root.querySelectorAll<HTMLElement>('.gssc-section__resource')];
  expect(buttons.length).toBeGreaterThan(1);
  // Prefer shared height utility over getComputedStyle (jsdom skips Tailwind).
  for (const btn of buttons) {
    expect(btn.classList.contains('h-11')).toBe(true);
  }
  expect(buttons[0]!.classList.contains('font-normal')).toBe(true);
  expect(buttons[0]!.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(buttons[0]!.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(buttons[0]!.classList.contains('bg-gssc-white')).toBe(true);
  expect(buttons[0]!.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-MLLR-113, scope=range_end, role=Test)

// @relation(GSSC-MLLR-114, scope=range_start, role=Test)
test('GSSC-MLLR-114 Semantic', async () => {
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(visibleNames(section)[0]).toBe('R1');
  section.stepPrev();
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R5');
  root.querySelector<HTMLButtonElement>('.gssc-section__resources-prev')!.click();
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R4');
});
// @relation(GSSC-MLLR-114, scope=range_end, role=Test)

// @relation(GSSC-MLLR-115, scope=range_start, role=Test)
test('GSSC-MLLR-115 Syntactic', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const strip = root.querySelector('.gssc-section__resources')!;
  const firstControl = [...strip.children].find((child) => child instanceof HTMLElement);
  expect(firstControl?.classList.contains('gssc-section__resources-prev')).toBe(true);

  const { root: noCarousel } = await setupSection(sampleWithAll, {
    containerWidthPx: WIDE_FIT_PX,
  });
  expect(noCarousel.querySelector('.gssc-section__resources-prev')).toBeNull();
});
// @relation(GSSC-MLLR-115, scope=range_end, role=Test)

// @relation(GSSC-MLLR-116, scope=range_start, role=Test)
test('GSSC-MLLR-116 Lexical', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const prev = root.querySelector<HTMLElement>('.gssc-section__resources-prev')!;
  expect(prev.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(prev.classList.contains('border-0')).toBe(true);
  expect(prev.classList.contains('rounded')).toBe(true);
  expect(prev.classList.contains('bg-transparent')).toBe(true);
  expect(prev.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(prev.querySelector('.nf.nf-md-chevron_left')).not.toBeNull();
});
// @relation(GSSC-MLLR-116, scope=range_end, role=Test)

// @relation(GSSC-MLLR-117, scope=range_start, role=Test)
test('GSSC-MLLR-117 Semantic', async () => {
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(visibleNames(section)[0]).toBe('R1');
  section.stepNext();
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R2');
  // Wrap last → first: offset to last then next.
  section.carouselOffset.set(4);
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R5');
  root.querySelector<HTMLButtonElement>('.gssc-section__resources-next')!.click();
  fixture.detectChanges();
  expect(visibleNames(section)[0]).toBe('R1');
});
// @relation(GSSC-MLLR-117, scope=range_end, role=Test)

// @relation(GSSC-MLLR-118, scope=range_start, role=Test)
test('GSSC-MLLR-118 Syntactic', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const strip = root.querySelector('.gssc-section__resources')!;
  const lastControl = [...strip.children]
    .filter((child) => child instanceof HTMLElement)
    .at(-1);
  expect(lastControl?.classList.contains('gssc-section__resources-next')).toBe(true);
});
// @relation(GSSC-MLLR-118, scope=range_end, role=Test)

// @relation(GSSC-MLLR-119, scope=range_start, role=Test)
test('GSSC-MLLR-119 Lexical', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const next = root.querySelector<HTMLElement>('.gssc-section__resources-next')!;
  expect(next.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(next.classList.contains('border-0')).toBe(true);
  expect(next.classList.contains('rounded')).toBe(true);
  expect(next.classList.contains('bg-transparent')).toBe(true);
  expect(next.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(next.querySelector('.nf.nf-md-chevron_right')).not.toBeNull();
});
// @relation(GSSC-MLLR-119, scope=range_end, role=Test)

const sampleWithImageLeft: SectionContents = {
  header: 'With Image',
  body: 'Body beside image.',
  imageFile: 'featured-cuid',
  imagePosition: 'left',
};

const sampleWithImageRight: SectionContents = {
  ...sampleWithImageLeft,
  imagePosition: 'right',
};

const sampleImageNone: SectionContents = {
  header: 'Suppressed',
  body: 'No image shown.',
  imageFile: 'featured-cuid',
  imagePosition: 'none',
};

const sampleImageNoPosition: SectionContents = {
  header: 'No Position',
  body: 'Unchanged layout.',
  imageFile: 'featured-cuid',
};

// @relation(GSSC-MLLR-102, scope=range_start, role=Test)
test('GSSC-MLLR-102 Semantic', async () => {
  const { root: left } = await setupSection(sampleWithImageLeft);
  expect(left.querySelector('.gssc-section__image')).not.toBeNull();
  expect(left.querySelector('.gssc-section__media')?.getAttribute('data-image-position')).toBe('left');

  const { root: none } = await setupSection(sampleImageNone);
  expect(none.querySelector('.gssc-section__image')).toBeNull();
  expect(none.querySelector('.gssc-section__media')).toBeNull();

  const { root: missingPos } = await setupSection(sampleImageNoPosition);
  expect(missingPos.querySelector('.gssc-section__image')).toBeNull();

  const { root: noFile } = await setupSection({
    header: 'No File',
    body: 'Body only.',
    imagePosition: 'left',
  });
  expect(noFile.querySelector('.gssc-section__image')).toBeNull();
});
// @relation(GSSC-MLLR-102, scope=range_end, role=Test)

// @relation(GSSC-MLLR-103, scope=range_start, role=Test)
test('GSSC-MLLR-103 Syntactic', async () => {
  const { root: left } = await setupSection(sampleWithImageLeft);
  const media = left.querySelector<HTMLElement>('.gssc-section__media')!;
  const image = left.querySelector<HTMLElement>('.gssc-section__image')!;
  expect(media.classList.contains('flex-col')).toBe(true);
  expect(media.classList.contains('sm:flex-row')).toBe(true);
  expect(media.classList.contains('sm:flex-row-reverse')).toBe(false);
  expect(image.classList.contains('max-w-[60%]')).toBe(true);
  expect(image.classList.contains('max-h-[40%]')).toBe(true);
  const children = [...media.children];
  expect(children[0]?.classList.contains('gssc-section__image')).toBe(true);
  expect(children[1]?.classList.contains('gssc-section__body')).toBe(true);

  const container = left.querySelector('.gssc-section')!;
  const sectionChildren = [...container.children].filter((c) => c instanceof HTMLElement);
  expect(sectionChildren[0]?.classList.contains('gssc-section__header')).toBe(true);
  expect(sectionChildren[1]?.classList.contains('gssc-section__media')).toBe(true);

  const { root: right } = await setupSection(sampleWithImageRight);
  const rightMedia = right.querySelector<HTMLElement>('.gssc-section__media')!;
  expect(rightMedia.classList.contains('sm:flex-row-reverse')).toBe(true);
  expect(rightMedia.getAttribute('data-image-position')).toBe('right');
});
// @relation(GSSC-MLLR-103, scope=range_end, role=Test)

// @relation(GSSC-MLLR-104, scope=range_start, role=Test)
test('GSSC-MLLR-104 Lexical', async () => {
  const { root } = await setupSection(sampleWithImageLeft);
  const image = root.querySelector<HTMLElement>('.gssc-section__image')!;
  expect(image.classList.contains('object-contain')).toBe(true);
  expect(image.classList.contains('border')).toBe(false);
  expect(image.classList.contains('bg-gssc-gray')).toBe(false);
});
// @relation(GSSC-MLLR-104, scope=range_end, role=Test)
