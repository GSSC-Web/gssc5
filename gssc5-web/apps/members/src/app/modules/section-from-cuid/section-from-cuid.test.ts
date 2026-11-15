import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import {
  SECTION_BACKEND_GET,
  SectionFromCuid,
  sectionContentsFromBackend,
  type BackendSectionData,
} from './section-from-cuid';

const unsetBounds = {
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
  imageFile: null,
  imagePosition: null,
} as const;

const sampleBackend: BackendSectionData = {
  cuid: 'section_cuid_demo',
  header: 'Society Purpose',
  body: 'The society promotes genealogical research in Stanislaus County.',
  resources: ['https://www.google.com', '/research-tools/guide'],
  tags: ['home'],
  index: 1,
  ...unsetBounds,
};

const bodyOnlyBackend: BackendSectionData = {
  cuid: 'section_cuid_body',
  header: null,
  body: 'Body without a header or resources.',
  resources: [],
  tags: [],
  index: 2,
  ...unsetBounds,
};

async function setupSectionFromCuid(
  cuid: string,
  backendGet: (requested: string) => Promise<BackendSectionData | null>,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SectionFromCuid],
    providers: [{ provide: SECTION_BACKEND_GET, useValue: backendGet }],
  }).compileComponents();
  const fixture = TestBed.createComponent(SectionFromCuid);
  fixture.componentRef.setInput('cuid', cuid);
  fixture.detectChanges();
  await fixture.whenStable();
  // Allow the effect + async backend get to settle.
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture), loader: fixture.componentInstance };
}

// @relation(GSSC-MLLR-120, scope=range_start, role=Test)
test('GSSC-MLLR-120 Semantic', async () => {
  const calls: string[] = [];
  const { root, loader } = await setupSectionFromCuid('section_cuid_demo', async (cuid) => {
    calls.push(cuid);
    return sampleBackend;
  });

  expect(calls).toEqual(['section_cuid_demo']);
  expect(loader.contents()).toEqual(sectionContentsFromBackend(sampleBackend));
  expect(textContent(root, '.gssc-section__header')).toBe(sampleBackend.header);
  expect(textContent(root, '.gssc-section__body')).toBe(sampleBackend.body);
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.gssc-section__resource')];
  expect(links.map((link) => link.textContent?.trim())).toEqual(sampleBackend.resources);
  expect(links.map((link) => link.getAttribute('href'))).toEqual(sampleBackend.resources);

  const mapped = sectionContentsFromBackend(bodyOnlyBackend);
  expect(mapped.header).toBeNull();
  expect(mapped.body).toBe(bodyOnlyBackend.body);
  expect(mapped.resources).toBeNull();
  expect(mapped.imageFile).toBeNull();
  expect(mapped.imagePosition).toBeNull();

  const withImage: BackendSectionData = {
    ...sampleBackend,
    imageFile: 'feat-cuid',
    imagePosition: 'left',
  };
  const mappedImage = sectionContentsFromBackend(withImage);
  expect(mappedImage.imageFile).toBe('feat-cuid');
  expect(mappedImage.imagePosition).toBe('left');
});
// @relation(GSSC-MLLR-120, scope=range_end, role=Test)

// @relation(GSSC-MLLR-121, scope=range_start, role=Test)
test('GSSC-MLLR-121 Syntactic', async () => {
  const { root: present } = await setupSectionFromCuid('section_cuid_demo', async () => sampleBackend);
  expect(present.querySelector('gssc-section')).not.toBeNull();
  expect(present.querySelector('.gssc-section')).not.toBeNull();

  const { root: absent } = await setupSectionFromCuid('missing_cuid', async () => null);
  expect(absent.querySelector('gssc-section')).toBeNull();
  expect(absent.querySelector('.gssc-section')).toBeNull();
});
// @relation(GSSC-MLLR-121, scope=range_end, role=Test)

// @relation(GSSC-MLLR-123, scope=range_start, role=Test)
test('GSSC-MLLR-123 Semantic', async () => {
  const outside: BackendSectionData = {
    ...sampleBackend,
    startMonth: 1,
    startDay: 1,
    startYear: 2099,
    endMonth: 1,
    endDay: 31,
    endYear: 2099,
  };
  const { root: hidden } = await setupSectionFromCuid('section_cuid_demo', async () => outside);
  expect(hidden.querySelector('gssc-section')).toBeNull();

  const { root: shown } = await setupSectionFromCuid('section_cuid_demo', async () => sampleBackend);
  expect(shown.querySelector('gssc-section')).not.toBeNull();
});
// @relation(GSSC-MLLR-123, scope=range_end, role=Test)

// @relation(GSSC-MLLR-122, scope=range_start, role=Test)
test('GSSC-MLLR-122 Lexical', async () => {
  const { root } = await setupSectionFromCuid('section_cuid_demo', async () => sampleBackend);
  const container = root.querySelector<HTMLElement>('.gssc-section')!;
  expect(container.classList.contains('bg-gssc-white')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
  expect(container.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(container.classList.contains('font-sans')).toBe(true);

  const header = root.querySelector<HTMLElement>('.gssc-section__header')!;
  const body = root.querySelector<HTMLElement>('.gssc-section__body')!;
  expect(header.classList.contains('font-semibold')).toBe(true);
  expect(header.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(body.classList.contains('font-normal')).toBe(true);
  expect(body.classList.contains('text-gssc-black')).toBe(true);

  const resource = root.querySelector<HTMLElement>('.gssc-section__resource')!;
  expect(resource.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(resource.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(resource.classList.contains('hover:bg-gssc-gray')).toBe(true);

  // Loader host has no independent lexical chrome classes of its own.
  expect(root.className.trim()).toBe('');
});
// @relation(GSSC-MLLR-122, scope=range_end, role=Test)
