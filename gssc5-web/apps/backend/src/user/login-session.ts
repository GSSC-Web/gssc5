import { createHash } from "node:crypto";

/** HTTP cookie that carries the Login Token for the client. */
export const LOGIN_TOKEN_COOKIE = "gssc_login_token";

export type CookieJar = Record<
  string,
  {
    value?: unknown;
    set: (config: Record<string, unknown>) => unknown;
    remove?: () => unknown;
  }
>;

export type LoginSessionFailure = "missing" | "unknown" | "logged-out" | "expired";

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Resolve the Login Token from the HTTP cookie. */
export function loginTokenFromCookie(cookie: CookieJar): string | null {
  const value = cookie[LOGIN_TOKEN_COOKIE]?.value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function loginTokenCookieOptions(maxAgeSeconds: number, expiresAt?: Date): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function setLoginTokenCookie(
  cookie: CookieJar,
  token: string,
  maxAgeSeconds: number,
  expiresAt: Date,
): void {
  cookie[LOGIN_TOKEN_COOKIE].set({
    value: token,
    ...loginTokenCookieOptions(maxAgeSeconds, expiresAt),
  });
}

export function clearLoginTokenCookie(cookie: CookieJar): void {
  const entry = cookie[LOGIN_TOKEN_COOKIE];
  if (!entry) return;
  if (typeof entry.remove === "function") {
    entry.remove();
    return;
  }
  entry.set({
    value: "",
    ...loginTokenCookieOptions(0),
  });
}

export function classifyLoginTokenRow(
  row: { loggedOutAt: Date | null; expiresAt: Date } | null | undefined,
): Exclude<LoginSessionFailure, "missing"> | "ok" {
  if (!row) return "unknown";
  if (row.loggedOutAt) return "logged-out";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "ok";
}
