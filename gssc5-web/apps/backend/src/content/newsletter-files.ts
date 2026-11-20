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
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";

/** Dedicated newsletters issue-file store (GSSC5-142). */
export const NEWSLETTERS_DIR = "newsletters";

const NewsletterFileCreated = t.Object({
  cuid: t.String(),
  path: t.String(),
});

type SessionUser = {
  isAdmin: boolean;
  isNewsletterEditor: boolean;
};

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: SessionUser };

let newslettersReady: Promise<string> | undefined;

function runtimePrisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtimePrisma(), cookie, {
    isAdmin: true,
    isNewsletterEditor: true,
  });
}

function canEditNewsletters(user: SessionUser): boolean {
  return user.isAdmin || user.isNewsletterEditor;
}

/** Absolute FS directory for newsletter issue files under FILE_STORAGE_ROOT. */
export function newslettersFsRoot(): string {
  return path.join(storageRoot(), NEWSLETTERS_DIR);
}

export async function ensureNewslettersFs(): Promise<void> {
  await ensureStorageRoot();
  await mkdir(newslettersFsRoot(), { recursive: true });
}

/**
 * Ensure the newsletters folder exists in DB + on disk; return folder cuid.
 * Safe to call repeatedly (idempotent by name under root).
 */
// @relation(GSSC-BLLR-493, scope=range_start, role=Implementation)
export async function ensureNewslettersFolder(): Promise<string> {
  newslettersReady ??= (async () => {
    await ensureNewslettersFs();
    const prisma = runtimePrisma();
    const existing = await prisma.storedFileEntry.findFirst({
      where: {
        name: NEWSLETTERS_DIR,
        kind: "folder",
        parentId: null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.storedFileEntry.create({
      data: {
        name: NEWSLETTERS_DIR,
        kind: "folder",
        parentId: null,
        isPublic: true,
        readRoles: JSON.stringify([]),
        writeRoles: JSON.stringify(["newsletterEditor"]),
      },
      select: { id: true },
    });
    return created.id;
  })().catch((error: unknown) => {
    newslettersReady = undefined;
    throw error;
  });
  return newslettersReady;
}
// @relation(GSSC-BLLR-493, scope=range_end, role=Implementation)

function storageKeyForNewsletter(newsletterCuid: string): string {
  return `${NEWSLETTERS_DIR}/${newsletterCuid}`;
}

/** Display filename for PDF chrome / Content-Disposition (GSSC5-144 / GSSC-191). */
// @relation(GSSC-BLLR-506, scope=range_start, role=Implementation)
export function newsletterIssueDisplayName(volume: number, number: number): string {
  return `Vol${volume}No${number}.pdf`;
}
// @relation(GSSC-BLLR-506, scope=range_end, role=Implementation)

const newsletterFileSelect = {
  id: true,
  name: true,
  kind: true,
  parentId: true,
  storageKey: true,
  mimeType: true,
  deletedAt: true,
} as const;

async function syncNewsletterDisplayName(
  entryId: string,
  newsletterCuid: string,
  currentName: string,
) {
  const prisma = runtimePrisma();
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterCuid },
    select: { volume: true, number: true },
  });
  if (newsletter === null) return currentName;
  const displayName = newsletterIssueDisplayName(
    newsletter.volume,
    newsletter.number,
  );
  if (displayName === currentName) return currentName;
  await prisma.storedFileEntry.update({
    where: { id: entryId },
    data: { name: displayName },
  });
  return displayName;
}

/**
 * When serving a newsletters-store file, ensure Content-Disposition uses Vol/No.pdf.
 * Newsletter issue entries use the newsletter cuid as StoredFileEntry.id.
 */
export async function newsletterDispositionFileName(args: {
  id: string;
  name: string;
  parentId: string | null;
}): Promise<string> {
  if (!(await isNewsletterFileEntry(args.parentId))) return args.name;
  return syncNewsletterDisplayName(args.id, args.id, args.name);
}

/** Keep StoredFileEntry.name as Vol{volume}No{number}.pdf when volume/number change. */
export async function syncNewsletterFileDisplayName(args: {
  newsletterCuid: string;
  volume: number;
  number: number;
  filePath: string;
}): Promise<void> {
  const prisma = runtimePrisma();
  const displayName = newsletterIssueDisplayName(args.volume, args.number);
  const entryId =
    args.filePath.trim().length > 0 ? args.filePath.trim() : args.newsletterCuid;
  const row = await prisma.storedFileEntry.findUnique({
    where: { id: entryId },
    select: { id: true, name: true, deletedAt: true, parentId: true },
  });
  if (row === null || row.deletedAt !== null) return;
  if (!(await isNewsletterFileEntry(row.parentId))) return;
  if (row.name === displayName) return;
  await prisma.storedFileEntry.update({
    where: { id: row.id },
    data: { name: displayName },
  });
}

async function loadNewsletterFileByCuid(newsletterCuid: string) {
  const prisma = runtimePrisma();
  const byId = await prisma.storedFileEntry.findUnique({
    where: { id: newsletterCuid },
    select: newsletterFileSelect,
  });
  if (byId !== null && byId.deletedAt === null) {
    const name = await syncNewsletterDisplayName(
      byId.id,
      newsletterCuid,
      byId.name,
    );
    return name === byId.name ? byId : { ...byId, name };
  }

  const folderId = await ensureNewslettersFolder();
  // Legacy: entry named by newsletter cuid before Vol/No display names.
  const byName = await prisma.storedFileEntry.findFirst({
    where: {
      name: newsletterCuid,
      kind: "file",
      parentId: folderId,
      deletedAt: null,
    },
    select: newsletterFileSelect,
  });
  if (byName === null) return null;
  const name = await syncNewsletterDisplayName(
    byName.id,
    newsletterCuid,
    byName.name,
  );
  return name === byName.name ? byName : { ...byName, name };
}

async function isNewsletterFileEntry(parentId: string | null): Promise<boolean> {
  if (parentId === null) return false;
  const folderId = await ensureNewslettersFolder();
  return parentId === folderId;
}

/**
 * Soft-delete a prior issue-file entry and remove its bytes when they are not
 * the replacement storage key (same-key overwrites keep the file on disk).
 */
async function retirePriorNewsletterFile(args: {
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

/** Soft-delete prior issue files this newsletter's filePath / cuid named. */
async function deletePriorNewsletterFiles(args: {
  newsletterCuid: string;
  priorFilePath: string | null | undefined;
  keepEntryId: string;
  keepStorageKey: string;
  folderId: string;
}): Promise<void> {
  const prisma = runtimePrisma();
  const prior = args.priorFilePath?.trim() ?? "";
  if (prior.length > 0 && prior !== args.newsletterCuid && prior !== args.keepEntryId) {
    const priorEntry = await prisma.storedFileEntry.findUnique({
      where: { id: prior },
      select: { id: true, storageKey: true, deletedAt: true },
    });
    if (priorEntry !== null && priorEntry.deletedAt === null) {
      await retirePriorNewsletterFile({
        entryId: priorEntry.id,
        storageKey: priorEntry.storageKey,
        keepEntryId: args.keepEntryId,
        keepStorageKey: args.keepStorageKey,
      });
    }
  }

  const siblings = await prisma.storedFileEntry.findMany({
    where: {
      parentId: args.folderId,
      kind: "file",
      deletedAt: null,
      NOT: { id: args.keepEntryId },
      OR: [
        { name: args.newsletterCuid },
        ...(prior.length > 0 ? [{ id: prior }] : []),
      ],
    },
    select: { id: true, storageKey: true },
  });
  for (const sibling of siblings) {
    await retirePriorNewsletterFile({
      entryId: sibling.id,
      storageKey: sibling.storageKey,
      keepEntryId: args.keepEntryId,
      keepStorageKey: args.keepStorageKey,
    });
  }
}

export const newsletterFiles = new Elysia({ prefix: "/newsletter-files" })
  .guard({ cookie: loginTokenCookie })
  .onStart(() => {
    void ensureNewslettersFolder();
  })
  .post(
    "/",
    async ({ body, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      if (!("user" in session)) {
        return statusFn(403, "Forbidden" as const);
      }
      if (!canEditNewsletters(session.user)) {
        return statusFn(403, "Forbidden" as const);
      }

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(422, "Invalid" as const);
      }

      const newsletterCuid =
        typeof body.newsletterCuid === "string" ? body.newsletterCuid.trim() : "";
      if (newsletterCuid.length === 0) {
        return statusFn(422, "Invalid" as const);
      }

      const prisma = runtimePrisma();
      const target = await prisma.newsletter.findUnique({
        where: { id: newsletterCuid },
        select: { id: true, filePath: true, volume: true, number: true },
      });
      if (target === null) return statusFn(404, "Not Found" as const);

      const folderId = await ensureNewslettersFolder();
      const storageKey = storageKeyForNewsletter(newsletterCuid);
      const mimeType = upload.type || null;
      // @relation(GSSC-BLLR-506, scope=range_start, role=Implementation)
      const displayName = newsletterIssueDisplayName(target.volume, target.number);
      // @relation(GSSC-BLLR-506, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-494, GSSC-BLLR-495, scope=range_start, role=Implementation)
      const existing =
        (await prisma.storedFileEntry.findUnique({
          where: { id: newsletterCuid },
          select: { id: true, deletedAt: true },
        })) ??
        (await prisma.storedFileEntry.findFirst({
          where: {
            OR: [{ name: newsletterCuid }, { storageKey }],
            kind: "file",
            parentId: folderId,
            deletedAt: null,
          },
          select: { id: true, deletedAt: true },
        }));

      let keepEntryId: string;
      if (existing !== null && existing.deletedAt === null) {
        const written = await writeStoredBytes(storageKey, upload);
        if (written === null) {
          return statusFn(500, "Invalid" as const);
        }
        await prisma.storedFileEntry.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            storageKey,
            mimeType,
            sizeBytes: upload.size,
            isPublic: true,
            deletedAt: null,
          },
        });
        keepEntryId = existing.id;
      } else {
        const written = await writeStoredBytes(storageKey, upload);
        if (written === null) {
          return statusFn(500, "Invalid" as const);
        }
        if (existing !== null) {
          await prisma.storedFileEntry.update({
            where: { id: existing.id },
            data: {
              name: displayName,
              kind: "file",
              parentId: folderId,
              storageKey,
              mimeType,
              sizeBytes: upload.size,
              isPublic: true,
              readRoles: JSON.stringify([]),
              writeRoles: JSON.stringify(["newsletterEditor"]),
              deletedAt: null,
            },
          });
          keepEntryId = existing.id;
        } else {
          const created = await prisma.storedFileEntry.create({
            data: {
              id: newsletterCuid,
              name: displayName,
              kind: "file",
              parentId: folderId,
              storageKey,
              mimeType,
              sizeBytes: upload.size,
              isPublic: true,
              readRoles: JSON.stringify([]),
              writeRoles: JSON.stringify(["newsletterEditor"]),
            },
          });
          keepEntryId = created.id;
        }
      }

      await deletePriorNewsletterFiles({
        newsletterCuid,
        priorFilePath: target.filePath,
        keepEntryId,
        keepStorageKey: storageKey,
        folderId,
      });

      if (target.filePath !== newsletterCuid) {
        await prisma.newsletter.update({
          where: { id: newsletterCuid },
          data: { filePath: newsletterCuid },
        });
      }
      // @relation(GSSC-BLLR-494, GSSC-BLLR-495, scope=range_end, role=Implementation)

      return { cuid: newsletterCuid, path: storageKey };
    },
    {
      body: t.Object({
        file: t.File(),
        newsletterCuid: t.String({ minLength: 1 }),
        name: t.Optional(t.String()),
      }),
      response: {
        200: NewsletterFileCreated,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
        500: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, status: statusFn }) => {
      const row = await loadNewsletterFileByCuid(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, "Not Found" as const);
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, "Not Found" as const);
      }
      if (!(await isNewsletterFileEntry(row.parentId))) {
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
    },
    {
      params: t.Object({ cuid: t.String() }),
    },
  );

/** Test helper: reset memoized init between harness boots. */
export function resetNewslettersInitForTests(): void {
  newslettersReady = undefined;
}

/** Resolve storage path under newsletters for tests. */
export function newsletterFileAbsolutePath(storageKey: string): string | null {
  return absoluteStoragePath(storageKey);
}
