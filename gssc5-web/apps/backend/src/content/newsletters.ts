import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  NewsletterPlain,
  NewsletterPlainInputCreate,
} from "../generated/prismabox/Newsletter";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";
import {
  includesInsensitive,
  parseKnownQuery,
  parseStringArray,
  trimStrings,
} from "./helpers";

const NEWSLETTER_LIST_FILTERS = new Set([
  "keyword",
  "cuid",
  "volume",
  "number",
  "year",
  "month",
  "content",
]);

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`) and
 * keywords as a string array (DB column remains a JSON string).
 */
const NewsletterEntry = t.Object({
  cuid: NewsletterPlain.properties.id,
  volume: NewsletterPlain.properties.volume,
  number: NewsletterPlain.properties.number,
  month: NewsletterPlain.properties.month,
  year: NewsletterPlain.properties.year,
  filePath: NewsletterPlain.properties.filePath,
  keywords: t.Array(t.String()),
});

/**
 * Create body from Prismabox create input scalars. Keywords stay a wire
 * string[] (not Prismabox's JSON-string column). `additionalProperties: true`
 * keeps ignored extras so auth can return 403 before a schema reject surfaces
 * as 422.
 */
const NewsletterCreateBody = t.Object(
  {
    volume: NewsletterPlainInputCreate.properties.volume,
    number: NewsletterPlainInputCreate.properties.number,
    month: NewsletterPlainInputCreate.properties.month,
    year: NewsletterPlainInputCreate.properties.year,
    filePath: NewsletterPlainInputCreate.properties.filePath,
    keywords: t.Array(t.String()),
  },
  { additionalProperties: true },
);

/** Patch body: same scalars, all optional; handler rejects empty patches. */
const NewsletterUpdateBody = t.Object(
  {
    volume: t.Optional(NewsletterPlain.properties.volume),
    number: t.Optional(NewsletterPlain.properties.number),
    month: t.Optional(NewsletterPlain.properties.month),
    year: t.Optional(NewsletterPlain.properties.year),
    filePath: t.Optional(NewsletterPlain.properties.filePath),
    keywords: t.Optional(t.Array(t.String())),
  },
  { additionalProperties: true },
);

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean; isNewsletterEditor: boolean } };

type NewsletterRow = {
  id: string;
  volume: number;
  number: number;
  month: number;
  year: number;
  filePath: string;
  keywords: string;
};

function toEntry(row: NewsletterRow) {
  return {
    cuid: row.id,
    volume: row.volume,
    number: row.number,
    month: row.month,
    year: row.year,
    filePath: row.filePath,
    keywords: parseStringArray(row.keywords),
  };
}

type NewsletterWire = ReturnType<typeof toEntry>;

function canEditNewsletters(user: {
  isAdmin: boolean;
  isNewsletterEditor: boolean;
}): boolean {
  return user.isAdmin || user.isNewsletterEditor;
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    isAdmin: true,
    isNewsletterEditor: true,
  });
}

function keywordMatches(keywords: string[], needle: string): boolean {
  const lower = needle.toLowerCase();
  return keywords.some((keyword) => keyword.toLowerCase().includes(lower));
}

function matchesNewsletterFilters(
  entry: NewsletterWire,
  filters: Record<string, string>,
): boolean {
  if (filters.cuid !== undefined && entry.cuid !== filters.cuid) return false;
  if (filters.volume !== undefined && String(entry.volume) !== filters.volume) return false;
  if (filters.number !== undefined && String(entry.number) !== filters.number) return false;
  if (filters.year !== undefined && String(entry.year) !== filters.year) return false;
  if (filters.month !== undefined && String(entry.month) !== filters.month) return false;
  if (filters.keyword !== undefined && filters.keyword.length > 0) {
    if (!keywordMatches(entry.keywords, filters.keyword)) return false;
  }
  if (filters.content !== undefined) {
    const inKeywords = keywordMatches(entry.keywords, filters.content);
    const inVolume = includesInsensitive(String(entry.volume), filters.content);
    const inNumber = includesInsensitive(String(entry.number), filters.content);
    if (!inKeywords && !inVolume && !inNumber) return false;
  }
  return true;
}

const newestOrder = [
  { year: "desc" as const },
  { month: "desc" as const },
  { volume: "desc" as const },
  { number: "desc" as const },
];

const itemParams = t.Object({ cuid: t.String({ minLength: 1 }) });

async function getNewsletterItem({
  params,
  status,
}: {
  params: { cuid: string };
  status: (
    code: 200 | 404,
    body: ReturnType<typeof toEntry> | "Not Found",
  ) => unknown;
}) {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.newsletter.findUnique({
    where: { id: params.cuid },
  });
  if (!row) return status(404, "Not Found" as const);

  // @relation(GSSC-BLLR-390, scope=range_start, role=Implementation)
  return status(200, toEntry(row));
  // @relation(GSSC-BLLR-390, scope=range_end, role=Implementation)
}

async function patchNewsletterItem({
  params,
  body,
  cookie,
  status,
}: {
  params: { cuid: string };
  body: {
    volume?: number;
    number?: number;
    month?: number;
    year?: number;
    filePath?: string;
    keywords?: string[];
  };
  cookie: CookieJar;
  status: (
    code: 200 | 403 | 404 | 422,
    body: ReturnType<typeof toEntry> | "Forbidden" | "Not Found" | "Invalid",
  ) => unknown;
}) {
  const session = await openSession(cookie);
  if ("failure" in session) return status(403, "Forbidden" as const);

  // @relation(GSSC-BLLR-392, scope=range_start, role=Implementation)
  if (!canEditNewsletters(session.user)) {
    return status(403, "Forbidden" as const);
  }
  // @relation(GSSC-BLLR-392, scope=range_end, role=Implementation)

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const existing = await prisma.newsletter.findUnique({
    where: { id: params.cuid },
  });
  if (!existing) return status(404, "Not Found" as const);

  const data: {
    volume?: number;
    number?: number;
    month?: number;
    year?: number;
    filePath?: string;
    keywords?: string;
  } = {};

  if (body.volume !== undefined) data.volume = body.volume;
  if (body.number !== undefined) data.number = body.number;
  if (body.month !== undefined) data.month = body.month;
  if (body.year !== undefined) data.year = body.year;
  if (body.filePath !== undefined) data.filePath = body.filePath;
  if (body.keywords !== undefined) data.keywords = JSON.stringify(body.keywords);
  if (Object.keys(data).length === 0) return status(422, "Invalid" as const);

  // @relation(GSSC-BLLR-391, scope=range_start, role=Implementation)
  const updated = await prisma.newsletter.update({
    where: { id: existing.id },
    data,
  });
  return status(200, toEntry(updated));
  // @relation(GSSC-BLLR-391, scope=range_end, role=Implementation)
}

async function deleteNewsletterItem({
  params,
  cookie,
  status,
}: {
  params: { cuid: string };
  cookie: CookieJar;
  status: (
    code: 204 | 403 | 404,
    body?: "Forbidden" | "Not Found" | undefined,
  ) => unknown;
}) {
  const session = await openSession(cookie);
  if ("failure" in session) return status(403, "Forbidden" as const);

  // @relation(GSSC-BLLR-394, scope=range_start, role=Implementation)
  if (!canEditNewsletters(session.user)) {
    return status(403, "Forbidden" as const);
  }
  // @relation(GSSC-BLLR-394, scope=range_end, role=Implementation)

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const existing = await prisma.newsletter.findUnique({
    where: { id: params.cuid },
  });
  if (!existing) return status(404, "Not Found" as const);

  // @relation(GSSC-BLLR-393, scope=range_start, role=Implementation)
  await prisma.newsletter.delete({ where: { id: existing.id } });
  return status(204, undefined);
  // @relation(GSSC-BLLR-393, scope=range_end, role=Implementation)
}

const getItemOpts = {
  params: itemParams,
  response: {
    200: NewsletterEntry,
    404: t.Literal("Not Found"),
  },
} as const;

const patchItemOpts = {
  params: itemParams,
  body: NewsletterUpdateBody,
  cookie: loginTokenCookie,
  response: {
    200: NewsletterEntry,
    403: t.Literal("Forbidden"),
    404: t.Literal("Not Found"),
    422: t.Literal("Invalid"),
  },
} as const;

const deleteItemOpts = {
  params: itemParams,
  cookie: loginTokenCookie,
  response: {
    204: t.Void(),
    403: t.Literal("Forbidden"),
    404: t.Literal("Not Found"),
  },
} as const;

/** Society newsletters catalog (GSSC5-20). Plural throughout; singular item path aliased one cycle. */
export const newsletters = new Elysia({
  name: "content-newsletters",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({
    newsletter: NewsletterPlain,
    newsletterCreate: NewsletterPlainInputCreate,
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .group("/newsletters", (app) =>
    app
      .get(
        "/",
        async ({ query, status }) => {
          const filters = parseKnownQuery(query, NEWSLETTER_LIST_FILTERS);
          if (filters === "invalid") return status(422, "Invalid" as const);

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const rows = await prisma.newsletter.findMany({
            orderBy: newestOrder,
          });

          // @relation(GSSC-BLLR-387, scope=range_start, role=Implementation)
          let entries = rows.map(toEntry);
          // @relation(GSSC-BLLR-387, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-396, scope=range_start, role=Implementation)
          entries = entries.filter((entry) => matchesNewsletterFilters(entry, filters));
          // @relation(GSSC-BLLR-396, scope=range_end, role=Implementation)

          return status(200, entries);
        },
        {
          query: t.Record(t.String(), t.String()),
          response: {
            200: t.Array(NewsletterEntry),
            422: t.Literal("Invalid"),
          },
        },
      )
      .post(
        "/",
        async ({ body, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session) return status(403, "Forbidden" as const);

          // @relation(GSSC-BLLR-389, scope=range_start, role=Implementation)
          if (!canEditNewsletters(session.user)) {
            return status(403, "Forbidden" as const);
          }
          // @relation(GSSC-BLLR-389, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-388, scope=range_start, role=Implementation)
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const created = await prisma.newsletter.create({
            data: {
              volume: body.volume,
              number: body.number,
              month: body.month,
              year: body.year,
              filePath: body.filePath,
              keywords: JSON.stringify(body.keywords),
            },
          });
          return status(201, toEntry(created));
          // @relation(GSSC-BLLR-388, scope=range_end, role=Implementation)
        },
        {
          body: NewsletterCreateBody,
          cookie: loginTokenCookie,
          response: {
            201: NewsletterEntry,
            403: t.Literal("Forbidden"),
            422: t.Literal("Invalid"),
          },
        },
      )
      .get("/:cuid", getNewsletterItem as never, getItemOpts)
      .patch("/:cuid", patchNewsletterItem as never, patchItemOpts)
      .delete("/:cuid", deleteNewsletterItem as never, deleteItemOpts),
  )
  // Alias singular item paths for one FE release.
  .group("/newsletter", (app) =>
    app
      .get("/:cuid", getNewsletterItem as never, getItemOpts)
      .patch("/:cuid", patchNewsletterItem as never, patchItemOpts)
      .delete("/:cuid", deleteNewsletterItem as never, deleteItemOpts),
  );
