import { inject, Injectable, signal } from '@angular/core';
import {
  contactPromptRequest,
  PromptOverlay,
} from '../prompt-overlay/prompt-overlay';

/**
 * Header/Footer Contact open hook.
 * Enqueues the software-only contact form PoC on the Prompt Overlay (GSSC5-27).
 * Full Contact Overlay product UX remains GSSC5-31.
 */
@Injectable({ providedIn: 'root' })
export class ContactOverlay {
  private readonly promptOverlay = inject(PromptOverlay);
  readonly openCount = signal(0);

  open(): void {
    this.openCount.update((count) => count + 1);
    this.promptOverlay.enqueue(contactPromptRequest());
  }
}
