import { Injectable, signal } from '@angular/core';
import { backend } from './backend';

/** Legacy key cleared on logout so older sessions do not leave a Login Token behind. */
const LEGACY_TOKEN_KEY = 'gssc.memberSessionToken';
const NAME_KEY = 'gssc.memberDisplayName';

type ChallengeReport =
  | { status: 'valid'; cuid: string }
  | { status: 'invalid' };

type AccountView = {
  cuid?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  isAdmin?: boolean;
  isUserMod?: boolean;
  isNewsletterEditor?: boolean;
  isPublicationEditor?: boolean;
  isToolEditor?: boolean;
};

export type LoginCredentials = {
  identity: string;
  password: string;
};

/**
 * Treaty calls used by MemberSession. Mutable object so unit tests can stub
 * challenge / profile / login / logout without fighting Eden Treaty proxies.
 */
export const memberSessionApi = {
  challenge: () => backend.challenge.post({}),
  getUser: (cuid: string) => backend.users({ cuid }).get(),
  login: (body: { username: string; password: string } | { primaryEmail: string; password: string }) =>
    backend.login.post(body),
  logout: () => backend.logout.post({}),
};

@Injectable({ providedIn: 'root' })
export class MemberSession {
  readonly loggedIn = signal(false);
  readonly displayName = signal(readStored(NAME_KEY) ?? '');
  /** Logged-in member cuid from the last successful hydrate. */
  readonly cuid = signal('');
  /** True when the hydrated account is an administrator. */
  readonly isAdmin = signal(false);
  /** True when the hydrated account is a user moderator (administrators included by backend flags). */
  readonly isUserMod = signal(false);
  /** True when the hydrated account may mutate society newsletters (administrators also may). */
  readonly isNewsletterEditor = signal(false);
  /** True when the hydrated account may edit the publications catalog (administrators included). */
  readonly isPublicationEditor = signal(false);
  /** True when the hydrated account may edit the research tools catalog (administrators included). */
  readonly isToolEditor = signal(false);
  /** True after the first challenge/hydrate attempt finishes (success or fail). */
  readonly ready = signal(false);

  private readyWaiters: Array<() => void> = [];

  constructor() {
    void this.refresh();
  }

  /** Resolves once the initial (or in-flight) session refresh has settled. */
  whenReady(): Promise<void> {
    if (this.ready()) return Promise.resolve();
    return new Promise((resolve) => {
      this.readyWaiters.push(resolve);
    });
  }

  async refresh(): Promise<void> {
    try {
      // Login Token arrives via HttpOnly cookie; credentialed challenge reads it.
      // @relation(GSSC-MLLR-67, scope=range_start, role=Implementation)
      const { data, error } = await memberSessionApi.challenge();
      const report = asChallengeReport(data);
      if (error || !report || report.status !== 'valid') {
        // @relation(GSSC-MLLR-68, scope=range_start, role=Implementation)
        this.clearLocal();
        // @relation(GSSC-MLLR-68, scope=range_end, role=Implementation)
        return;
      }
      // @relation(GSSC-MLLR-67, scope=range_end, role=Implementation)

      const profile = await memberSessionApi.getUser(report.cuid);
      if (profile.error || !profile.data) {
        this.clearLocal();
        return;
      }

      this.applyAccount(profile.data as AccountView);
    } catch {
      this.clearLocal();
    } finally {
      this.markReady();
    }
  }

  /**
   * Submit credentials to the Unified Backend. On success, hydrates UI session
   * from challenge + account view. Cookie/token stay HttpOnly.
   */
  // @relation(GSSC-MLLR-69, GSSC-MLLR-70, GSSC-MLLR-71, scope=range_start, role=Implementation)
  async login(credentials: LoginCredentials): Promise<boolean> {
    const identity = credentials.identity.trim();
    const password = credentials.password;
    if (!identity || !password) {
      this.clearLocal();
      this.markReady();
      return false;
    }

    const body = looksLikeEmail(identity)
      ? { primaryEmail: identity, password }
      : { username: identity, password };

    try {
      const { error } = await memberSessionApi.login(body);
      if (error) {
        this.clearLocal();
        this.markReady();
        return false;
      }
      await this.refresh();
      return this.loggedIn();
    } catch {
      this.clearLocal();
      this.markReady();
      return false;
    }
  }
  // @relation(GSSC-MLLR-69, GSSC-MLLR-70, GSSC-MLLR-71, scope=range_end, role=Implementation)

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
    this.cuid.set(typeof user.cuid === 'string' ? user.cuid : '');
    this.isAdmin.set(user.isAdmin === true);
    // Administrators are user moderators for FE role gates (admin ⊃ userMod).
    this.isUserMod.set(user.isAdmin === true || user.isUserMod === true);
    this.isNewsletterEditor.set(user.isNewsletterEditor === true);
    // Administrators cover publication/tool editor gates (admin ⊃ editor roles).
    this.isPublicationEditor.set(
      user.isAdmin === true || user.isPublicationEditor === true,
    );
    this.isToolEditor.set(user.isAdmin === true || user.isToolEditor === true);
    this.setSession(displayNameFromAccount(user));
  }

  private clearLocal(): void {
    this.displayName.set('');
    this.cuid.set('');
    this.isAdmin.set(false);
    this.isUserMod.set(false);
    this.isNewsletterEditor.set(false);
    this.isPublicationEditor.set(false);
    this.isToolEditor.set(false);
    writeStored(NAME_KEY, null);
    writeStored(LEGACY_TOKEN_KEY, null);
    this.loggedIn.set(false);
  }

  private markReady(): void {
    this.ready.set(true);
    const waiters = this.readyWaiters;
    this.readyWaiters = [];
    for (const resolve of waiters) resolve();
  }
}

function looksLikeEmail(value: string): boolean {
  return value.includes('@');
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
