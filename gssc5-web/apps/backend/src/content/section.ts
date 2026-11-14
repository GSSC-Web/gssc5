import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { PageDataEntryPlain } from "../generated/prismabox/PageDataEntry";
import { loginTokenCookie } from "../user/login-session";
import {
  hasPerm,
  openSession,
  parseStringArray,
  trimStrings,
  uniqueTags,
  type EntryRow,
} from "./helpers";

const SectionListEntry = t.Object({
  cuid: PageDataEntryPlain.properties.id,
  header: PageDataEntryPlain.properties.header,
  body: PageDataEntryPlain.properties.body,
  tags: t.Array(t.String()),
  index: PageDataEntryPlain.properties.index,
});

/**
 * Wire detail: Prismabox scalars with `cuid` and tags/resources as string[]
 * (DB columns stay JSON strings). Do not expose raw PageDataEntryPlain.
 */
const SectionDetail = t.Object({
  cuid: PageDataEntryPlain.properties.id,
  header: PageDataEntryPlain.properties.header,
  body: PageDataEntryPlain.properties.body,
  resources: t.Array(t.String()),
  tags: t.Array(t.String()),
  index: PageDataEntryPlain.properties.index,
});

/**
 * Create body: wire contract keeps templateId/template, string[] tags/resources.
 * datatype and perms are forced server-side from the template.
 */
const SectionCreateBody = t.Object(
  {
    body: t.String({ minLength: 1 }),
    templateId: t.Optional(t.String({ minLength: 1 })),
    template: t.Optional(t.String({ minLength: 1 })),
    header: t.Optional(PageDataEntryPlain.properties.header),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(PageDataEntryPlain.properties.index),
  },
  { additionalProperties: true },
);

const SectionUpdateBody = t.Object(
  {
    header: t.Optional(PageDataEntryPlain.properties.header),
    body: t.Optional(t.String({ minLength: 1 })),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(PageDataEntryPlain.properties.index),
    isPublic: t.Optional(PageDataEntryPlain.properties.isPublic),
  },
  { additionalProperties: true },
);

export const section = new Elysia({
  name: "content-section",
  prefix: "/sections",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({ pageDataEntry: PageDataEntryPlain })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
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

      const templateId = body.templateId ?? body.template;
      if (typeof templateId !== "string" || templateId.length === 0) {
        return status(422, "Invalid" as const);
      }

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const template = await prisma.contentTemplate.findUnique({ where: { id: templateId } });
      if (!template) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-329, scope=range_start, role=Implementation)
      if (!hasPerm(session.user, template.createPerm)) {
        return status(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-329, scope=range_end, role=Implementation)

      const header = body.header === undefined ? null : body.header;
      const resources = body.resources ?? [];
      const requestTags = body.tags ?? [];
      const index = body.index ?? 0;
      const tags = uniqueTags([...parseStringArray(template.tags), ...requestTags]);

      // @relation(GSSC-BLLR-328, scope=range_start, role=Implementation)
      const created = await prisma.pageDataEntry.create({
        data: {
          datatype: "section",
          header,
          body: body.body,
          resources: JSON.stringify(resources),
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
      body: SectionCreateBody,
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

      const wantsIsPublic = body.isPublic !== undefined;
      if (wantsIsPublic) {
        // @relation(GSSC-BLLR-331, scope=range_start, role=Implementation)
        if (
          !hasPerm(session.user, row.createPerm) ||
          !hasPerm(session.user, row.modifyPerm) ||
          !hasPerm(session.user, row.deletePerm)
        ) {
          return status(403, "Forbidden" as const);
        }
        // @relation(GSSC-BLLR-331, scope=range_end, role=Implementation)
      } else {
        if (!hasPerm(session.user, row.modifyPerm)) {
          return status(403, "Forbidden" as const);
        }
      }

      const data: {
        header?: string | null;
        body?: string;
        resources?: string;
        tags?: string;
        index?: number;
        isPublic?: boolean;
      } = {};

      if (body.header !== undefined) data.header = body.header;
      if (body.body !== undefined) data.body = body.body;
      if (body.resources !== undefined) data.resources = JSON.stringify(body.resources);
      if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
      if (body.index !== undefined) data.index = body.index;
      if (wantsIsPublic) data.isPublic = body.isPublic;

      // @relation(GSSC-BLLR-330, scope=range_start, role=Implementation)
      const updated = await prisma.pageDataEntry.update({
        where: { id: row.id },
        data,
      });
      return status(200, toSectionDetail(updated));
      // @relation(GSSC-BLLR-330, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: SectionUpdateBody,
      cookie: loginTokenCookie,
      response: {
        200: SectionDetail,
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

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.pageDataEntry.findFirst({
        where: { id: params.cuid, datatype: "section" },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-341, scope=range_start, role=Implementation)
      if (!hasPerm(session.user, row.deletePerm)) {
        return status(403, "Forbidden" as const);
      }
      await prisma.pageDataEntry.delete({ where: { id: row.id } });
      return status(204, undefined);
      // @relation(GSSC-BLLR-341, scope=range_end, role=Implementation)
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
      const inHeader = includesInsensitive(row.header ?? "", query.content);
      const inBody = includesInsensitive(row.body, query.content);
      if (!inHeader && !inBody) return false;
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
