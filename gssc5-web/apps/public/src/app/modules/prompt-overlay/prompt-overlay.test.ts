import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, setupPublicComponent } from '../../../test-harness';
import { PromptOverlay } from '../../services/prompt-overlay/prompt-overlay';
import { PromptOverlayView } from './prompt-overlay';

@Component({
  imports: [PromptOverlayView],
  template: `<gssc-prompt-overlay><p class="gssc-prompt-overlay__sample">Sample prompt</p></gssc-prompt-overlay>`,
})
class PromptOverlayHost {}

async function setupOverlay(): Promise<{
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayHost>>>;
  promptOverlay: PromptOverlay;
  root: HTMLElement;
}> {
  const fixture = await setupPublicComponent(PromptOverlayHost);
  const promptOverlay = TestBed.inject(PromptOverlay);
  promptOverlay.close();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, promptOverlay, root: nativeElement(fixture) };
}

async function openOverlay(
  fixture: Awaited<ReturnType<typeof setupPublicComponent<PromptOverlayHost>>>,
  promptOverlay: PromptOverlay,
): Promise<HTMLElement> {
  promptOverlay.open();
  fixture.detectChanges();
  await fixture.whenStable();
  return nativeElement(fixture);
}

// @relation(GSSC-PLLR-107, scope=range_start, role=Test)
test('GSSC-PLLR-107 Semantic', async () => {
  const { fixture, promptOverlay, root } = await setupOverlay();
  expect(root.querySelector('.gssc-prompt-overlay')).toBeNull();

  const openRoot = await openOverlay(fixture, promptOverlay);
  expect(openRoot.querySelector('.gssc-prompt-overlay')).not.toBeNull();
  expect(openRoot.querySelector('.gssc-prompt-overlay__sample')?.textContent?.trim()).toBe(
    'Sample prompt',
  );

  openRoot.querySelector<HTMLElement>('.gssc-prompt-overlay')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(false);
  expect(nativeElement(fixture).querySelector('.gssc-prompt-overlay')).toBeNull();
});
// @relation(GSSC-PLLR-107, scope=range_end, role=Test)

// @relation(GSSC-PLLR-108, scope=range_start, role=Test)
test('GSSC-PLLR-108 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openOverlay(fixture, promptOverlay);
  const shell = root.querySelector<HTMLElement>('.gssc-prompt-overlay')!;
  const panel = root.querySelector<HTMLElement>('.gssc-prompt-overlay__panel')!;
  expect(shell.classList.contains('fixed')).toBe(true);
  expect(shell.classList.contains('inset-0')).toBe(true);
  expect(shell.classList.contains('flex')).toBe(true);
  expect(shell.classList.contains('items-center')).toBe(true);
  expect(shell.classList.contains('justify-center')).toBe(true);
  expect(panel.classList.contains('max-w-lg')).toBe(true);
  expect(panel.classList.contains('w-full')).toBe(true);
  expect(panel.classList.contains('max-h-[min(100dvh,40rem)]')).toBe(true);
});
// @relation(GSSC-PLLR-108, scope=range_end, role=Test)

// @relation(GSSC-PLLR-109, scope=range_start, role=Test)
test('GSSC-PLLR-109 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openOverlay(fixture, promptOverlay);
  const shell = root.querySelector<HTMLElement>('.gssc-prompt-overlay')!;
  const panel = root.querySelector<HTMLElement>('.gssc-prompt-overlay__panel')!;
  expect(shell.classList.contains('bg-gssc-black/50')).toBe(true);
  expect(shell.classList.contains('font-sans')).toBe(true);
  expect(shell.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(panel.classList.contains('bg-gssc-white')).toBe(true);
  expect(panel.classList.contains('border-gssc-gray')).toBe(true);
  expect(panel.classList.contains('text-gssc-dark-green')).toBe(true);
});
// @relation(GSSC-PLLR-109, scope=range_end, role=Test)

// @relation(GSSC-PLLR-110, scope=range_start, role=Test)
test('GSSC-PLLR-110 Semantic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openOverlay(fixture, promptOverlay);
  expect(promptOverlay.isOpen()).toBe(true);
  root.querySelector<HTMLButtonElement>('.gssc-prompt-overlay__dismiss')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(promptOverlay.isOpen()).toBe(false);
  expect(nativeElement(fixture).querySelector('.gssc-prompt-overlay')).toBeNull();
});
// @relation(GSSC-PLLR-110, scope=range_end, role=Test)

// @relation(GSSC-PLLR-111, scope=range_start, role=Test)
test('GSSC-PLLR-111 Syntactic', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openOverlay(fixture, promptOverlay);
  const header = root.querySelector<HTMLElement>('.gssc-prompt-overlay__header')!;
  const dismiss = root.querySelector<HTMLElement>('.gssc-prompt-overlay__dismiss')!;
  expect(header.classList.contains('justify-end')).toBe(true);
  expect(header.contains(dismiss)).toBe(true);
});
// @relation(GSSC-PLLR-111, scope=range_end, role=Test)

// @relation(GSSC-PLLR-112, scope=range_start, role=Test)
test('GSSC-PLLR-112 Lexical', async () => {
  const { fixture, promptOverlay } = await setupOverlay();
  const root = await openOverlay(fixture, promptOverlay);
  const dismiss = root.querySelector<HTMLElement>('.gssc-prompt-overlay__dismiss')!;
  expect(dismiss.classList.contains('bg-transparent')).toBe(true);
  expect(dismiss.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(dismiss.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-PLLR-112, scope=range_end, role=Test)
