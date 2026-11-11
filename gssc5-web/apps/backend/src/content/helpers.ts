import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  classifyLoginTokenRow,
  hashLoginToken,
  loginTokenFromCookie,
  type CookieJar,
} from "../user/login-session";

/** @relation(GSSC-BLLR-342, scope=range_start, role=Implementation) */
/** Bit 0 = regular member; bit 1 = user moderator. Admin always allowed (BLLR-332). */
export const PERM_MEMBER = 0o1;
export const PERM_USER_MOD = 0o2;
/** @relation(GSSC-BLLR-342, scope=range_end, role=Implementation) */

export type SessionUser = { isAdmin: boolean; isUserMod: boolean };
export type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: SessionUser };

export type ContentTemplateRow = {
  id: string;
  name: string;
  isPublic: boolean;
  tags: string;
  createPerm: number;
  modifyPerm: number;
  deletePerm: number;
};

export type EntryRow = {
  id: string;
  datatype: string;
  header: string | null;
  body: string;
  resources: string;
  tags: string;
  index: number;
  isPublic: boolean;
  createPerm: number;
  modifyPerm: number;
  deletePerm: number;
  templateId: string | null;
};

export async function openSession(cookie: CookieJar): Promise<Session> {
  const token = loginTokenFromCookie(cookie);
  if (token === null) return { failure: "missing" };

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashLoginToken(token) },
    include: { user: { select: { isAdmin: true, isUserMod: true } } },
  });
  const classified = classifyLoginTokenRow(row);
  if (classified === "ok" && row) return { user: row.user };
  return { failure: classified === "ok" ? "unknown" : classified };
}

export function hasPerm(user: SessionUser, mask: number): boolean {
  // @relation(GSSC-BLLR-332, scope=range_start, role=Implementation)
  if (user.isAdmin) return true;
  // @relation(GSSC-BLLR-332, scope=range_end, role=Implementation)
  if (user.isUserMod && (mask & PERM_USER_MOD) !== 0) return true;
  if ((mask & PERM_MEMBER) !== 0) return true;
  return false;
}

export function parseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function optionalStringArray(value: unknown): string[] | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return "invalid";
  if (!value.every((item) => typeof item === "string")) return "invalid";
  return value as string[];
}

export function optionalPerm(value: unknown): number | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return "invalid";
  return value;
}

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function bodyRecord(body: unknown): Record<string, unknown> | "missing" | "malformed" {
  if (body === undefined || body === null) return "missing";
  if (typeof body !== "object" || Array.isArray(body)) return "malformed";
  return body as Record<string, unknown>;
}

export function trimStrings(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "string") (value as Record<string, unknown>)[key] = item.trim();
  }
}
