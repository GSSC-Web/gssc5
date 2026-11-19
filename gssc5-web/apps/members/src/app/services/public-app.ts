import { Injectable } from '@angular/core';

/** Default local Public Frontend origin (mirrors Public MembersApp). */
export const DEFAULT_PUBLIC_APP_ORIGIN = 'http://localhost:4200';

@Injectable({ providedIn: 'root' })
export class PublicApp {
  readonly origin = DEFAULT_PUBLIC_APP_ORIGIN;

  /** Last navigation target; tests assert this instead of performing a real assign. */
  lastNavigation: string | null = null;

  /**
   * When false, navigate() only records lastNavigation (unit tests).
   * Production leaves this true so Public Access leaves the members app.
   */
  assignLocation = true;

  navigate(): void {
    this.lastNavigation = this.origin;
    if (!this.assignLocation) return;
    if (typeof globalThis.location?.assign === 'function') {
      globalThis.location.assign(this.origin);
    }
  }
}
