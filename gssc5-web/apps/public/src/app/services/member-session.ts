import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

/** Legacy key cleared on logout so older sessions do not leave a Login Token behind. */
const LEGACY_TOKEN_KEY = 'gssc.memberSessionToken';
const NAME_KEY = 'gssc.memberDisplayName';

@Injectable({ providedIn: 'root' })
export class MemberSession {
  readonly loggedIn = signal(false);
  readonly displayName = signal(readStored(NAME_KEY) ?? '');
  /** Administrator visitor flag for public UI gates; backend role wiring is separate. */
  readonly isAdministrator = signal(false);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      // Login Token arrives via HttpOnly cookie; credentialed challenge reads it.
      const { data, error } = await backend.challenge.post({});
      if (error || data !== 'valid') {
        this.clearLocal();
        return;
      }
      this.loggedIn.set(true);
    } catch {
      this.clearLocal();
    }
  }

  /**
   * Record a successful members session for UI (greeting). The Login Token itself
   * lives only in the HttpOnly cookie set by the backend.
   */
  setSession(displayName: string): void;
  /** @deprecated Prefer setSession(displayName). Token argument is ignored. */
  setSession(token: string, displayName: string): void;
  setSession(tokenOrName: string, displayName?: string): void {
    const name = displayName ?? tokenOrName;
    this.displayName.set(name);
    writeStored(NAME_KEY, name);
    writeStored(LEGACY_TOKEN_KEY, null);
    this.loggedIn.set(true);
  }

  /** @deprecated Prefer setSession(displayName). */
  setToken(token: string, displayName = 'Member'): void {
    this.setSession(token, displayName);
  }

  async logout(): Promise<void> {
    this.clearLocal();
    try {
      await backend.logout.post({});
    } catch {
      // Backend logout is best-effort once the public session is cleared.
    }
  }

  private clearLocal(): void {
    this.displayName.set('');
    writeStored(NAME_KEY, null);
    writeStored(LEGACY_TOKEN_KEY, null);
    this.loggedIn.set(false);
    this.isAdministrator.set(false);
  }
}

function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null): void {
  try {
    if (!globalThis.localStorage) return;
    if (value === null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in some test environments.
  }
}
