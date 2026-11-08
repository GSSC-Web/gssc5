import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { Section, type SectionContents } from './section';

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

async function setupSection(contents: SectionContents) {
  // Set required Contents before the first change detection (NG0950).
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Section],
  }).compileComponents();
  const fixture = TestBed.createComponent(Section);
  fixture.componentRef.setInput('contents', contents);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), section: fixture.componentInstance };
}

// @relation(GSSC-PLLR-83, scope=range_start, role=Test)
test('GSSC-PLLR-83 Semantic', async () => {
  const { root } = await setupSection(sampleWithAll);
  expect(textContent(root, '.gssc-section__header')).toBe(sampleWithAll.header!);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleWithAll.body);
  const resourceLinks = root.querySelectorAll('.gssc-section__resource');
  expect(resourceLinks.length).toBe(2);
  expect(resourceLinks[0]?.textContent?.trim()).toBe(sampleWithAll.resources![0]!.name);
  expect(resourceLinks[1]?.textContent?.trim()).toBe(sampleWithAll.resources![1]!.name);

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
});
// @relation(GSSC-PLLR-84, scope=range_end, role=Test)

// @relation(GSSC-PLLR-85, scope=range_start, role=Test)
test('GSSC-PLLR-85 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-cream')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);
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
  expect(header.classList.contains('text-xl')).toBe(true);
  // Larger than body: body has no text-xl (default size).
  expect(body.classList.contains('text-xl')).toBe(false);
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
  expect(body.classList.contains('text-gssc-dark-brown')).toBe(true);
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
  const { root } = await setupSection(sampleWithAll);
  const children = [...root.querySelector('.gssc-section')!.children].filter(
    (child) => child instanceof HTMLElement,
  );
  expect(children.at(-1)?.classList.contains('gssc-section__resources')).toBe(true);
  const bodyIndex = children.findIndex((child) => child.classList.contains('gssc-section__body'));
  const resourcesIndex = children.findIndex((child) =>
    child.classList.contains('gssc-section__resources'),
  );
  expect(resourcesIndex).toBeGreaterThan(bodyIndex);
  expect(children[resourcesIndex]?.tagName.toLowerCase()).toBe('ul');
});
// @relation(GSSC-PLLR-93, scope=range_end, role=Test)

// @relation(GSSC-PLLR-94, scope=range_start, role=Test)
test('GSSC-PLLR-94 Lexical', async () => {
  const { root } = await setupSection(sampleWithAll);
  const link = root.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(link.classList.contains('font-normal')).toBe(true);
  expect(link.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(link.classList.contains('no-underline')).toBe(true);
  expect(link.classList.contains('hover:underline')).toBe(true);
});
// @relation(GSSC-PLLR-94, scope=range_end, role=Test)
