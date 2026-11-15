import { Injectable } from '@angular/core';

/**
 * In-memory exclusive-edit registry for Member Frontend Generic Editor instances.
 * Wave 7 hosts may replace or wrap this with a backend lock client when available.
 */
@Injectable({ providedIn: 'root' })
export class EditorSession {
  /** resourceId → holderId currently holding exclusive edit. */
  private readonly holders = new Map<string, string>();

  // @relation(GSSC-MLLR-196, GSSC-MLLR-197, GSSC-MLLR-198, scope=range_start, role=Implementation)
  /** Acquire exclusive edit for `resourceId`. Returns false when another holder already has it. */
  tryAcquire(resourceId: string, holderId: string): boolean {
    const current = this.holders.get(resourceId);
    if (current != null && current !== holderId) return false;
    this.holders.set(resourceId, holderId);
    return true;
  }

  /** True when a different holder already owns exclusive edit for `resourceId`. */
  isHeldByOther(resourceId: string, holderId: string): boolean {
    const current = this.holders.get(resourceId);
    return current != null && current !== holderId;
  }

  /** Release exclusive edit when this holder still owns it. */
  release(resourceId: string, holderId: string): void {
    if (this.holders.get(resourceId) === holderId) {
      this.holders.delete(resourceId);
    }
  }
  // @relation(GSSC-MLLR-196, GSSC-MLLR-197, GSSC-MLLR-198, scope=range_end, role=Implementation)
}
