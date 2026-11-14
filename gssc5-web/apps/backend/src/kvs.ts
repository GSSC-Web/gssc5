import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import { getPrisma } from "./db";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "./user/login-session";

const KeyValueEntry = t.Object({
  key: t.String(),
  value: t.String(),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean } };

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
    async ({ params, body, cookie, status }) => {
      // @relation(GSSC-BLLR-297, scope=range_start, role=Implementation)
      const session = await openSession(cookie);
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

      // @relation(GSSC-BLLR-296, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      await prisma.keyValue.upsert({
        where: { key: params.key },
        create: { key: params.key, value },
        update: { value },
      });
      return status(204, undefined);
      // @relation(GSSC-BLLR-296, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        key: t.String({ minLength: 1 }),
      }),
      body: t.Optional(t.Unknown()),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  );

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    isAdmin: true,
  });
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
