import { Injectable, signal } from '@angular/core';

/**
 * Open/close state for the Public Prompt Overlay shell (GSSC5-27).
 * Callers supply Prompt Contents into the shell; Contact Overlay (GSSC5-31) reuses this.
 */
@Injectable({ providedIn: 'root' })
export class PromptOverlay {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
