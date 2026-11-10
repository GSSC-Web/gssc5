import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { loginTokenCookie } from "../user/login-session";
import {
  bodyRecord,
  optionalPerm,
  optionalStringArray,
  parseStringArray,
  trimStrings,
  openSession,
  type ContentTemplateRow,
} from "./helpers";

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

export const template = new Elysia({
  name: "content-template",
  prefix: "/templates",
  normalize: false,
  sanitize: (value) => value.trim(),
})
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
      const created = await prisma.contentTemplate.create({
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
      const row = await prisma.contentTemplate.findUnique({ where: { id: params.cuid } });
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
      const updated = await prisma.contentTemplate.update({
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
