import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

const TOKEN_KEY = 'gssc.memberSessionToken';
const NAME_KEY = 'gssc.memberDisplayName';

@Injectable({ providedIn: 'root' })
export class MemberSession {
  private readonly token = signal<string | null>(readStored(TOKEN_KEY));
  readonly loggedIn = signal(false);
  readonly displayName = signal(readStored(NAME_KEY) ?? '');

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const current = this.token();
    if (!current) {
      this.loggedIn.set(false);
      return;
    }
    try {
      const { data, error } = await backend.challenge.post({ token: current });
      if (this.token() !== current) return;
      if (error || data !== 'valid') {
        this.clearLocal();
        return;
      }
      this.loggedIn.set(true);
    } catch {
      if (this.token() !== current) return;
      this.clearLocal();
    }
  }

  setSession(token: string, displayName: string): void {
    this.token.set(token);
    writeStored(TOKEN_KEY, token);
    this.displayName.set(displayName);
    writeStored(NAME_KEY, displayName);
    this.loggedIn.set(true);
  }

  /** @deprecated Prefer setSession(token, displayName). */
  setToken(token: string, displayName = 'Member'): void {
    this.setSession(token, displayName);
  }

  async logout(): Promise<void> {
    const current = this.token();
    this.clearLocal();
    if (!current) return;
    try {
      await backend.logout.post({ token: current });
    } catch {
      // Backend logout is best-effort once the public session is cleared.
    }
  }

  private clearLocal(): void {
    this.token.set(null);
    writeStored(TOKEN_KEY, null);
    this.displayName.set('');
    writeStored(NAME_KEY, null);
    this.loggedIn.set(false);
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
