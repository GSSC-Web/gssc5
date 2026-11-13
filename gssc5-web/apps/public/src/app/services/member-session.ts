import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

/** Legacy key cleared on logout so older sessions do not leave a Login Token behind. */
const LEGACY_TOKEN_KEY = 'gssc.memberSessionToken';
const NAME_KEY = 'gssc.memberDisplayName';
const EMAIL_KEY = 'gssc.memberEmailAddress';

/**
 * Treaty calls used by MemberSession. Mutable object so unit tests can stub
 * logout/challenge without fighting Eden Treaty proxies.
 */
export const memberSessionApi = {
  challenge: () => backend.challenge.post({}),
  logout: () => backend.logout.post({}),
};

@Injectable({ providedIn: 'root' })
export class MemberSession {
  readonly loggedIn = signal(false);
  readonly displayName = signal(readStored(NAME_KEY) ?? '');
  /** Member email for public UI autofill (Contact Overlay); not the Login Token. */
  readonly emailAddress = signal(readStored(EMAIL_KEY) ?? '');
  /** Administrator visitor flag for public UI gates; backend role wiring is separate. */
  readonly isAdministrator = signal(false);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      // Login Token arrives via HttpOnly cookie; credentialed challenge reads it.
      const { data, error } = await memberSessionApi.challenge();
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

  /** Record member email for public UI autofill. */
  setEmailAddress(email: string): void {
    this.emailAddress.set(email);
    writeStored(EMAIL_KEY, email || null);
  }

  /**
   * End the backend Login Token first, then clear public UI session state.
   * On logout failure, keep the local UI logged-in so it does not diverge from
   * a still-live cookie/row (GSSC-PLLR-64 / GSSC5-59).
   */
  async logout(): Promise<boolean> {
    try {
      const { error } = await memberSessionApi.logout();
      if (error) {
        return false;
      }
    } catch {
      return false;
    }
    this.clearLocal();
    return true;
  }

  private clearLocal(): void {
    this.displayName.set('');
    this.emailAddress.set('');
    writeStored(NAME_KEY, null);
    writeStored(EMAIL_KEY, null);
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
