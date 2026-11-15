import { nativeElement, setupMembersComponent, textContent } from '../../../test-harness';
import { Footer, MEMBER_FOOTER_ORGANIZATION_NAME } from './footer';

async function setupFooter() {
  const fixture = await setupMembersComponent(Footer);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, root: nativeElement(fixture) };
}

// @relation(GSSC-MLLR-40, scope=range_start, role=Test)
test('GSSC-MLLR-40 Semantic', async () => {
  const { root } = await setupFooter();
  expect(root.querySelector('.gssc-footer__organization-name')).not.toBeNull();
  expect(root.querySelector('.gssc-footer__copyright')).not.toBeNull();
});
// @relation(GSSC-MLLR-40, scope=range_end, role=Test)

// @relation(GSSC-MLLR-41, scope=range_start, role=Test)
test('GSSC-MLLR-41 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer.classList.contains('w-full')).toBe(true);
  expect(footer.classList.contains('flex')).toBe(true);
  expect(footer.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-MLLR-41, scope=range_end, role=Test)

// @relation(GSSC-MLLR-42, scope=range_start, role=Test)
test('GSSC-MLLR-42 Lexical', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector<HTMLElement>('.gssc-footer')!;
  expect(footer.classList.contains('bg-gssc-black')).toBe(true);
  expect(footer.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-42, scope=range_end, role=Test)

// @relation(GSSC-MLLR-43, scope=range_start, role=Test)
test('GSSC-MLLR-43 Semantic', async () => {
  const { root } = await setupFooter();
  expect(textContent(root, '.gssc-footer__organization-name')).toBe(
    MEMBER_FOOTER_ORGANIZATION_NAME,
  );
  expect(MEMBER_FOOTER_ORGANIZATION_NAME).toBe(
    'Genealogical Society of Stanislaus County',
  );
});
// @relation(GSSC-MLLR-43, scope=range_end, role=Test)

// @relation(GSSC-MLLR-44, scope=range_start, role=Test)
test('GSSC-MLLR-44 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const firstContent = [...footer.children].find((child) => child instanceof HTMLElement);
  expect(firstContent?.classList.contains('gssc-footer__organization-name')).toBe(true);
});
// @relation(GSSC-MLLR-44, scope=range_end, role=Test)

// @relation(GSSC-MLLR-45, scope=range_start, role=Test)
test('GSSC-MLLR-45 Lexical', async () => {
  const { root } = await setupFooter();
  const name = root.querySelector<HTMLElement>('.gssc-footer__organization-name')!;
  expect(name.classList.contains('font-semibold')).toBe(true);
  expect(name.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-45, scope=range_end, role=Test)

// @relation(GSSC-MLLR-46, scope=range_start, role=Test)
test('GSSC-MLLR-46 Semantic', async () => {
  const { root } = await setupFooter();
  const copyright = textContent(root, '.gssc-footer__copyright')!;
  expect(copyright).toContain('©');
  expect(copyright).toContain(String(new Date().getFullYear()));
  expect(copyright).toContain(MEMBER_FOOTER_ORGANIZATION_NAME);
  expect(copyright).toContain('All Rights Reserved');
});
// @relation(GSSC-MLLR-46, scope=range_end, role=Test)

// @relation(GSSC-MLLR-47, scope=range_start, role=Test)
test('GSSC-MLLR-47 Syntactic', async () => {
  const { root } = await setupFooter();
  const footer = root.querySelector('.gssc-footer')!;
  const name = root.querySelector('.gssc-footer__organization-name')!;
  const copyright = root.querySelector('.gssc-footer__copyright')!;
  expect(footer.contains(copyright)).toBe(true);
  expect(name.compareDocumentPosition(copyright) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-47, scope=range_end, role=Test)

// @relation(GSSC-MLLR-48, scope=range_start, role=Test)
test('GSSC-MLLR-48 Lexical', async () => {
  const { root } = await setupFooter();
  const copyright = root.querySelector<HTMLElement>('.gssc-footer__copyright')!;
  expect(copyright.classList.contains('font-normal')).toBe(true);
  expect(copyright.classList.contains('text-gssc-white')).toBe(true);
});
// @relation(GSSC-MLLR-48, scope=range_end, role=Test)
