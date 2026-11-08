import { createHash } from "node:crypto";

import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import { getPrisma } from "./db";

const KeyValueEntry = t.Object({
  key: t.String(),
  value: t.String(),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" | "malformed" }
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
      if (!row) return status(404, undefined);
      return status(200, { key: row.key, value: row.value });
      // @relation(GSSC-BLLR-293, GSSC-BLLR-294, GSSC-BLLR-295, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        key: t.String({ minLength: 1 }),
      }),
      response: {
        200: KeyValueEntry,
        404: t.Void(),
      },
    },
  )
  .post(
    "/:key",
    async ({ params, body, status }) => {
      // @relation(GSSC-BLLR-297, scope=range_start, role=Implementation)
      const session = await openSession(body);
      if ("failure" in session) {
        if (session.failure === "malformed") return status(422, "Invalid" as const);
        return status(403, "Forbidden" as const);
      }
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

async function openSession(body: unknown): Promise<Session> {
  const record = bodyRecord(body);
  if (record === "malformed") return { failure: "malformed" };
  if (record === "missing" || !Object.prototype.hasOwnProperty.call(record, "token")) {
    return { failure: "missing" };
  }
  const token = record.token;
  if (typeof token !== "string") return { failure: "unknown" };

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
