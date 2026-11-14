import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";
import {
  bodyRecord,
  optionalStringArray,
  parseStringArray,
  trimStrings,
} from "./helpers";

const NewsletterEntry = t.Object({
  cuid: t.String(),
  volume: t.Number(),
  number: t.Number(),
  month: t.Number(),
  year: t.Number(),
  filePath: t.String(),
  keywords: t.Array(t.String()),
});

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

function readRequiredInteger(
  record: Record<string, unknown>,
  key: string,
): number | "missing" | "invalid" {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return "missing";
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) return "invalid";
  return value;
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

function readRequiredKeywords(
  record: Record<string, unknown>,
): string[] | "missing" | "invalid" {
  if (!Object.prototype.hasOwnProperty.call(record, "keywords")) return "missing";
  const keywords = optionalStringArray(record.keywords);
  if (keywords === undefined || keywords === "invalid") return "invalid";
  return keywords;
}

function keywordMatches(keywords: string[], needle: string): boolean {
  const lower = needle.toLowerCase();
  return keywords.some((keyword) => keyword.toLowerCase().includes(lower));
}

const newestOrder = [
  { year: "desc" as const },
  { month: "desc" as const },
  { volume: "desc" as const },
  { number: "desc" as const },
];

/** Society newsletters catalog (GSSC5-20). Collection /newsletters; item /newsletter/{cuid}. */
export const newsletters = new Elysia({
  name: "content-newsletters",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .group("/newsletters", (app) =>
    app
      .get(
        "/",
        async ({ query, status }) => {
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const rows = await prisma.newsletter.findMany({
            orderBy: newestOrder,
          });

          // @relation(GSSC-BLLR-387, scope=range_start, role=Implementation)
          let entries = rows.map(toEntry);
          // @relation(GSSC-BLLR-387, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-396, scope=range_start, role=Implementation)
          if (query.keyword !== undefined && query.keyword.length > 0) {
            entries = entries.filter((entry) =>
              keywordMatches(entry.keywords, query.keyword!),
            );
          }
          // @relation(GSSC-BLLR-396, scope=range_end, role=Implementation)

          return status(200, entries);
        },
        {
          query: t.Object({
            keyword: t.Optional(t.String()),
          }),
          response: {
            200: t.Array(NewsletterEntry),
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

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }

          const volume = readRequiredInteger(record, "volume");
          const number = readRequiredInteger(record, "number");
          const month = readRequiredInteger(record, "month");
          const year = readRequiredInteger(record, "year");
          const filePath = readRequiredString(record, "filePath");
          const keywords = readRequiredKeywords(record);
          if (
            volume === "missing" ||
            volume === "invalid" ||
            number === "missing" ||
            number === "invalid" ||
            month === "missing" ||
            month === "invalid" ||
            year === "missing" ||
            year === "invalid" ||
            filePath === "missing" ||
            filePath === "invalid" ||
            keywords === "missing" ||
            keywords === "invalid"
          ) {
            return status(422, "Invalid" as const);
          }

          // @relation(GSSC-BLLR-388, scope=range_start, role=Implementation)
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const created = await prisma.newsletter.create({
            data: {
              volume,
              number,
              month,
              year,
              filePath,
              keywords: JSON.stringify(keywords),
            },
          });
          return status(200, toEntry(created));
          // @relation(GSSC-BLLR-388, scope=range_end, role=Implementation)
        },
        {
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            200: NewsletterEntry,
            403: t.Literal("Forbidden"),
            422: t.Literal("Invalid"),
          },
        },
      ),
  )
  .group("/newsletter", (app) =>
    app
      .get(
        "/:cuid",
        async ({ params, status }) => {
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.newsletter.findUnique({
            where: { id: params.cuid },
          });
          if (!row) return status(404, "Not Found" as const);

          // @relation(GSSC-BLLR-390, scope=range_start, role=Implementation)
          return status(200, toEntry(row));
          // @relation(GSSC-BLLR-390, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          response: {
            200: NewsletterEntry,
            404: t.Literal("Not Found"),
          },
        },
      )
      .patch(
        "/:cuid",
        async ({ params, body, cookie, status }) => {
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

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }

          const data: {
            volume?: number;
            number?: number;
            month?: number;
            year?: number;
            filePath?: string;
            keywords?: string;
          } = {};

          for (const key of ["volume", "number", "month", "year"] as const) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
              const value = readRequiredInteger(record, key);
              if (value === "missing" || value === "invalid") {
                return status(422, "Invalid" as const);
              }
              data[key] = value;
            }
          }
          if (Object.prototype.hasOwnProperty.call(record, "filePath")) {
            const filePath = readRequiredString(record, "filePath");
            if (filePath === "missing" || filePath === "invalid") {
              return status(422, "Invalid" as const);
            }
            data.filePath = filePath;
          }
          if (Object.prototype.hasOwnProperty.call(record, "keywords")) {
            const keywords = optionalStringArray(record.keywords);
            if (keywords === undefined || keywords === "invalid") {
              return status(422, "Invalid" as const);
            }
            data.keywords = JSON.stringify(keywords);
          }
          if (Object.keys(data).length === 0) return status(422, "Invalid" as const);

          // @relation(GSSC-BLLR-391, scope=range_start, role=Implementation)
          const updated = await prisma.newsletter.update({
            where: { id: existing.id },
            data,
          });
          return status(200, toEntry(updated));
          // @relation(GSSC-BLLR-391, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            200: NewsletterEntry,
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
      ),
  );
