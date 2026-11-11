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
import {
  canReadEntry,
  canWriteEntry,
  inheritAcl,
  isLooserThanParent,
  optionalRoleList,
  parseRoleList,
  rootAclCeiling,
  rootDefaultAcl,
  serializeRoleList,
  type FileAcl,
  type FileSessionUser,
} from "./acl";
import {
  ensureStorageRoot,
  readStoredFile,
  writeStoredBytes,
} from "./storage";

const FileListEntry = t.Object({
  cuid: t.String(),
  name: t.String(),
  kind: t.Union([t.Literal("file"), t.Literal("folder")]),
  isPublic: t.Boolean(),
  readRoles: t.Array(t.String()),
  writeRoles: t.Array(t.String()),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: FileSessionUser };

type EntryRow = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isPublic: boolean;
  readRoles: string;
  writeRoles: string;
  deletedAt: Date | null;
};

function toListEntry(row: EntryRow) {
  // @relation(GSSC-BLLR-374, scope=range_start, role=Implementation)
  return {
    cuid: row.id,
    name: row.name,
    kind: row.kind as "file" | "folder",
    isPublic: row.isPublic,
    readRoles: parseRoleList(row.readRoles),
    writeRoles: parseRoleList(row.writeRoles),
  };
  // @relation(GSSC-BLLR-374, scope=range_end, role=Implementation)
}

function entryAcl(row: EntryRow): FileAcl {
  return {
    isPublic: row.isPublic,
    readRoles: parseRoleList(row.readRoles),
    writeRoles: parseRoleList(row.writeRoles),
  };
}

async function openSession(cookie: CookieJar): Promise<Session> {
  const token = loginTokenFromCookie(cookie);
  if (token === null) return { failure: "missing" };

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashLoginToken(token) },
    include: {
      user: {
        select: {
          isAdmin: true,
          isUserMod: true,
          isToolEditor: true,
          isPublicationEditor: true,
        },
      },
    },
  });
  const classified = classifyLoginTokenRow(row);
  if (classified === "ok" && row) return { user: row.user };
  return { failure: classified === "ok" ? "unknown" : classified };
}

function sessionUser(session: Session): FileSessionUser | null {
  return "user" in session ? session.user : null;
}

async function loadEntry(cuid: string): Promise<EntryRow | null> {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  return prisma.storedFileEntry.findUnique({ where: { id: cuid } });
}

async function resolveParent(
  parentId: string | null | undefined,
): Promise<
  | { kind: "root"; inherit: FileAcl; ceiling: FileAcl }
  | { kind: "folder"; row: EntryRow; acl: FileAcl }
  | { kind: "missing" }
  | { kind: "not-folder" }
  | { kind: "deleted" }
> {
  if (parentId === undefined || parentId === null || parentId === "") {
    return {
      kind: "root",
      inherit: rootDefaultAcl(),
      ceiling: rootAclCeiling(),
    };
  }
  const row = await loadEntry(parentId);
  if (row === null) return { kind: "missing" };
  if (row.deletedAt !== null) return { kind: "deleted" };
  if (row.kind !== "folder") return { kind: "not-folder" };
  return { kind: "folder", row, acl: entryAcl(row) };
}

function resolveAclOverride(
  inheritFrom: FileAcl,
  ceiling: FileAcl,
  body: Record<string, unknown>,
): FileAcl | "invalid" | "looser" {
  const hasIsPublic = Object.prototype.hasOwnProperty.call(body, "isPublic");
  const readRoles = optionalRoleList(body.readRoles);
  const writeRoles = optionalRoleList(body.writeRoles);
  if (readRoles === "invalid" || writeRoles === "invalid") return "invalid";
  if (hasIsPublic && typeof body.isPublic !== "boolean") {
    return "invalid";
  }

  const omitted =
    !hasIsPublic && readRoles === undefined && writeRoles === undefined;
  if (omitted) return inheritAcl(inheritFrom);

  const acl: FileAcl = {
    isPublic: hasIsPublic ? (body.isPublic as boolean) : inheritFrom.isPublic,
    readRoles: readRoles ?? [...inheritFrom.readRoles],
    writeRoles: writeRoles ?? [...inheritFrom.writeRoles],
  };
  if (isLooserThanParent(acl, ceiling)) return "looser";
  return acl;
}

function sanitizeFileName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
    return null;
  }
  if (trimmed === "." || trimmed === "..") return null;
  return trimmed;
}

/** Local filesystem file storage with DB ACL metadata (GSSC5-71). */
export const files = new Elysia({ prefix: "/files" })
  .guard({ cookie: loginTokenCookie })
  .get(
    "/",
    async ({ query, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const user = sessionUser(session);
      const parent = await resolveParent(query.parent ?? null);
      if (parent.kind === "missing" || parent.kind === "deleted") {
        return statusFn(404, { error: "parent not found" });
      }
      if (parent.kind === "not-folder") {
        return statusFn(400, { error: "parent is not a folder" });
      }
      const parentAcl =
        parent.kind === "root" ? parent.inherit : parent.acl;
      // @relation(GSSC-BLLR-373, scope=range_start, role=Implementation)
      if (!canReadEntry(parentAcl, user)) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-373, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const parentId = parent.kind === "root" ? null : parent.row.id;
      // @relation(GSSC-BLLR-371, GSSC-BLLR-372, scope=range_start, role=Implementation)
      const rows = await prisma.storedFileEntry.findMany({
        where: { parentId, deletedAt: null },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
      });
      // @relation(GSSC-BLLR-371, GSSC-BLLR-372, scope=range_end, role=Implementation)

      return rows
        .filter((row) => canReadEntry(entryAcl(row), user))
        .map(toListEntry);
    },
    {
      query: t.Object({
        parent: t.Optional(t.String()),
      }),
      response: {
        200: t.Array(FileListEntry),
        400: t.Object({ error: t.String() }),
        403: t.Object({ error: t.String() }),
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    "/",
    async ({ body, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const user = sessionUser(session);
      if (user === null) return statusFn(401, { error: "unauthorized" });

      const record =
        body === undefined || body === null
          ? null
          : typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>)
            : "malformed";
      if (record === null) return statusFn(400, { error: "missing body" });
      if (record === "malformed") return statusFn(400, { error: "malformed body" });

      const nameRaw = record.name;
      if (typeof nameRaw !== "string") return statusFn(400, { error: "invalid name" });
      const name = sanitizeFileName(nameRaw);
      if (name === null) return statusFn(400, { error: "invalid name" });

      const parentId =
        typeof record.parent === "string" && record.parent.length > 0
          ? record.parent
          : null;
      const parent = await resolveParent(parentId);
      if (parent.kind === "missing" || parent.kind === "deleted") {
        return statusFn(404, { error: "parent not found" });
      }
      if (parent.kind === "not-folder") {
        return statusFn(400, { error: "parent is not a folder" });
      }
      const writeAcl = parent.kind === "root" ? parent.inherit : parent.acl;
      const inheritFrom = parent.kind === "root" ? parent.inherit : parent.acl;
      const ceiling = parent.kind === "root" ? parent.ceiling : parent.acl;
      // @relation(GSSC-BLLR-376, scope=range_start, role=Implementation)
      if (!canWriteEntry(writeAcl, user)) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-376, scope=range_end, role=Implementation)

      const acl = resolveAclOverride(inheritFrom, ceiling, record);
      if (acl === "invalid") return statusFn(400, { error: "invalid acl" });
      if (acl === "looser") return statusFn(400, { error: "acl looser than parent" });

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      // @relation(GSSC-BLLR-375, scope=range_start, role=Implementation)
      const created = await prisma.storedFileEntry.create({
        data: {
          name,
          kind: "folder",
          parentId: parent.kind === "root" ? null : parent.row.id,
          isPublic: acl.isPublic,
          readRoles: serializeRoleList(acl.readRoles),
          writeRoles: serializeRoleList(acl.writeRoles),
        },
      });
      // @relation(GSSC-BLLR-375, scope=range_end, role=Implementation)
      return toListEntry(created);
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        parent: t.Optional(t.String()),
        isPublic: t.Optional(t.Boolean()),
        readRoles: t.Optional(t.Array(t.String())),
        writeRoles: t.Optional(t.Array(t.String())),
      }),
      response: {
        200: FileListEntry,
        400: t.Object({ error: t.String() }),
        401: t.Object({ error: t.String() }),
        403: t.Object({ error: t.String() }),
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    "/upload",
    async ({ body, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const user = sessionUser(session);
      if (user === null) return statusFn(401, { error: "unauthorized" });

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(400, { error: "missing file" });
      }

      const providedName =
        typeof body.name === "string" && body.name.length > 0
          ? body.name
          : upload.name;
      const name = sanitizeFileName(providedName ?? "upload.bin");
      if (name === null) return statusFn(400, { error: "invalid name" });

      const parentId =
        typeof body.parent === "string" && body.parent.length > 0
          ? body.parent
          : null;
      const parent = await resolveParent(parentId);
      if (parent.kind === "missing" || parent.kind === "deleted") {
        return statusFn(404, { error: "parent not found" });
      }
      if (parent.kind === "not-folder") {
        return statusFn(400, { error: "parent is not a folder" });
      }
      const writeAcl = parent.kind === "root" ? parent.inherit : parent.acl;
      const inheritFrom = parent.kind === "root" ? parent.inherit : parent.acl;
      const ceiling = parent.kind === "root" ? parent.ceiling : parent.acl;
      // @relation(GSSC-BLLR-378, scope=range_start, role=Implementation)
      if (!canWriteEntry(writeAcl, user)) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-378, scope=range_end, role=Implementation)

      const overrideBody: Record<string, unknown> = {};
      if (body.isPublic !== undefined) overrideBody.isPublic = body.isPublic === "true" || body.isPublic === true;
      if (body.readRoles !== undefined) {
        try {
          overrideBody.readRoles = JSON.parse(String(body.readRoles));
        } catch {
          return statusFn(400, { error: "invalid acl" });
        }
      }
      if (body.writeRoles !== undefined) {
        try {
          overrideBody.writeRoles = JSON.parse(String(body.writeRoles));
        } catch {
          return statusFn(400, { error: "invalid acl" });
        }
      }
      const acl = resolveAclOverride(inheritFrom, ceiling, overrideBody);
      if (acl === "invalid") return statusFn(400, { error: "invalid acl" });
      if (acl === "looser") return statusFn(400, { error: "acl looser than parent" });

      const bytes = new Uint8Array(await upload.arrayBuffer());
      await ensureStorageRoot();

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      // @relation(GSSC-BLLR-377, scope=range_start, role=Implementation)
      const created = await prisma.storedFileEntry.create({
        data: {
          name,
          kind: "file",
          parentId: parent.kind === "root" ? null : parent.row.id,
          storageKey: "pending",
          mimeType: upload.type || null,
          sizeBytes: bytes.byteLength,
          isPublic: acl.isPublic,
          readRoles: serializeRoleList(acl.readRoles),
          writeRoles: serializeRoleList(acl.writeRoles),
        },
      });
      const storageKey = created.id;
      const written = await writeStoredBytes(storageKey, bytes);
      if (written === null) {
        await prisma.storedFileEntry.delete({ where: { id: created.id } });
        return statusFn(500, { error: "storage write failed" });
      }
      const updated = await prisma.storedFileEntry.update({
        where: { id: created.id },
        data: { storageKey },
      });
      // @relation(GSSC-BLLR-377, scope=range_end, role=Implementation)
      return toListEntry(updated);
    },
    {
      body: t.Object({
        file: t.File(),
        parent: t.Optional(t.String()),
        name: t.Optional(t.String()),
        isPublic: t.Optional(t.Union([t.Boolean(), t.String()])),
        readRoles: t.Optional(t.String()),
        writeRoles: t.Optional(t.String()),
      }),
      response: {
        200: FileListEntry,
        400: t.Object({ error: t.String() }),
        401: t.Object({ error: t.String() }),
        403: t.Object({ error: t.String() }),
        404: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() }),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const user = sessionUser(session);
      const row = await loadEntry(params.cuid);
      // @relation(GSSC-BLLR-380, scope=range_start, role=Implementation)
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, { error: "not found" });
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, { error: "not found" });
      }
      if (!canReadEntry(entryAcl(row), user)) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-380, scope=range_end, role=Implementation)

      const file = readStoredFile(row.storageKey);
      if (file === null || !(await file.exists())) {
        return statusFn(404, { error: "not found" });
      }
      // @relation(GSSC-BLLR-379, scope=range_start, role=Implementation)
      return new Response(file, {
        headers: {
          "content-type": row.mimeType || "application/octet-stream",
          "content-disposition": `inline; filename="${row.name.replaceAll('"', "")}"`,
        },
      });
      // @relation(GSSC-BLLR-379, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String() }),
    },
  )
  .delete(
    "/:cuid",
    async ({ params, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const user = sessionUser(session);
      if (user === null) return statusFn(401, { error: "unauthorized" });

      const row = await loadEntry(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, { error: "not found" });
      }
      // @relation(GSSC-BLLR-382, scope=range_start, role=Implementation)
      if (!canWriteEntry(entryAcl(row), user)) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-382, scope=range_end, role=Implementation)

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      // @relation(GSSC-BLLR-370, GSSC-BLLR-381, scope=range_start, role=Implementation)
      await prisma.storedFileEntry.update({
        where: { id: row.id },
        data: { deletedAt: new Date() },
      });
      // @relation(GSSC-BLLR-370, GSSC-BLLR-381, scope=range_end, role=Implementation)
      return { ok: true as const };
    },
    {
      params: t.Object({ cuid: t.String() }),
      response: {
        200: t.Object({ ok: t.Literal(true) }),
        401: t.Object({ error: t.String() }),
        403: t.Object({ error: t.String() }),
        404: t.Object({ error: t.String() }),
      },
    },
  );
