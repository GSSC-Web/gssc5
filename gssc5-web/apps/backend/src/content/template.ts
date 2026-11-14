import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { ContentTemplatePlain } from "../generated/prismabox/ContentTemplate";
import { loginTokenCookie } from "../user/login-session";
import {
  parseStringArray,
  trimStrings,
  openSession,
  type ContentTemplateRow,
} from "./helpers";

const TemplateListEntry = t.Object({
  cuid: ContentTemplatePlain.properties.id,
  name: ContentTemplatePlain.properties.name,
});

/**
 * Wire detail: Prismabox scalars with `cuid` and tags as string[] (DB stays JSON string).
 */
const TemplateDetail = t.Object({
  cuid: ContentTemplatePlain.properties.id,
  name: ContentTemplatePlain.properties.name,
  isPublic: ContentTemplatePlain.properties.isPublic,
  tags: t.Array(t.String()),
  createPerm: ContentTemplatePlain.properties.createPerm,
  modifyPerm: ContentTemplatePlain.properties.modifyPerm,
  deletePerm: ContentTemplatePlain.properties.deletePerm,
});

const NonNegativeInt = t.Integer({ minimum: 0 });

/**
 * Create body composes Prismabox scalars but keeps wire tags as string[] —
 * not ContentTemplatePlain.tags (JSON string).
 */
const TemplateCreateBody = t.Object(
  {
    name: t.String({ minLength: 1 }),
    isPublic: ContentTemplatePlain.properties.isPublic,
    tags: t.Optional(t.Array(t.String())),
    createPerm: t.Optional(NonNegativeInt),
    modifyPerm: t.Optional(NonNegativeInt),
    deletePerm: t.Optional(NonNegativeInt),
  },
  { additionalProperties: true },
);

/** Patch: visibility and perms only (name/tags are create-time). */
const TemplateUpdateBody = t.Object(
  {
    isPublic: t.Optional(ContentTemplatePlain.properties.isPublic),
    createPerm: t.Optional(NonNegativeInt),
    modifyPerm: t.Optional(NonNegativeInt),
    deletePerm: t.Optional(NonNegativeInt),
  },
  { additionalProperties: true },
);

export const template = new Elysia({
  name: "content-template",
  prefix: "/templates",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({ contentTemplate: ContentTemplatePlain })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-333, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const rows = await prisma.contentTemplate.findMany({ orderBy: { name: "asc" } });
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
      const row = await prisma.contentTemplate.findUnique({ where: { id: params.cuid } });
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

      // @relation(GSSC-BLLR-335, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const created = await prisma.contentTemplate.create({
        data: {
          name: body.name,
          isPublic: body.isPublic,
          tags: JSON.stringify(body.tags ?? []),
          createPerm: body.createPerm ?? 0,
          modifyPerm: body.modifyPerm ?? 0,
          deletePerm: body.deletePerm ?? 0,
        },
      });
      return status(201, toTemplateDetail(created));
      // @relation(GSSC-BLLR-335, scope=range_end, role=Implementation)
    },
    {
      body: TemplateCreateBody,
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
      const row = await prisma.contentTemplate.findUnique({ where: { id: params.cuid } });
      if (!row) return status(404, "Not Found" as const);

      const data: {
        isPublic?: boolean;
        createPerm?: number;
        modifyPerm?: number;
        deletePerm?: number;
      } = {};

      if (body.isPublic !== undefined) data.isPublic = body.isPublic;
      if (body.createPerm !== undefined) data.createPerm = body.createPerm;
      if (body.modifyPerm !== undefined) data.modifyPerm = body.modifyPerm;
      if (body.deletePerm !== undefined) data.deletePerm = body.deletePerm;

      // @relation(GSSC-BLLR-336, scope=range_start, role=Implementation)
      const updated = await prisma.contentTemplate.update({
        where: { id: row.id },
        data,
      });
      return status(200, toTemplateDetail(updated));
      // @relation(GSSC-BLLR-336, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: TemplateUpdateBody,
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
      const row = await prisma.contentTemplate.findUnique({ where: { id: params.cuid } });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-337, scope=range_start, role=Implementation)
      await prisma.contentTemplate.delete({ where: { id: row.id } });
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
  );

function toTemplateDetail(row: ContentTemplateRow) {
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
