import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

/** Legacy key cleared on logout so older sessions do not leave a Login Token behind. */
const LEGACY_TOKEN_KEY = 'gssc.memberSessionToken';
const NAME_KEY = 'gssc.memberDisplayName';

type ChallengeReport =
  | { status: 'valid'; cuid: string }
  | { status: 'invalid' };

type AccountView = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
};

/**
 * Treaty calls used by MemberSession. Mutable object so unit tests can stub
 * challenge / profile / logout without fighting Eden Treaty proxies.
 * Fuller session/hydration ownership expands under GSSC5-87.
 */
export const memberSessionApi = {
  challenge: () => backend.challenge.post({}),
  getUser: (cuid: string) => backend.users({ cuid }).get(),
  logout: () => backend.logout.post({}),
};

@Injectable({ providedIn: 'root' })
export class MemberSession {
  readonly loggedIn = signal(false);
  readonly displayName = signal(readStored(NAME_KEY) ?? '');

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      // Login Token arrives via HttpOnly cookie; credentialed challenge reads it.
      const { data, error } = await memberSessionApi.challenge();
      const report = asChallengeReport(data);
      if (error || !report || report.status !== 'valid') {
        this.clearLocal();
        return;
      }

      const profile = await memberSessionApi.getUser(report.cuid);
      if (profile.error || !profile.data) {
        this.clearLocal();
        return;
      }

      this.applyAccount(profile.data as AccountView);
    } catch {
      this.clearLocal();
    }
  }

  /**
   * Record a successful members session for UI (greeting). The Login Token itself
   * lives only in the HttpOnly cookie set by the backend.
   */
  setSession(displayName: string): void {
    this.displayName.set(displayName);
    writeStored(NAME_KEY, displayName);
    writeStored(LEGACY_TOKEN_KEY, null);
    this.loggedIn.set(true);
  }

  /**
   * End the backend Login Token first, then clear Member Frontend session state.
   * On logout failure, keep the local UI logged-in so it does not diverge from
   * a still-live cookie/row.
   */
  // @relation(GSSC-MLLR-26, scope=range_start, role=Implementation)
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
  // @relation(GSSC-MLLR-26, scope=range_end, role=Implementation)

  private applyAccount(user: AccountView): void {
    this.setSession(displayNameFromAccount(user));
  }

  private clearLocal(): void {
    this.displayName.set('');
    writeStored(NAME_KEY, null);
    writeStored(LEGACY_TOKEN_KEY, null);
    this.loggedIn.set(false);
  }
}

function asChallengeReport(data: unknown): ChallengeReport | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { status?: unknown; cuid?: unknown };
  if (record.status === 'invalid') return { status: 'invalid' };
  if (
    record.status === 'valid' &&
    typeof record.cuid === 'string' &&
    record.cuid.length > 0
  ) {
    return { status: 'valid', cuid: record.cuid };
  }
  return null;
}

function displayNameFromAccount(user: AccountView): string {
  const parts = [user.firstName, user.lastName].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(' ');
  return typeof user.username === 'string' ? user.username.trim() : '';
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
