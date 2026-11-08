import { Injectable } from '@angular/core';

/** Default local Member Frontend origin (GSSC5-22 proposal). */
export const DEFAULT_MEMBERS_APP_ORIGIN = 'http://localhost:4201';

@Injectable({ providedIn: 'root' })
export class MembersApp {
  readonly origin = DEFAULT_MEMBERS_APP_ORIGIN;

  /** Last navigation target; tests assert this instead of performing a real assign. */
  lastNavigation: string | null = null;

  /**
   * When false, navigate() only records lastNavigation (unit tests).
   * Production leaves this true so Login / Member Access leave the public app.
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
