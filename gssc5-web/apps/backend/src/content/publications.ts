import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  PublicationPlain,
  PublicationPlainInputCreate,
} from "../generated/prismabox/Publication";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`).
 */
const PublicationEntry = t.Object({
  cuid: PublicationPlain.properties.id,
  title: PublicationPlain.properties.title,
  referenceLink: PublicationPlain.properties.referenceLink,
  description: PublicationPlain.properties.description,
});

/**
 * Create body from Prismabox create input. `additionalProperties: true` keeps
 * ignored extras so auth can return 403 before a schema reject surfaces as 422.
 */
const PublicationCreateBody = t.Object(
  {
    title: PublicationPlainInputCreate.properties.title,
    referenceLink: PublicationPlainInputCreate.properties.referenceLink,
    description: t.Optional(PublicationPlain.properties.description),
  },
  { additionalProperties: true },
);

/** Patch body: same scalars, all optional; handler rejects empty patches. */
const PublicationUpdateBody = t.Object(
  {
    title: t.Optional(PublicationPlain.properties.title),
    referenceLink: t.Optional(PublicationPlain.properties.referenceLink),
    description: t.Optional(PublicationPlain.properties.description),
  },
  { additionalProperties: true },
);

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean; isPublicationEditor: boolean } };

type PublicationRow = {
  id: string;
  title: string;
  referenceLink: string;
  description: string | null;
};

function toEntry(row: PublicationRow) {
  return {
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    description: row.description,
  };
}

function canEditPublications(user: {
  isAdmin: boolean;
  isPublicationEditor: boolean;
}): boolean {
  return user.isAdmin || user.isPublicationEditor;
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    isAdmin: true,
    isPublicationEditor: true,
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

/** Empty string clears description to null (wire contract). */
function normalizeDescription(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.length === 0) return null;
  return value;
}

/** Society publications catalog (GSSC5-19). */
export const publications = new Elysia({
  name: "content-publications",
  prefix: "/publications",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({
    publication: PublicationPlain,
    publicationCreate: PublicationPlainInputCreate,
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ status }) => {
      // @relation(GSSC-BLLR-356, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const rows = await prisma.publication.findMany({
        orderBy: { title: "asc" },
      });
      return status(200, rows.map(toEntry));
      // @relation(GSSC-BLLR-356, scope=range_end, role=Implementation)
    },
    {
      response: {
        200: t.Array(PublicationEntry),
      },
    },
  )
  .post(
    "/",
    async ({ body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-361, scope=range_start, role=Implementation)
      if (!canEditPublications(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-361, scope=range_end, role=Implementation)

      const description = normalizeDescription(body.description) ?? null;

      // @relation(GSSC-BLLR-357, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const created = await prisma.publication.create({
        data: {
          title: body.title,
          referenceLink: body.referenceLink,
          description,
        },
      });
      return status(200, toEntry(created));
      // @relation(GSSC-BLLR-357, scope=range_end, role=Implementation)
    },
    {
      body: PublicationCreateBody,
      cookie: loginTokenCookie,
      response: {
        200: PublicationEntry,
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, status }) => {
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.publication.findUnique({
        where: { id: params.cuid },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-358, scope=range_start, role=Implementation)
      return status(200, toEntry(row));
      // @relation(GSSC-BLLR-358, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      response: {
        200: PublicationEntry,
        404: t.Literal("Not Found"),
      },
    },
  )
  .patch(
    "/:cuid",
    async ({ params, body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-362, scope=range_start, role=Implementation)
      if (!canEditPublications(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-362, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const existing = await prisma.publication.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      const data: {
        title?: string;
        referenceLink?: string;
        description?: string | null;
      } = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.referenceLink !== undefined) data.referenceLink = body.referenceLink;
      if (body.description !== undefined) {
        data.description = normalizeDescription(body.description) ?? null;
      }
      if (Object.keys(data).length === 0) return status(422, "Invalid" as const);

      // @relation(GSSC-BLLR-359, scope=range_start, role=Implementation)
      const updated = await prisma.publication.update({
        where: { id: existing.id },
        data,
      });
      return status(200, toEntry(updated));
      // @relation(GSSC-BLLR-359, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: PublicationUpdateBody,
      cookie: loginTokenCookie,
      response: {
        200: PublicationEntry,
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

      // @relation(GSSC-BLLR-363, scope=range_start, role=Implementation)
      if (!canEditPublications(session.user)) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-363, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const existing = await prisma.publication.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-360, scope=range_start, role=Implementation)
      await prisma.publication.delete({ where: { id: existing.id } });
      return status(204, undefined);
      // @relation(GSSC-BLLR-360, scope=range_end, role=Implementation)
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
