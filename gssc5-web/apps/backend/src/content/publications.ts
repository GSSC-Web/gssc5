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
  PublicationPlain,
  PublicationPlainInputCreate,
} from "../generated/prismabox/Publication";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";
import { includesInsensitive, parseKnownQuery } from "./helpers";

/** Dedicated publications file store (GSSC-190). */
export const PUBLICATIONS_DIR = "publications";

const PUBLICATION_LIST_FILTERS = new Set(["title", "cuid", "content"]);

const PublicationFileCreated = t.Object({
  cuid: t.String(),
  path: t.String(),
});

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`).
 * `referenceLink` holds the stored-file path `publications/{cuid}`.
 */
const PublicationEntry = t.Object({
  cuid: PublicationPlain.properties.id,
  title: PublicationPlain.properties.title,
  referenceLink: PublicationPlain.properties.referenceLink,
  description: PublicationPlain.properties.description,
});

/**
 * Create body: title + optional description. File bytes upload separately
 * under publications/{cuid}. `additionalProperties: true` keeps ignored
 * extras so auth can return 403 before a schema reject surfaces as 422.
 */
const PublicationCreateBody = t.Object(
  {
    title: PublicationPlainInputCreate.properties.title,
    description: t.Optional(PublicationPlain.properties.description),
  },
  { additionalProperties: true },
);

/** Patch body: title/description only; file replace uses POST …/file. */
const PublicationUpdateBody = t.Object(
  {
    title: t.Optional(PublicationPlain.properties.title),
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

let publicationsFolderReady: Promise<string> | undefined;

function runtimePrisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

function toEntry(row: PublicationRow) {
  return {
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    description: row.description,
  };
}

function storageKeyForPublication(publicationCuid: string): string {
  return `${PUBLICATIONS_DIR}/${publicationCuid}`;
}

function canEditPublications(user: {
  isAdmin: boolean;
  isPublicationEditor: boolean;
}): boolean {
  return user.isAdmin || user.isPublicationEditor;
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtimePrisma(), cookie, {
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

/** Absolute FS directory for publication files under FILE_STORAGE_ROOT. */
export function publicationsFsRoot(): string {
  return path.join(storageRoot(), PUBLICATIONS_DIR);
}

export async function ensurePublicationsFs(): Promise<void> {
  await ensureStorageRoot();
  await mkdir(publicationsFsRoot(), { recursive: true });
}

/**
 * Ensure the publications folder exists in DB + on disk; return folder cuid.
 * Safe to call repeatedly (idempotent by name under root).
 */
// @relation(GSSC-BLLR-501, scope=range_start, role=Implementation)
export async function ensurePublicationsFolder(): Promise<string> {
  publicationsFolderReady ??= (async () => {
    await ensurePublicationsFs();
    const prisma = runtimePrisma();
    const existing = await prisma.storedFileEntry.findFirst({
      where: {
        name: PUBLICATIONS_DIR,
        kind: "folder",
        parentId: null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.storedFileEntry.create({
      data: {
        name: PUBLICATIONS_DIR,
        kind: "folder",
        parentId: null,
        isPublic: true,
        readRoles: JSON.stringify(["member"]),
        writeRoles: JSON.stringify(["publicationEditor"]),
      },
      select: { id: true },
    });
    return created.id;
  })().catch((error: unknown) => {
    publicationsFolderReady = undefined;
    throw error;
  });
  return publicationsFolderReady;
}
// @relation(GSSC-BLLR-501, scope=range_end, role=Implementation)

async function loadPublicationFileEntry(publicationCuid: string) {
  const prisma = runtimePrisma();
  const folderId = await ensurePublicationsFolder();
  return prisma.storedFileEntry.findFirst({
    where: {
      name: publicationCuid,
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

/** Soft-delete a prior publication file entry and remove superseded bytes. */
async function retirePriorPublicationFile(args: {
  entryId: string;
  storageKey: string | null;
  keepEntryId: string;
  keepStorageKey: string;
}): Promise<void> {
  if (args.entryId === args.keepEntryId) return;
  const prisma = runtimePrisma();
  await prisma.storedFileEntry.update({
    where: { id: args.entryId },
    data: { deletedAt: new Date() },
  });
  if (
    args.storageKey !== null &&
    args.storageKey.length > 0 &&
    args.storageKey !== args.keepStorageKey
  ) {
    await removeStoredBytes(args.storageKey);
  }
}

async function deletePriorPublicationFiles(args: {
  publicationCuid: string;
  keepEntryId: string;
  keepStorageKey: string;
  folderId: string;
}): Promise<void> {
  const prisma = runtimePrisma();
  const siblings = await prisma.storedFileEntry.findMany({
    where: {
      parentId: args.folderId,
      kind: "file",
      deletedAt: null,
      NOT: { id: args.keepEntryId },
      name: args.publicationCuid,
    },
    select: { id: true, storageKey: true },
  });
  for (const sibling of siblings) {
    await retirePriorPublicationFile({
      entryId: sibling.id,
      storageKey: sibling.storageKey,
      keepEntryId: args.keepEntryId,
      keepStorageKey: args.keepStorageKey,
    });
  }
}

/** Remove stored publication file bytes + soft-delete file entries for a cuid. */
async function removePublicationStoredFile(publicationCuid: string): Promise<void> {
  const prisma = runtimePrisma();
  const folderId = await ensurePublicationsFolder();
  const storageKey = storageKeyForPublication(publicationCuid);
  const entries = await prisma.storedFileEntry.findMany({
    where: {
      parentId: folderId,
      kind: "file",
      deletedAt: null,
      name: publicationCuid,
    },
    select: { id: true, storageKey: true },
  });
  for (const entry of entries) {
    await prisma.storedFileEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date() },
    });
    if (entry.storageKey !== null && entry.storageKey.length > 0) {
      await removeStoredBytes(entry.storageKey);
    }
  }
  await removeStoredBytes(storageKey);
}

/** Society publications catalog (GSSC5-19 / GSSC-190 file upload). */
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
  .onStart(() => {
    void ensurePublicationsFolder();
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ query, status }) => {
      const filters = parseKnownQuery(query, PUBLICATION_LIST_FILTERS);
      if (filters === "invalid") return status(422, "Invalid" as const);

      // @relation(GSSC-BLLR-356, scope=range_start, role=Implementation)
      const prisma = runtimePrisma();
      const rows = await prisma.publication.findMany({
        orderBy: { title: "asc" },
      });
      const listed = rows.map(toEntry).filter((entry) => {
        if (filters.cuid !== undefined && entry.cuid !== filters.cuid) return false;
        if (filters.title !== undefined && !includesInsensitive(entry.title, filters.title)) {
          return false;
        }
        if (filters.content !== undefined) {
          const inTitle = includesInsensitive(entry.title, filters.content);
          const inDesc = includesInsensitive(entry.description ?? "", filters.content);
          const inLink = includesInsensitive(entry.referenceLink, filters.content);
          if (!inTitle && !inDesc && !inLink) return false;
        }
        return true;
      });
      return status(200, listed);
      // @relation(GSSC-BLLR-356, scope=range_end, role=Implementation)
    },
    {
      query: t.Record(t.String(), t.String()),
      response: {
        200: t.Array(PublicationEntry),
        422: t.Literal("Invalid"),
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
      const prisma = runtimePrisma();
      const created = await prisma.publication.create({
        data: {
          title: body.title,
          // Placeholder until cuid is known; immediately rewritten below.
          referenceLink: PUBLICATIONS_DIR,
          description,
        },
      });
      const referenceLink = storageKeyForPublication(created.id);
      const withPath = await prisma.publication.update({
        where: { id: created.id },
        data: { referenceLink },
      });
      return status(201, toEntry(withPath));
      // @relation(GSSC-BLLR-357, scope=range_end, role=Implementation)
    },
    {
      body: PublicationCreateBody,
      cookie: loginTokenCookie,
      response: {
        201: PublicationEntry,
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid/file",
    async ({ params, status: statusFn }) => {
      const prisma = runtimePrisma();
      const publication = await prisma.publication.findUnique({
        where: { id: params.cuid },
        select: { id: true },
      });
      if (publication === null) return statusFn(404, "Not Found" as const);

      // @relation(GSSC-BLLR-503, scope=range_start, role=Implementation)
      const row = await loadPublicationFileEntry(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, "Not Found" as const);
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, "Not Found" as const);
      }

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
      // @relation(GSSC-BLLR-503, scope=range_end, role=Implementation)
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

      if (!canEditPublications(session.user)) {
        return statusFn(403, "Forbidden" as const);
      }

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(422, "Invalid" as const);
      }

      const prisma = runtimePrisma();
      const publication = await prisma.publication.findUnique({
        where: { id: params.cuid },
        select: { id: true },
      });
      if (publication === null) return statusFn(404, "Not Found" as const);

      const folderId = await ensurePublicationsFolder();
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const storageKey = storageKeyForPublication(params.cuid);
      const mimeType = upload.type || null;

      // @relation(GSSC-BLLR-502, GSSC-BLLR-504, scope=range_start, role=Implementation)
      const existing = await prisma.storedFileEntry.findFirst({
        where: {
          name: params.cuid,
          kind: "file",
          parentId: folderId,
          deletedAt: null,
        },
        select: { id: true },
      });

      let keepEntryId: string;
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
        keepEntryId = existing.id;
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
            readRoles: JSON.stringify(["member"]),
            writeRoles: JSON.stringify(["publicationEditor"]),
          },
        });
        const written = await writeStoredBytes(storageKey, bytes);
        if (written === null) {
          await prisma.storedFileEntry.delete({ where: { id: created.id } });
          return statusFn(500, "Invalid" as const);
        }
        keepEntryId = created.id;
      }

      await deletePriorPublicationFiles({
        publicationCuid: params.cuid,
        keepEntryId,
        keepStorageKey: storageKey,
        folderId,
      });

      await prisma.publication.update({
        where: { id: params.cuid },
        data: { referenceLink: storageKey },
      });
      // @relation(GSSC-BLLR-502, GSSC-BLLR-504, scope=range_end, role=Implementation)

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
        200: PublicationFileCreated,
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

      const prisma = runtimePrisma();
      const existing = await prisma.publication.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      const data: {
        title?: string;
        description?: string | null;
      } = {};
      if (body.title !== undefined) data.title = body.title;
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

      const prisma = runtimePrisma();
      const existing = await prisma.publication.findUnique({
        where: { id: params.cuid },
      });
      if (!existing) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-360, scope=range_start, role=Implementation)
      await removePublicationStoredFile(existing.id);
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

/** Test helper: reset memoized init between harness boots. */
export function resetPublicationsInitForTests(): void {
  publicationsFolderReady = undefined;
}

/** Resolve storage path under publications for tests. */
export function publicationAbsolutePath(storageKey: string): string | null {
  return absoluteStoragePath(storageKey);
}
