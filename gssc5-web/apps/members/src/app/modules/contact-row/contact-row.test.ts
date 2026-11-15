import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { ContactRow, type ContactRowContents } from './contact-row';

const sample: ContactRowContents = {
  displayName: 'Ada Lovelace',
  methods: [
    { label: 'ada@example.org', href: 'mailto:ada@example.org' },
    { label: '555-0100', href: 'tel:555-0100' },
    { label: 'Display only' },
  ],
};

@Component({
  imports: [ContactRow],
  template: `<gssc-contact-row [contents]="contents" />`,
})
class Host {
  contents: ContactRowContents = sample;
}

async function setup(contents: ContactRowContents = sample) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.contents = contents;
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-159, scope=range_start, role=Test)
test('GSSC-MLLR-159 Semantic', async () => {
  const { root } = await setup();
  expect(textContent(root, '.gssc-contact-row__name')).toBe('Ada Lovelace');
  const methods = [...root.querySelectorAll('.gssc-contact-row__method')].map(
    (el) => el.textContent?.trim() ?? '',
  );
  expect(methods).toEqual(['ada@example.org', '555-0100', 'Display only']);
});
// @relation(GSSC-MLLR-159, scope=range_end, role=Test)

// @relation(GSSC-MLLR-160, scope=range_start, role=Test)
test('GSSC-MLLR-160 Syntactic', async () => {
  const { root } = await setup();
  const row = root.querySelector('.gssc-contact-row')!;
  expect(row.className).toContain('flex-col');
  expect(row.className).toContain('w-full');
  const name = root.querySelector('.gssc-contact-row__name')!;
  const methods = root.querySelector('.gssc-contact-row__methods')!;
  expect(name.compareDocumentPosition(methods) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-160, scope=range_end, role=Test)

// @relation(GSSC-MLLR-161, scope=range_start, role=Test)
test('GSSC-MLLR-161 Lexical', async () => {
  const { root } = await setup();
  const row = root.querySelector('.gssc-contact-row')!;
  expect(row.className).toContain('font-sans');
  expect(row.className).toContain('text-gssc-dark-green');
  expect(row.className).not.toMatch(/border-|bg-gssc-/);
});
// @relation(GSSC-MLLR-161, scope=range_end, role=Test)

// @relation(GSSC-MLLR-162, scope=range_start, role=Test)
test('GSSC-MLLR-162 Semantic', async () => {
  const { root } = await setup({ displayName: 'Grace Hopper', methods: [] });
  expect(textContent(root, '.gssc-contact-row__name')).toBe('Grace Hopper');
});
// @relation(GSSC-MLLR-162, scope=range_end, role=Test)

// @relation(GSSC-MLLR-163, scope=range_start, role=Test)
test('GSSC-MLLR-163 Syntactic', async () => {
  const { root } = await setup();
  const children = [...root.querySelector('.gssc-contact-row')!.children];
  expect(children[0]?.classList.contains('gssc-contact-row__name')).toBe(true);
  expect(children[1]?.classList.contains('gssc-contact-row__methods')).toBe(true);
});
// @relation(GSSC-MLLR-163, scope=range_end, role=Test)

// @relation(GSSC-MLLR-164, scope=range_start, role=Test)
test('GSSC-MLLR-164 Lexical', async () => {
  const { root } = await setup();
  const name = root.querySelector('.gssc-contact-row__name')!;
  expect(name.className).toContain('font-semibold');
  expect(name.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-164, scope=range_end, role=Test)

// @relation(GSSC-MLLR-165, scope=range_start, role=Test)
test('GSSC-MLLR-165 Semantic', async () => {
  const { root } = await setup();
  const link = root.querySelector<HTMLAnchorElement>('.gssc-contact-row__method-link')!;
  expect(link.getAttribute('href')).toBe('mailto:ada@example.org');
  expect(root.querySelector('.gssc-contact-row__method-text')?.textContent?.trim()).toBe(
    'Display only',
  );
});
// @relation(GSSC-MLLR-165, scope=range_end, role=Test)

// @relation(GSSC-MLLR-166, scope=range_start, role=Test)
test('GSSC-MLLR-166 Syntactic', async () => {
  const { root } = await setup();
  const methods = root.querySelector('.gssc-contact-row__methods')!;
  expect(methods.className).toContain('flex-col');
  expect(methods.tagName.toLowerCase()).toBe('ul');
});
// @relation(GSSC-MLLR-166, scope=range_end, role=Test)

// @relation(GSSC-MLLR-167, scope=range_start, role=Test)
test('GSSC-MLLR-167 Lexical', async () => {
  const { root } = await setup();
  const methods = root.querySelector('.gssc-contact-row__methods')!;
  expect(methods.className).toContain('font-normal');
  expect(methods.className).toContain('text-gssc-dark-green');
});
// @relation(GSSC-MLLR-167, scope=range_end, role=Test)
