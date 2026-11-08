import { createHash } from "node:crypto";

import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import { getPrisma } from "./db";

/** HTTP cookie that carries the Login Token (matches GSSC5-48 name). */
export const LOGIN_TOKEN_COOKIE = "gssc_login_token";

const KeyValueEntry = t.Object({
  key: t.String(),
  value: t.String(),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean } };

type CookieJar = Record<
  string,
  {
    value?: unknown;
  }
>;

/** Global website key-value store (GSSC-BHLR-119 / GSSC5-43). */
export const kvs = new Elysia({
  name: "kvs",
  prefix: "/kvs",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/:key",
    async ({ params, status }) => {
      // @relation(GSSC-BLLR-293, GSSC-BLLR-294, GSSC-BLLR-295, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.keyValue.findUnique({ where: { key: params.key } });
      if (!row) return status(404, "Not Found" as const);
      return status(200, { key: row.key, value: row.value });
      // @relation(GSSC-BLLR-293, GSSC-BLLR-294, GSSC-BLLR-295, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        key: t.String({ minLength: 1 }),
      }),
      response: {
        200: KeyValueEntry,
        404: t.Literal("Not Found"),
      },
    },
  )
  .post(
    "/:key",
    async ({ params, body, cookie, request, status }) => {
      // @relation(GSSC-BLLR-297, scope=range_start, role=Implementation)
      const session = await openSession(loginTokenFromCookie(cookie, request));
      if ("failure" in session) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-297, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-298, GSSC-BLLR-299, scope=range_start, role=Implementation)
      if (!session.user.isAdmin) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-298, GSSC-BLLR-299, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-300, scope=range_start, role=Implementation)
      const record = bodyRecord(body);
      if (record === "malformed" || record === "missing") {
        return status(422, "Invalid" as const);
      }
      if (!Object.prototype.hasOwnProperty.call(record, "value")) {
        return status(422, "Invalid" as const);
      }
      const value = record.value;
      if (typeof value !== "string") return status(422, "Invalid" as const);
      // @relation(GSSC-BLLR-300, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-296, GSSC-BLLR-301, GSSC-BLLR-302, GSSC-BLLR-303, GSSC-BLLR-304, GSSC-BLLR-305, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      await prisma.keyValue.upsert({
        where: { key: params.key },
        create: { key: params.key, value },
        update: { value },
      });
      return status(204, undefined);
      // @relation(GSSC-BLLR-296, GSSC-BLLR-301, GSSC-BLLR-302, GSSC-BLLR-303, GSSC-BLLR-304, GSSC-BLLR-305, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        key: t.String({ minLength: 1 }),
      }),
      body: t.Optional(t.Unknown()),
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  );

async function openSession(token: string | null): Promise<Session> {
  if (token === null || token === "") return { failure: "missing" };

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { isAdmin: true } } },
  });
  if (!row) return { failure: "unknown" };
  if (row.loggedOutAt) return { failure: "logged-out" };
  if (row.expiresAt.getTime() <= Date.now()) return { failure: "expired" };
  return { user: row.user };
}

function loginTokenFromCookie(cookie: CookieJar, request: Request): string | null {
  const fromJar = cookie[LOGIN_TOKEN_COOKIE]?.value;
  if (typeof fromJar === "string" && fromJar.trim() !== "") return fromJar.trim();

  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== LOGIN_TOKEN_COOKIE) continue;
    const value = trimmed.slice(eq + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}

function bodyRecord(body: unknown): Record<string, unknown> | "missing" | "malformed" {
  if (body === undefined || body === null) return "missing";
  if (typeof body !== "object" || Array.isArray(body)) return "malformed";
  return body as Record<string, unknown>;
}

function trimStrings(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "string") (value as Record<string, unknown>)[key] = item.trim();
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
