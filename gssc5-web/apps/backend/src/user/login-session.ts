import { createHash } from "node:crypto";

import { Cookie, t } from "elysia";

/** HTTP cookie that carries the Login Token for the client. */
export const LOGIN_TOKEN_COOKIE = "gssc_login_token" as const;

/** Elysia cookie schema: Login Token attributes applied by the framework. */
export const loginTokenCookie = t.Cookie(
  {
    [LOGIN_TOKEN_COOKIE]: t.Optional(t.String()),
  },
  {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  },
);

export type CookieJar = Record<string, Cookie<unknown>>;

export type LoginSessionFailure = "missing" | "unknown" | "logged-out" | "expired";

/** Hash used when storing a Login Token in durable login_tokens rows. */
export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Resolve the Login Token from Elysia's cookie jar. */
export function loginTokenFromCookie(cookie: CookieJar): string | null {
  const value = cookie[LOGIN_TOKEN_COOKIE]?.value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Issue the Login Token through Elysia's Cookie.set. */
export function setLoginTokenCookie(
  cookie: CookieJar,
  token: string,
  maxAgeSeconds: number,
  expiresAt: Date,
): void {
  cookie[LOGIN_TOKEN_COOKIE].set({
    value: token,
    maxAge: maxAgeSeconds,
    expires: expiresAt,
  });
}

/** Clear the Login Token through Elysia's Cookie.remove. */
export function clearLoginTokenCookie(cookie: CookieJar): void {
  cookie[LOGIN_TOKEN_COOKIE]?.remove();
}

export function classifyLoginTokenRow(
  row: { loggedOutAt: Date | null; expiresAt: Date } | null | undefined,
): Exclude<LoginSessionFailure, "missing"> | "ok" {
  if (!row) return "unknown";
  if (row.loggedOutAt) return "logged-out";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "ok";
}
