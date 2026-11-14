import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  ResearchToolPlain,
  ResearchToolPlainInputCreate,
} from "../generated/prismabox/ResearchTool";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`).
 */
const ResearchToolEntry = t.Object({
  cuid: ResearchToolPlain.properties.id,
  title: ResearchToolPlain.properties.title,
  referenceLink: ResearchToolPlain.properties.referenceLink,
});

/**
 * Create body from Prismabox create input. `additionalProperties: true` keeps
 * ignored extras so auth can return 403 before a schema reject surfaces as 422.
 */
const ResearchToolCreateBody = t.Object(
  {
    title: ResearchToolPlainInputCreate.properties.title,
    referenceLink: ResearchToolPlainInputCreate.properties.referenceLink,
  },
  { additionalProperties: true },
);

/** Patch body: same scalars, all optional; handler rejects empty patches. */
const ResearchToolUpdateBody = t.Object(
  {
    title: t.Optional(ResearchToolPlain.properties.title),
    referenceLink: t.Optional(ResearchToolPlain.properties.referenceLink),
  },
  { additionalProperties: true },
);

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
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    isAdmin: true,
    isToolEditor: true,
  });
}

function trimStrings(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") {
      (value as Record<string, unknown>)[key] = entry.trim();
    }
  }
}

/** Research tools catalog (GSSC5-18). */
export const researchTools = new Elysia({
  name: "content-research-tools",
  prefix: "/research-tools",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({
    researchTool: ResearchToolPlain,
    researchToolCreate: ResearchToolPlainInputCreate,
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

      // @relation(GSSC-BLLR-346, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const created = await prisma.researchTool.create({
        data: { title: body.title, referenceLink: body.referenceLink },
      });
      return status(200, toEntry(created));
      // @relation(GSSC-BLLR-346, scope=range_end, role=Implementation)
    },
    {
      body: ResearchToolCreateBody,
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

      const data: { title?: string; referenceLink?: string } = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.referenceLink !== undefined) data.referenceLink = body.referenceLink;
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
      body: ResearchToolUpdateBody,
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
