import { Injectable, signal } from '@angular/core';

/**
 * Member Contact Overlay open hook (stub).
 * Footer Contact increments openCount; overlay UI lands in a later ticket.
 */
@Injectable({ providedIn: 'root' })
export class ContactOverlay {
  readonly openCount = signal(0);

  open(): void {
    this.openCount.update((count) => count + 1);
  }
}
