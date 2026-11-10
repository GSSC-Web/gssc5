import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import { getPrisma } from "./db";
import {
  classifyLoginTokenRow,
  hashLoginToken,
  loginTokenCookie,
  loginTokenFromCookie,
  type CookieJar,
} from "./user/login-session";

/** Bit 0 = regular member; bit 1 = user moderator. Admin always allowed. */
const PERM_MEMBER = 0o1;
const PERM_USER_MOD = 0o2;

type SessionUser = { isAdmin: boolean; isUserMod: boolean };
type Session = { failure: "missing" | "unknown" | "logged-out" | "expired" } | { user: SessionUser };

type TemplateRow = {
  id: string;
  name: string;
  isPublic: boolean;
  tags: string;
  createPerm: number;
  modifyPerm: number;
  deletePerm: number;
};

type EntryRow = {
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

const SectionListEntry = t.Object({
  cuid: t.String(),
  header: t.Union([t.String(), t.Null()]),
  body: t.String(),
  tags: t.Array(t.String()),
  index: t.Number(),
});

const SectionDetail = t.Object({
  cuid: t.String(),
  header: t.Union([t.String(), t.Null()]),
  body: t.String(),
  resources: t.Array(t.String()),
  tags: t.Array(t.String()),
  index: t.Number(),
});

const TemplateListEntry = t.Object({
  cuid: t.String(),
  name: t.String(),
});

const TemplateDetail = t.Object({
  cuid: t.String(),
  name: t.String(),
  isPublic: t.Boolean(),
  tags: t.Array(t.String()),
  createPerm: t.Number(),
  modifyPerm: t.Number(),
  deletePerm: t.Number(),
});

export const pageData = new Elysia({
  name: "page-data",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .group("/sections", (app) =>
    app
      .get(
        "/",
        async ({ query, cookie, status }) => {
          const session = await openSession(cookie);
          const loggedIn = !("failure" in session);

          // @relation(GSSC-BLLR-320, GSSC-BLLR-321, scope=range_start, role=Implementation)
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const rows = await prisma.pageDataEntry.findMany({
            where: {
              datatype: "section",
              ...(loggedIn ? {} : { isPublic: true }),
            },
            orderBy: { index: "asc" },
          });
          // @relation(GSSC-BLLR-320, GSSC-BLLR-321, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-327, scope=range_start, role=Implementation)
          const filtered = applySectionFilters(rows, query);
          // @relation(GSSC-BLLR-327, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-322, GSSC-BLLR-323, scope=range_start, role=Implementation)
          return status(
            200,
            filtered.map((row) => ({
              cuid: row.id,
              header: row.header,
              body: row.body,
              tags: parseStringArray(row.tags),
              index: row.index,
            })),
          );
          // @relation(GSSC-BLLR-322, GSSC-BLLR-323, scope=range_end, role=Implementation)
        },
        {
          query: t.Object({
            header: t.Optional(t.String()),
            body: t.Optional(t.String()),
            tag: t.Optional(t.String()),
            cuid: t.Optional(t.String()),
            content: t.Optional(t.String()),
          }),
          cookie: loginTokenCookie,
          response: {
            200: t.Array(SectionListEntry),
          },
        },
      )
      .get(
        "/:cuid",
        async ({ params, cookie, status }) => {
          const session = await openSession(cookie);
          const loggedIn = !("failure" in session);
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.pageDataEntry.findFirst({
            where: { id: params.cuid, datatype: "section" },
          });
          if (!row) return status(404, "Not Found" as const);

          // @relation(GSSC-BLLR-325, scope=range_start, role=Implementation)
          if (!row.isPublic && !loggedIn) return status(403, "Forbidden" as const);
          // @relation(GSSC-BLLR-325, scope=range_end, role=Implementation)

          // @relation(GSSC-BLLR-324, GSSC-BLLR-326, scope=range_start, role=Implementation)
          return status(200, toSectionDetail(row));
          // @relation(GSSC-BLLR-324, GSSC-BLLR-326, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          cookie: loginTokenCookie,
          response: {
            200: SectionDetail,
            403: t.Literal("Forbidden"),
            404: t.Literal("Not Found"),
          },
        },
      )
      .post(
        "/",
        async ({ body, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session) return status(403, "Forbidden" as const);

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }

          const bodyText = record.body;
          const templateId = record.templateId ?? record.template;
          if (typeof bodyText !== "string" || bodyText.length === 0) {
            return status(422, "Invalid" as const);
          }
          if (typeof templateId !== "string" || templateId.length === 0) {
            return status(422, "Invalid" as const);
          }

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const template = await prisma.pageTemplate.findUnique({ where: { id: templateId } });
          if (!template) return status(404, "Not Found" as const);

          // @relation(GSSC-BLLR-329, GSSC-BLLR-332, scope=range_start, role=Implementation)
          if (!hasPerm(session.user, template.createPerm)) {
            return status(403, "Forbidden" as const);
          }
          // @relation(GSSC-BLLR-329, GSSC-BLLR-332, scope=range_end, role=Implementation)

          const header =
            record.header === undefined
              ? null
              : record.header === null
                ? null
                : typeof record.header === "string"
                  ? record.header
                  : undefined;
          if (header === undefined) return status(422, "Invalid" as const);

          const resources = optionalStringArray(record.resources);
          if (resources === "invalid") return status(422, "Invalid" as const);
          const requestTags = optionalStringArray(record.tags);
          if (requestTags === "invalid") return status(422, "Invalid" as const);

          let index = 0;
          if (record.index !== undefined) {
            if (typeof record.index !== "number" || !Number.isInteger(record.index)) {
              return status(422, "Invalid" as const);
            }
            index = record.index;
          }

          const tags = uniqueTags([...parseStringArray(template.tags), ...(requestTags ?? [])]);

          // @relation(GSSC-BLLR-328, scope=range_start, role=Implementation)
          const created = await prisma.pageDataEntry.create({
            data: {
              datatype: "section",
              header,
              body: bodyText,
              resources: JSON.stringify(resources ?? []),
              tags: JSON.stringify(tags),
              index,
              isPublic: template.isPublic,
              createPerm: template.createPerm,
              modifyPerm: template.modifyPerm,
              deletePerm: template.deletePerm,
              templateId: template.id,
            },
          });
          return status(201, toSectionDetail(created));
          // @relation(GSSC-BLLR-328, scope=range_end, role=Implementation)
        },
        {
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            201: SectionDetail,
            403: t.Literal("Forbidden"),
            404: t.Literal("Not Found"),
            422: t.Literal("Invalid"),
          },
        },
      )
      .patch(
        "/:cuid",
        async ({ params, body, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session) return status(403, "Forbidden" as const);

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.pageDataEntry.findFirst({
            where: { id: params.cuid, datatype: "section" },
          });
          if (!row) return status(404, "Not Found" as const);

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }

          const wantsIsPublic = Object.prototype.hasOwnProperty.call(record, "isPublic");
          if (wantsIsPublic) {
            // @relation(GSSC-BLLR-331, GSSC-BLLR-332, scope=range_start, role=Implementation)
            if (
              !hasPerm(session.user, row.createPerm) ||
              !hasPerm(session.user, row.modifyPerm) ||
              !hasPerm(session.user, row.deletePerm)
            ) {
              return status(403, "Forbidden" as const);
            }
            // @relation(GSSC-BLLR-331, GSSC-BLLR-332, scope=range_end, role=Implementation)
          } else {
            // @relation(GSSC-BLLR-330, GSSC-BLLR-332, scope=range_start, role=Implementation)
            if (!hasPerm(session.user, row.modifyPerm)) {
              return status(403, "Forbidden" as const);
            }
            // @relation(GSSC-BLLR-330, GSSC-BLLR-332, scope=range_end, role=Implementation)
          }

          const data: {
            header?: string | null;
            body?: string;
            resources?: string;
            tags?: string;
            index?: number;
            isPublic?: boolean;
          } = {};

          if (Object.prototype.hasOwnProperty.call(record, "header")) {
            if (record.header !== null && typeof record.header !== "string") {
              return status(422, "Invalid" as const);
            }
            data.header = record.header as string | null;
          }
          if (Object.prototype.hasOwnProperty.call(record, "body")) {
            if (typeof record.body !== "string" || record.body.length === 0) {
              return status(422, "Invalid" as const);
            }
            data.body = record.body;
          }
          if (Object.prototype.hasOwnProperty.call(record, "resources")) {
            const resources = optionalStringArray(record.resources);
            if (resources === "invalid" || resources === undefined) {
              return status(422, "Invalid" as const);
            }
            data.resources = JSON.stringify(resources);
          }
          if (Object.prototype.hasOwnProperty.call(record, "tags")) {
            const tags = optionalStringArray(record.tags);
            if (tags === "invalid" || tags === undefined) {
              return status(422, "Invalid" as const);
            }
            data.tags = JSON.stringify(tags);
          }
          if (Object.prototype.hasOwnProperty.call(record, "index")) {
            if (typeof record.index !== "number" || !Number.isInteger(record.index)) {
              return status(422, "Invalid" as const);
            }
            data.index = record.index;
          }
          if (wantsIsPublic) {
            if (typeof record.isPublic !== "boolean") return status(422, "Invalid" as const);
            data.isPublic = record.isPublic;
          }

          // @relation(GSSC-BLLR-330, GSSC-BLLR-331, scope=range_start, role=Implementation)
          const updated = await prisma.pageDataEntry.update({
            where: { id: row.id },
            data,
          });
          return status(200, toSectionDetail(updated));
          // @relation(GSSC-BLLR-330, GSSC-BLLR-331, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            200: SectionDetail,
            403: t.Literal("Forbidden"),
            404: t.Literal("Not Found"),
            422: t.Literal("Invalid"),
          },
        },
      ),
  )
  .group("/templates", (app) =>
    app
      .get(
        "/",
        async ({ cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session) return status(403, "Forbidden" as const);

          // @relation(GSSC-BLLR-333, scope=range_start, role=Implementation)
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const rows = await prisma.pageTemplate.findMany({ orderBy: { name: "asc" } });
          return status(
            200,
            rows.map((row) => ({ cuid: row.id, name: row.name })),
          );
          // @relation(GSSC-BLLR-333, scope=range_end, role=Implementation)
        },
        {
          cookie: loginTokenCookie,
          response: {
            200: t.Array(TemplateListEntry),
            403: t.Literal("Forbidden"),
          },
        },
      )
      .get(
        "/:cuid",
        async ({ params, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session || !session.user.isAdmin) {
            return status(403, "Forbidden" as const);
          }

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.pageTemplate.findUnique({ where: { id: params.cuid } });
          if (!row) return status(404, "Not Found" as const);

          // @relation(GSSC-BLLR-334, scope=range_start, role=Implementation)
          return status(200, toTemplateDetail(row));
          // @relation(GSSC-BLLR-334, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          cookie: loginTokenCookie,
          response: {
            200: TemplateDetail,
            403: t.Literal("Forbidden"),
            404: t.Literal("Not Found"),
          },
        },
      )
      .post(
        "/",
        async ({ body, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session || !session.user.isAdmin) {
            return status(403, "Forbidden" as const);
          }

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }
          if (typeof record.name !== "string" || record.name.length === 0) {
            return status(422, "Invalid" as const);
          }
          if (typeof record.isPublic !== "boolean") {
            return status(422, "Invalid" as const);
          }

          const tags = optionalStringArray(record.tags);
          if (tags === "invalid") return status(422, "Invalid" as const);

          const createPerm = optionalPerm(record.createPerm);
          const modifyPerm = optionalPerm(record.modifyPerm);
          const deletePerm = optionalPerm(record.deletePerm);
          if (createPerm === "invalid" || modifyPerm === "invalid" || deletePerm === "invalid") {
            return status(422, "Invalid" as const);
          }

          // @relation(GSSC-BLLR-335, scope=range_start, role=Implementation)
          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const created = await prisma.pageTemplate.create({
            data: {
              name: record.name,
              isPublic: record.isPublic,
              tags: JSON.stringify(tags ?? []),
              createPerm: createPerm ?? 0,
              modifyPerm: modifyPerm ?? 0,
              deletePerm: deletePerm ?? 0,
            },
          });
          return status(201, toTemplateDetail(created));
          // @relation(GSSC-BLLR-335, scope=range_end, role=Implementation)
        },
        {
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            201: TemplateDetail,
            403: t.Literal("Forbidden"),
            422: t.Literal("Invalid"),
          },
        },
      )
      .patch(
        "/:cuid",
        async ({ params, body, cookie, status }) => {
          const session = await openSession(cookie);
          if ("failure" in session || !session.user.isAdmin) {
            return status(403, "Forbidden" as const);
          }

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.pageTemplate.findUnique({ where: { id: params.cuid } });
          if (!row) return status(404, "Not Found" as const);

          const record = bodyRecord(body);
          if (record === "malformed" || record === "missing") {
            return status(422, "Invalid" as const);
          }

          const data: {
            isPublic?: boolean;
            createPerm?: number;
            modifyPerm?: number;
            deletePerm?: number;
          } = {};

          if (Object.prototype.hasOwnProperty.call(record, "isPublic")) {
            if (typeof record.isPublic !== "boolean") return status(422, "Invalid" as const);
            data.isPublic = record.isPublic;
          }
          if (Object.prototype.hasOwnProperty.call(record, "createPerm")) {
            const value = optionalPerm(record.createPerm);
            if (value === "invalid" || value === undefined) return status(422, "Invalid" as const);
            data.createPerm = value;
          }
          if (Object.prototype.hasOwnProperty.call(record, "modifyPerm")) {
            const value = optionalPerm(record.modifyPerm);
            if (value === "invalid" || value === undefined) return status(422, "Invalid" as const);
            data.modifyPerm = value;
          }
          if (Object.prototype.hasOwnProperty.call(record, "deletePerm")) {
            const value = optionalPerm(record.deletePerm);
            if (value === "invalid" || value === undefined) return status(422, "Invalid" as const);
            data.deletePerm = value;
          }

          // @relation(GSSC-BLLR-336, scope=range_start, role=Implementation)
          const updated = await prisma.pageTemplate.update({
            where: { id: row.id },
            data,
          });
          return status(200, toTemplateDetail(updated));
          // @relation(GSSC-BLLR-336, scope=range_end, role=Implementation)
        },
        {
          params: t.Object({ cuid: t.String({ minLength: 1 }) }),
          body: t.Optional(t.Unknown()),
          cookie: loginTokenCookie,
          response: {
            200: TemplateDetail,
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
          if ("failure" in session || !session.user.isAdmin) {
            return status(403, "Forbidden" as const);
          }

          const prisma = getPrisma(loadConfig().DATABASE_URL);
          const row = await prisma.pageTemplate.findUnique({ where: { id: params.cuid } });
          if (!row) return status(404, "Not Found" as const);

          // @relation(GSSC-BLLR-337, scope=range_start, role=Implementation)
          await prisma.pageTemplate.delete({ where: { id: row.id } });
          return status(204, undefined);
          // @relation(GSSC-BLLR-337, scope=range_end, role=Implementation)
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

async function openSession(cookie: CookieJar): Promise<Session> {
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

function hasPerm(user: SessionUser, mask: number): boolean {
  if (user.isAdmin) return true;
  if (user.isUserMod && (mask & PERM_USER_MOD) !== 0) return true;
  if ((mask & PERM_MEMBER) !== 0) return true;
  return false;
}

function applySectionFilters(
  rows: EntryRow[],
  query: {
    header?: string;
    body?: string;
    tag?: string;
    cuid?: string;
    content?: string;
  },
): EntryRow[] {
  return rows.filter((row) => {
    if (query.cuid !== undefined && row.id !== query.cuid) return false;
    if (query.header !== undefined && !includesInsensitive(row.header ?? "", query.header)) {
      return false;
    }
    if (query.body !== undefined && !includesInsensitive(row.body, query.body)) return false;
    if (query.tag !== undefined) {
      const tags = parseStringArray(row.tags);
      if (!tags.some((tag) => includesInsensitive(tag, query.tag!))) return false;
    }
    if (query.content !== undefined) {
      const hay = `${row.header ?? ""}\n${row.body}`;
      if (!includesInsensitive(hay, query.content)) return false;
    }
    return true;
  });
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function toSectionDetail(row: EntryRow) {
  return {
    cuid: row.id,
    header: row.header,
    body: row.body,
    resources: parseStringArray(row.resources),
    tags: parseStringArray(row.tags),
    index: row.index,
  };
}

function toTemplateDetail(row: TemplateRow) {
  return {
    cuid: row.id,
    name: row.name,
    isPublic: row.isPublic,
    tags: parseStringArray(row.tags),
    createPerm: row.createPerm,
    modifyPerm: row.modifyPerm,
    deletePerm: row.deletePerm,
  };
}

function parseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function optionalStringArray(value: unknown): string[] | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return "invalid";
  if (!value.every((item) => typeof item === "string")) return "invalid";
  return value as string[];
}

function optionalPerm(value: unknown): number | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return "invalid";
  return value;
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
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
