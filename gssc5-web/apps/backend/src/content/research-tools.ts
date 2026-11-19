import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  absoluteStoragePath,
  ensureStorageRoot,
  readStoredFile,
  removeStoredBytes,
  storageRoot,
  writeStoredBytes,
} from "../files/storage";
import {
  ResearchToolPlain,
  ResearchToolPlainInputCreate,
} from "../generated/prismabox/ResearchTool";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";
import { includesInsensitive, parseKnownQuery } from "./helpers";

const RESEARCH_TOOL_LIST_FILTERS = new Set(["title", "cuid", "content"]);

/** Dedicated research-tools file store (GSSC-188). */
export const RESEARCH_TOOLS_DIR = "research-tools";

const ResearchToolFileUploaded = t.Object({
  cuid: t.String(),
  path: t.String(),
});

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`) plus
 * `hasFile` for stored reference files under research-tools/{cuid}.
 */
const ResearchToolEntry = t.Object({
  cuid: ResearchToolPlain.properties.id,
  title: ResearchToolPlain.properties.title,
  referenceLink: ResearchToolPlain.properties.referenceLink,
  hasFile: t.Boolean(),
});

/**
 * Create body from Prismabox create input. Empty referenceLink is allowed when
 * a file upload will follow. `additionalProperties: true` keeps ignored extras
 * so auth can return 403 before a schema reject surfaces as 422.
 */
const ResearchToolCreateBody = t.Object(
  {
    title: ResearchToolPlainInputCreate.properties.title,
    referenceLink: t.Optional(ResearchToolPlain.properties.referenceLink),
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

let researchToolsReady: Promise<string> | undefined;

function runtimePrisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

function canEditTools(user: { isAdmin: boolean; isToolEditor: boolean }): boolean {
  return user.isAdmin || user.isToolEditor;
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtimePrisma(), cookie, {
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

/** Absolute FS directory for research-tool files under FILE_STORAGE_ROOT. */
export function researchToolsFsRoot(): string {
  return path.join(storageRoot(), RESEARCH_TOOLS_DIR);
}

export async function ensureResearchToolsFs(): Promise<void> {
  await ensureStorageRoot();
  await mkdir(researchToolsFsRoot(), { recursive: true });
}

/**
 * Ensure the research-tools folder exists in DB + on disk; return folder cuid.
 * Safe to call repeatedly (idempotent by name under root).
 */
// @relation(GSSC-BLLR-496, scope=range_start, role=Implementation)
export async function ensureResearchToolsFolder(): Promise<string> {
  researchToolsReady ??= (async () => {
    await ensureResearchToolsFs();
    const prisma = runtimePrisma();
    const existing = await prisma.storedFileEntry.findFirst({
      where: {
        name: RESEARCH_TOOLS_DIR,
        kind: "folder",
        parentId: null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.storedFileEntry.create({
      data: {
        name: RESEARCH_TOOLS_DIR,
        kind: "folder",
        parentId: null,
        isPublic: true,
        readRoles: JSON.stringify([]),
        writeRoles: JSON.stringify(["toolEditor"]),
      },
      select: { id: true },
    });
    return created.id;
  })().catch((error: unknown) => {
    researchToolsReady = undefined;
    throw error;
  });
  return researchToolsReady;
}
// @relation(GSSC-BLLR-496, scope=range_end, role=Implementation)

function storageKeyForTool(toolCuid: string): string {
  return `${RESEARCH_TOOLS_DIR}/${toolCuid}`;
}

async function loadResearchToolFile(toolCuid: string) {
  const prisma = runtimePrisma();
  const folderId = await ensureResearchToolsFolder();
  return prisma.storedFileEntry.findFirst({
    where: {
      name: toolCuid,
      kind: "file",
      parentId: folderId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      kind: true,
      parentId: true,
      storageKey: true,
      mimeType: true,
      deletedAt: true,
    },
  });
}

async function toolHasFile(toolCuid: string): Promise<boolean> {
  const row = await loadResearchToolFile(toolCuid);
  if (row === null || row.storageKey === null) return false;
  const file = readStoredFile(row.storageKey);
  return file !== null && (await file.exists());
}

async function toEntry(row: ToolRow) {
  return {
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    hasFile: await toolHasFile(row.id),
  };
}

/** Soft-delete the current research-tool file entry and remove its bytes. */
// @relation(GSSC-BLLR-500, scope=range_start, role=Implementation)
async function softDeleteResearchToolFile(toolCuid: string): Promise<void> {
  const existing = await loadResearchToolFile(toolCuid);
  if (existing === null) return;
  const prisma = runtimePrisma();
  await prisma.storedFileEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  if (existing.storageKey !== null && existing.storageKey.length > 0) {
    await removeStoredBytes(existing.storageKey);
  }
}
// @relation(GSSC-BLLR-500, scope=range_end, role=Implementation)

/** Research tools catalog (GSSC5-18 / GSSC-188). */
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
  .onStart(() => {
    void ensureResearchToolsFolder();
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ query, status }) => {
      const filters = parseKnownQuery(query, RESEARCH_TOOL_LIST_FILTERS);
      if (filters === "invalid") return status(422, "Invalid" as const);

      // @relation(GSSC-BLLR-345, scope=range_start, role=Implementation)
      const prisma = runtimePrisma();
      const rows = await prisma.researchTool.findMany({
        orderBy: { title: "asc" },
      });
      const listed = [];
      for (const row of rows) {
        const entry = await toEntry(row);
        if (filters.cuid !== undefined && entry.cuid !== filters.cuid) continue;
        if (filters.title !== undefined && !includesInsensitive(entry.title, filters.title)) {
          continue;
        }
        if (filters.content !== undefined) {
          const inTitle = includesInsensitive(entry.title, filters.content);
          const inLink = includesInsensitive(entry.referenceLink, filters.content);
          if (!inTitle && !inLink) continue;
        }
        listed.push(entry);
      }
      return status(200, listed);
      // @relation(GSSC-BLLR-345, scope=range_end, role=Implementation)
    },
    {
      query: t.Record(t.String(), t.String()),
      response: {
        200: t.Array(ResearchToolEntry),
        422: t.Literal("Invalid"),
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

      const referenceLink =
        typeof body.referenceLink === "string" ? body.referenceLink : "";

      // @relation(GSSC-BLLR-346, scope=range_start, role=Implementation)
      const prisma = runtimePrisma();
      const created = await prisma.researchTool.create({
        data: { title: body.title, referenceLink },
      });
      return status(201, await toEntry(created));
      // @relation(GSSC-BLLR-346, scope=range_end, role=Implementation)
    },
    {
      body: ResearchToolCreateBody,
      cookie: loginTokenCookie,
      response: {
        201: ResearchToolEntry,
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid/file",
    async ({ params, status: statusFn }) => {
      const prisma = runtimePrisma();
      const tool = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
        select: { id: true },
      });
      if (tool === null) return statusFn(404, "Not Found" as const);

      const row = await loadResearchToolFile(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, "Not Found" as const);
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, "Not Found" as const);
      }

      // @relation(GSSC-BLLR-499, scope=range_start, role=Implementation)
      const file = readStoredFile(row.storageKey);
      if (file === null || !(await file.exists())) {
        return statusFn(404, "Not Found" as const);
      }
      return new Response(file, {
        headers: {
          "content-type": row.mimeType || "application/octet-stream",
          "content-disposition": `inline; filename="${row.name.replaceAll('"', "")}"`,
        },
      });
      // @relation(GSSC-BLLR-499, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
    },
  )
  .post(
    "/:cuid/file",
    async ({ params, body, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return statusFn(403, "Forbidden" as const);
      if (!canEditTools(session.user)) return statusFn(403, "Forbidden" as const);

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(422, "Invalid" as const);
      }

      const prisma = runtimePrisma();
      const tool = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
        select: { id: true },
      });
      if (tool === null) return statusFn(404, "Not Found" as const);

      const folderId = await ensureResearchToolsFolder();
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const storageKey = storageKeyForTool(params.cuid);
      const mimeType = upload.type || null;

      // @relation(GSSC-BLLR-497, GSSC-BLLR-498, scope=range_start, role=Implementation)
      const existing = await prisma.storedFileEntry.findFirst({
        where: {
          name: params.cuid,
          kind: "file",
          parentId: folderId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existing !== null) {
        const written = await writeStoredBytes(storageKey, bytes);
        if (written === null) {
          return statusFn(500, "Invalid" as const);
        }
        await prisma.storedFileEntry.update({
          where: { id: existing.id },
          data: {
            storageKey,
            mimeType,
            sizeBytes: bytes.byteLength,
          },
        });
      } else {
        const created = await prisma.storedFileEntry.create({
          data: {
            name: params.cuid,
            kind: "file",
            parentId: folderId,
            storageKey,
            mimeType,
            sizeBytes: bytes.byteLength,
            isPublic: true,
            readRoles: JSON.stringify([]),
            writeRoles: JSON.stringify(["toolEditor"]),
          },
        });
        const written = await writeStoredBytes(storageKey, bytes);
        if (written === null) {
          await prisma.storedFileEntry.delete({ where: { id: created.id } });
          return statusFn(500, "Invalid" as const);
        }
      }

      await prisma.researchTool.update({
        where: { id: params.cuid },
        data: { referenceLink: "" },
      });
      // @relation(GSSC-BLLR-497, GSSC-BLLR-498, scope=range_end, role=Implementation)

      return { cuid: params.cuid, path: storageKey };
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: t.Object({
        file: t.File(),
        name: t.Optional(t.String()),
      }),
      cookie: loginTokenCookie,
      response: {
        200: ResearchToolFileUploaded,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
        500: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, status }) => {
      const prisma = runtimePrisma();
      const row = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-347, scope=range_start, role=Implementation)
      return status(200, await toEntry(row));
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

      const prisma = runtimePrisma();
      const existing = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      const data: { title?: string; referenceLink?: string } = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.referenceLink !== undefined) data.referenceLink = body.referenceLink;
      if (Object.keys(data).length === 0) return status(422, "Invalid" as const);

      if (
        body.referenceLink !== undefined &&
        body.referenceLink.trim().length > 0
      ) {
        await softDeleteResearchToolFile(existing.id);
      }

      // @relation(GSSC-BLLR-348, scope=range_start, role=Implementation)
      const updated = await prisma.researchTool.update({
        where: { id: existing.id },
        data,
      });
      return status(200, await toEntry(updated));
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

      const prisma = runtimePrisma();
      const existing = await prisma.researchTool.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      await softDeleteResearchToolFile(existing.id);

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

/** Test helper: reset memoized init between harness boots. */
export function resetResearchToolsInitForTests(): void {
  researchToolsReady = undefined;
}

/** Resolve storage path under research-tools for tests. */
export function researchToolAbsolutePath(storageKey: string): string | null {
  return absoluteStoragePath(storageKey);
}
