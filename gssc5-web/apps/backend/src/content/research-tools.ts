import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  classifyLoginTokenRow,
  hashLoginToken,
  loginTokenCookie,
  loginTokenFromCookie,
  type CookieJar,
} from "../user/login-session";

const ResearchToolEntry = t.Object({
  cuid: t.String(),
  title: t.String(),
  referenceLink: t.String(),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean; isToolEditor: boolean } };

type ToolRow = { id: string; title: string; referenceLink: string };

function toEntry(row: ToolRow) {
  return {
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
  };
}

function canEditTools(user: { isAdmin: boolean; isToolEditor: boolean }): boolean {
  return user.isAdmin || user.isToolEditor;
}

async function openSession(cookie: CookieJar): Promise<Session> {
  const token = loginTokenFromCookie(cookie);
  if (token === null) return { failure: "missing" };

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashLoginToken(token) },
    include: {
      user: { select: { isAdmin: true, isToolEditor: true } },
    },
  });
  const classified = classifyLoginTokenRow(row);
  if (classified === "ok" && row) return { user: row.user };
  return { failure: classified === "ok" ? "unknown" : classified };
}

function bodyRecord(
  body: unknown,
): Record<string, unknown> | "missing" | "malformed" {
  if (body === undefined || body === null) return "missing";
  if (typeof body !== "object" || Array.isArray(body)) return "malformed";
  return body as Record<string, unknown>;
}

function trimStrings(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") {
      (value as Record<string, unknown>)[key] = entry.trim();
    }
  }
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
): string | "missing" | "invalid" {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return "missing";
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) return "invalid";
  return value;
}

/** Research tools catalog (GSSC5-18). */
export const researchTools = new Elysia({
  name: "content-research-tools",
  prefix: "/research-tools",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ status }) => {
      // @relation(GSSC-BLLR-345, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const rows = await prisma.researchTool.findMany({
        orderBy: { title: "asc" },
      });
      return status(200, rows.map(toEntry));
      // @relation(GSSC-BLLR-345, scope=range_end, role=Implementation)
    },
    {
      response: {
        200: t.Array(ResearchToolEntry),
      },
    },
  )
  .post(
    "/",
    async ({ body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-350, scope=range_start, role=Implementation)
      if (!canEditTools(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-350, scope=range_end, role=Implementation)

      const record = bodyRecord(body);
      if (record === "malformed" || record === "missing") {
        return status(422, "Invalid" as const);
      }
      const title = readRequiredString(record, "title");
      const referenceLink = readRequiredString(record, "referenceLink");
      if (title === "missing" || title === "invalid") {
        return status(422, "Invalid" as const);
      }
      if (referenceLink === "missing" || referenceLink === "invalid") {
        return status(422, "Invalid" as const);
      }

      // @relation(GSSC-BLLR-346, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const created = await prisma.researchTool.create({
        data: { title, referenceLink },
      });
      return status(200, toEntry(created));
      // @relation(GSSC-BLLR-346, scope=range_end, role=Implementation)
    },
    {
      body: t.Optional(t.Unknown()),
      cookie: loginTokenCookie,
      response: {
        200: ResearchToolEntry,
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, status }) => {
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-347, scope=range_start, role=Implementation)
      return status(200, toEntry(row));
      // @relation(GSSC-BLLR-347, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      response: {
        200: ResearchToolEntry,
        404: t.Literal("Not Found"),
      },
    },
  )
  .patch(
    "/:cuid",
    async ({ params, body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-351, scope=range_start, role=Implementation)
      if (!canEditTools(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-351, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const existing = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      const record = bodyRecord(body);
      if (record === "malformed" || record === "missing") {
        return status(422, "Invalid" as const);
      }

      const data: { title?: string; referenceLink?: string } = {};
      if (Object.prototype.hasOwnProperty.call(record, "title")) {
        const title = readRequiredString(record, "title");
        if (title === "missing" || title === "invalid") {
          return status(422, "Invalid" as const);
        }
        data.title = title;
      }
      if (Object.prototype.hasOwnProperty.call(record, "referenceLink")) {
        const referenceLink = readRequiredString(record, "referenceLink");
        if (referenceLink === "missing" || referenceLink === "invalid") {
          return status(422, "Invalid" as const);
        }
        data.referenceLink = referenceLink;
      }
      if (Object.keys(data).length === 0) return status(422, "Invalid" as const);

      // @relation(GSSC-BLLR-348, scope=range_start, role=Implementation)
      const updated = await prisma.researchTool.update({
        where: { id: existing.id },
        data,
      });
      return status(200, toEntry(updated));
      // @relation(GSSC-BLLR-348, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: t.Optional(t.Unknown()),
      cookie: loginTokenCookie,
      response: {
        200: ResearchToolEntry,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .delete(
    "/:cuid",
    async ({ params, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-352, scope=range_start, role=Implementation)
      if (!canEditTools(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-352, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const existing = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-349, scope=range_start, role=Implementation)
      await prisma.researchTool.delete({ where: { id: existing.id } });
      return status(204, undefined);
      // @relation(GSSC-BLLR-349, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
      },
    },
  );
