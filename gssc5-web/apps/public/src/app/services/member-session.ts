import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

const TOKEN_KEY = 'gssc.memberSessionToken';

@Injectable({ providedIn: 'root' })
export class MemberSession {
  private readonly token = signal<string | null>(readStoredToken());
  readonly loggedIn = signal(false);

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

  setToken(token: string): void {
    this.token.set(token);
    writeStoredToken(token);
    this.loggedIn.set(true);
  }

  async logout(): Promise<void> {
    const current = this.token();
    // End the public session immediately so the visitor stays on the page as logged out.
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
    writeStoredToken(null);
    this.loggedIn.set(false);
  }
}

function readStoredToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (!globalThis.localStorage) return;
    if (token === null) globalThis.localStorage.removeItem(TOKEN_KEY);
    else globalThis.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage may be unavailable in some test environments.
  }
}
