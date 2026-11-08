import { Component, HostListener, inject } from '@angular/core';
import { PromptOverlay as PromptOverlayState } from '../../services/prompt-overlay/prompt-overlay';

@Component({
  selector: 'gssc-prompt-overlay',
  templateUrl: './prompt-overlay.html',
})
export class PromptOverlayView {
  protected readonly promptOverlay = inject(PromptOverlayState);

  // @relation(GSSC-PLLR-107, GSSC-PLLR-110, scope=range_start, role=Implementation)
  protected dismiss(): void {
    this.promptOverlay.close();
  }

  protected onBackdropClick(): void {
    this.dismiss();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.promptOverlay.isOpen()) this.dismiss();
  }
  // @relation(GSSC-PLLR-107, GSSC-PLLR-110, scope=range_end, role=Implementation)
}
