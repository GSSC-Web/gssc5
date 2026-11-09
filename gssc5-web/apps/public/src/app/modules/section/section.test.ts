import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  RESOURCE_ARROW_CHROME_RESERVE_PX,
  RESOURCE_BUTTON_GAP_PX,
  RESOURCE_BUTTON_WIDTH_PX,
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
  options?: { containerWidthPx?: number },
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Section],
  }).compileComponents();
  const fixture = TestBed.createComponent(Section);
  fixture.componentRef.setInput('contents', contents);
  fixture.detectChanges();
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

// @relation(GSSC-PLLR-83, scope=range_start, role=Test)
test('GSSC-PLLR-83 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__header')).toBe(sampleWithAll.header!);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleWithAll.body);
  expect(resourceNames(root)).toEqual(sampleWithAll.resources!.map((r) => r.name));

  const { root: bodyOnly } = await setupSection(sampleBodyOnly);
  expect(bodyOnly.querySelector('.gssc-section__header')).toBeNull();
  expect(bodyOnly.querySelector('.gssc-section__resources')).toBeNull();
  expect(textContent(bodyOnly, '.gssc-section__body')).toBe(sampleBodyOnly.body);
});
// @relation(GSSC-PLLR-83, scope=range_end, role=Test)

// @relation(GSSC-PLLR-84, scope=range_start, role=Test)
test('GSSC-PLLR-84 Syntactic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('w-full')).toBe(true);
  expect(container.classList.contains('flex')).toBe(true);
  expect(container.classList.contains('flex-col')).toBe(true);
  expect(container.classList.contains('py-5')).toBe(true);
  expect(container.classList.contains('gap-4')).toBe(true);
});
// @relation(GSSC-PLLR-84, scope=range_end, role=Test)

// @relation(GSSC-PLLR-85, scope=range_start, role=Test)
test('GSSC-PLLR-85 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
  expect(container.classList.contains('bg-gssc-cream')).toBe(false);
});
// @relation(GSSC-PLLR-85, scope=range_end, role=Test)

// @relation(GSSC-PLLR-86, scope=range_start, role=Test)
test('GSSC-PLLR-86 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__header')).toBe(sampleWithAll.header!);

  const { root: without } = await setupSection(sampleBodyOnly);
  expect(without.querySelector('.gssc-section__header')).toBeNull();
});
// @relation(GSSC-PLLR-86, scope=range_end, role=Test)

// @relation(GSSC-PLLR-87, scope=range_start, role=Test)
test('GSSC-PLLR-87 Syntactic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector('.gssc-section')!;
  const children = [...container.children].filter((child) => child instanceof HTMLElement);
  expect(children[0]?.classList.contains('gssc-section__header')).toBe(true);
  expect(children[1]?.classList.contains('gssc-section__body')).toBe(true);
});
// @relation(GSSC-PLLR-87, scope=range_end, role=Test)

// @relation(GSSC-PLLR-88, scope=range_start, role=Test)
test('GSSC-PLLR-88 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const header = root.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = root.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(body.classList.contains('text-base')).toBe(true);
  // 1.5× body: header font-size is 1.5em of the body text size.
  const headerPx = Number.parseFloat(getComputedStyle(header).fontSize);
  const bodyPx = Number.parseFloat(getComputedStyle(body).fontSize);
  expect(bodyPx).toBeGreaterThan(0);
  expect(headerPx / bodyPx).toBeCloseTo(1.5, 5);
});
// @relation(GSSC-PLLR-88, scope=range_end, role=Test)

// @relation(GSSC-PLLR-89, scope=range_start, role=Test)
test('GSSC-PLLR-89 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleWithAll.body);
});
// @relation(GSSC-PLLR-89, scope=range_end, role=Test)

// @relation(GSSC-PLLR-90, scope=range_start, role=Test)
test('GSSC-PLLR-90 Syntactic', async () => {
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
// @relation(GSSC-PLLR-90, scope=range_end, role=Test)

// @relation(GSSC-PLLR-91, scope=range_start, role=Test)
test('GSSC-PLLR-91 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const body = root.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);
  expect(body.classList.contains('text-gssc-dark-brown')).toBe(false);
});
// @relation(GSSC-PLLR-91, scope=range_end, role=Test)

// @relation(GSSC-PLLR-92, scope=range_start, role=Test)
test('GSSC-PLLR-92 Semantic', async () => {
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
// @relation(GSSC-PLLR-92, scope=range_end, role=Test)

// @relation(GSSC-PLLR-93, scope=range_start, role=Test)
test('GSSC-PLLR-93 Syntactic', async () => {
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
  expect(resourceNames(root).length).toBe(section.visibleSlotCount());
  expect(section.visibleSlotCount()).toBeGreaterThan(0);
  expect(section.visibleSlotCount()).toBeLessThan(manyResources.resources!.length);
  // Carousel fill: visible buttons flex equally across the strip between arrows.
  const filled = [...root.querySelectorAll<HTMLElement>('.gssc-section__resource')];
  expect(filled.length).toBeGreaterThan(0);
  for (const btn of filled) {
    expect(getComputedStyle(btn).flexGrow).toBe('1');
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

  // Narrow again for keyboard coverage.
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
  expect(resourceNames(root)[0]).toBe('R2');

  const afterAdvance = root.querySelector<HTMLAnchorElement>('.gssc-section__resource')!;
  afterAdvance.focus();
  afterAdvance.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }),
  );
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R1');
});
// @relation(GSSC-PLLR-93, scope=range_end, role=Test)

// @relation(GSSC-PLLR-94, scope=range_start, role=Test)
test('GSSC-PLLR-94 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll, { containerWidthPx: WIDE_FIT_PX });
  const link = root.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(link.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('bg-gssc-white')).toBe(true);
  expect(link.classList.contains('hover:bg-gssc-gray')).toBe(true);
  // Fit mode keeps fixed equal width/height from section.css.
  expect(Number.parseFloat(getComputedStyle(link).width)).toBeCloseTo(8.5 * 16, 0);
  expect(Number.parseFloat(getComputedStyle(link).height)).toBeCloseTo(2.75 * 16, 0);
});
// @relation(GSSC-PLLR-94, scope=range_end, role=Test)

// @relation(GSSC-PLLR-137, scope=range_start, role=Test)
test('GSSC-PLLR-137 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  const link = root.querySelector<HTMLAnchorElement>('.gssc-section__resource')!;
  expect(link.textContent?.trim()).toBe(sampleWithAll.resources![0]!.name);
  expect(link.getAttribute('href')).toBe(sampleWithAll.resources![0]!.href);
});
// @relation(GSSC-PLLR-137, scope=range_end, role=Test)

// @relation(GSSC-PLLR-138, scope=range_start, role=Test)
test('GSSC-PLLR-138 Syntactic', async () => {
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(resourceNames(root).length).toBe(section.visibleSlotCount());
  const before = resourceNames(root);
  section.stepNext();
  fixture.detectChanges();
  const after = resourceNames(root);
  expect(after.length).toBe(before.length);
  expect(after[0]).toBe('R2');
});
// @relation(GSSC-PLLR-138, scope=range_end, role=Test)

// @relation(GSSC-PLLR-139, scope=range_start, role=Test)
test('GSSC-PLLR-139 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll, { containerWidthPx: WIDE_FIT_PX });
  const buttons = [...root.querySelectorAll<HTMLElement>('.gssc-section__resource')];
  expect(buttons.length).toBeGreaterThan(1);
  const widths = buttons.map((btn) => getComputedStyle(btn).width);
  const heights = buttons.map((btn) => getComputedStyle(btn).height);
  expect(new Set(widths).size).toBe(1);
  expect(new Set(heights).size).toBe(1);
  expect(buttons[0]!.classList.contains('font-normal')).toBe(true);
  expect(buttons[0]!.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(buttons[0]!.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(buttons[0]!.classList.contains('bg-gssc-white')).toBe(true);
  expect(buttons[0]!.classList.contains('hover:bg-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-139, scope=range_end, role=Test)

// @relation(GSSC-PLLR-140, scope=range_start, role=Test)
test('GSSC-PLLR-140 Semantic', async () => {
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(resourceNames(root)[0]).toBe('R1');
  section.stepPrev();
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R5');
  root.querySelector<HTMLButtonElement>('.gssc-section__resources-prev')!.click();
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R4');
});
// @relation(GSSC-PLLR-140, scope=range_end, role=Test)

// @relation(GSSC-PLLR-141, scope=range_start, role=Test)
test('GSSC-PLLR-141 Syntactic', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const strip = root.querySelector('.gssc-section__resources')!;
  const firstControl = [...strip.children].find((child) => child instanceof HTMLElement);
  expect(firstControl?.classList.contains('gssc-section__resources-prev')).toBe(true);

  const { root: noCarousel } = await setupSection(sampleWithAll, {
    containerWidthPx: WIDE_FIT_PX,
  });
  expect(noCarousel.querySelector('.gssc-section__resources-prev')).toBeNull();
});
// @relation(GSSC-PLLR-141, scope=range_end, role=Test)

// @relation(GSSC-PLLR-142, scope=range_start, role=Test)
test('GSSC-PLLR-142 Lexical', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const prev = root.querySelector<HTMLElement>('.gssc-section__resources-prev')!;
  expect(prev.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(prev.classList.contains('border-0')).toBe(true);
  expect(prev.classList.contains('rounded')).toBe(true);
  expect(prev.classList.contains('bg-transparent')).toBe(true);
  expect(prev.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(prev.querySelector('.nf.nf-md-chevron_left')).not.toBeNull();
});
// @relation(GSSC-PLLR-142, scope=range_end, role=Test)

// @relation(GSSC-PLLR-143, scope=range_start, role=Test)
test('GSSC-PLLR-143 Semantic', async () => {
  const { root, section, fixture } = await setupSection(manyResources, {
    containerWidthPx: NARROW_OVERFLOW_PX,
  });
  expect(resourceNames(root)[0]).toBe('R1');
  section.stepNext();
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R2');
  // Wrap last → first: offset to last then next.
  section.carouselOffset.set(4);
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R5');
  root.querySelector<HTMLButtonElement>('.gssc-section__resources-next')!.click();
  fixture.detectChanges();
  expect(resourceNames(root)[0]).toBe('R1');
});
// @relation(GSSC-PLLR-143, scope=range_end, role=Test)

// @relation(GSSC-PLLR-144, scope=range_start, role=Test)
test('GSSC-PLLR-144 Syntactic', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const strip = root.querySelector('.gssc-section__resources')!;
  const lastControl = [...strip.children]
    .filter((child) => child instanceof HTMLElement)
    .at(-1);
  expect(lastControl?.classList.contains('gssc-section__resources-next')).toBe(true);
});
// @relation(GSSC-PLLR-144, scope=range_end, role=Test)

// @relation(GSSC-PLLR-145, scope=range_start, role=Test)
test('GSSC-PLLR-145 Lexical', async () => {
  const { root } = await setupSection(manyResources, { containerWidthPx: NARROW_OVERFLOW_PX });
  const next = root.querySelector<HTMLElement>('.gssc-section__resources-next')!;
  expect(next.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(next.classList.contains('border-0')).toBe(true);
  expect(next.classList.contains('rounded')).toBe(true);
  expect(next.classList.contains('bg-transparent')).toBe(true);
  expect(next.classList.contains('hover:bg-gssc-gray')).toBe(true);
  expect(next.querySelector('.nf.nf-md-chevron_right')).not.toBeNull();
});
// @relation(GSSC-PLLR-145, scope=range_end, role=Test)
