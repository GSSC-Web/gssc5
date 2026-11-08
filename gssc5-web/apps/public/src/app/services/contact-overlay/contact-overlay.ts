import { Injectable, signal } from '@angular/core';

/**
 * Hook for opening the Public Contact Overlay.
 * Overlay UI remains GSSC5-31; this ticket only records open requests.
 */
@Injectable({ providedIn: 'root' })
export class ContactOverlay {
  readonly openCount = signal(0);

  open(): void {
    this.openCount.update((count) => count + 1);
  }
}
