import { Component, HostListener, inject } from '@angular/core';
import {
  PromptOverlay as PromptOverlayState,
  type PromptValues,
} from '../../services/prompt-overlay/prompt-overlay';
import { PromptForm } from './prompt-form/prompt-form';

@Component({
  selector: 'gssc-prompt-overlay',
  imports: [PromptForm],
  templateUrl: './prompt-overlay.html',
})
export class PromptOverlayView {
  protected readonly promptOverlay = inject(PromptOverlayState);

  protected onSubmitted(values: PromptValues): void {
    this.promptOverlay.submit(values);
  }

  // @relation(GSSC-PLLR-110, scope=range_start, role=Implementation)
  protected dismiss(): void {
    this.promptOverlay.cancel();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.promptOverlay.isOpen()) this.dismiss();
  }
  // @relation(GSSC-PLLR-110, scope=range_end, role=Implementation)
}
