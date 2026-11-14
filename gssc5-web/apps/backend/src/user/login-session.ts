import { createHash } from "node:crypto";

import { Cookie, t } from "elysia";

import type { Prisma, PrismaClient, User } from "../generated/prisma/client";

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

export type LoginSessionOutcome<TUser> =
  | { failure: LoginSessionFailure }
  | { user: TUser };

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
  row: { expiresAt: Date } | null | undefined,
): Exclude<LoginSessionFailure, "missing" | "logged-out"> | "ok" {
  if (!row) return "unknown";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "ok";
}

/**
 * Shared authenticated-session resolver: cookie → hash → loginToken.findUnique
 * → classify → user payload. Pass a Prisma user `select` to project fields, or
 * omit for the full User row.
 */
// @relation(GSSC-BLLR-42, GSSC-BLLR-48, GSSC-BLLR-56, GSSC-BLLR-67, GSSC-BLLR-68, GSSC-BLLR-69, GSSC-BLLR-133, GSSC-BLLR-134, GSSC-BLLR-135, GSSC-BLLR-166, GSSC-BLLR-167, GSSC-BLLR-168, scope=range_start, role=Implementation)
export async function resolveLoginSessionUser(
  prisma: PrismaClient,
  cookie: CookieJar,
): Promise<LoginSessionOutcome<User>>;
export async function resolveLoginSessionUser<TSelect extends Prisma.UserSelect>(
  prisma: PrismaClient,
  cookie: CookieJar,
  userSelect: TSelect,
): Promise<LoginSessionOutcome<Prisma.UserGetPayload<{ select: TSelect }>>>;
export async function resolveLoginSessionUser(
  prisma: PrismaClient,
  cookie: CookieJar,
  userSelect?: Prisma.UserSelect,
): Promise<LoginSessionOutcome<any>> {
  const token = loginTokenFromCookie(cookie);
  if (token === null) return { failure: "missing" };

  const row = userSelect
    ? await prisma.loginToken.findUnique({
        where: { tokenHash: hashLoginToken(token) },
        include: { user: { select: userSelect } },
      })
    : await prisma.loginToken.findUnique({
        where: { tokenHash: hashLoginToken(token) },
        include: { user: true },
      });
  const classified = classifyLoginTokenRow(row);
  if (classified === "ok" && row) return { user: row.user };
  return { failure: classified === "ok" ? "unknown" : classified };
}
// @relation(GSSC-BLLR-42, GSSC-BLLR-48, GSSC-BLLR-56, GSSC-BLLR-67, GSSC-BLLR-68, GSSC-BLLR-69, GSSC-BLLR-133, GSSC-BLLR-134, GSSC-BLLR-135, GSSC-BLLR-166, GSSC-BLLR-167, GSSC-BLLR-168, scope=range_end, role=Implementation)
