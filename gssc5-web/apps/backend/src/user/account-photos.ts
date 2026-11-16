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
} from "./login-session";

/** Dedicated account-photos store (GSSC5-101). */
export const ACCOUNT_PHOTOS_DIR = "account-photos";

const AccountPhotoCreated = t.Object({
  cuid: t.String(),
  path: t.String(),
});

type SessionUser = { id: string; isAdmin: boolean; isUserMod: boolean };

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: SessionUser };

let accountPhotosReady: Promise<string> | undefined;

function runtimePrisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtimePrisma(), cookie, {
    id: true,
    isAdmin: true,
    isUserMod: true,
  });
}

/** Absolute FS directory for account photos under FILE_STORAGE_ROOT. */
export function accountPhotosFsRoot(): string {
  return path.join(storageRoot(), ACCOUNT_PHOTOS_DIR);
}

export async function ensureAccountPhotosFs(): Promise<void> {
  await ensureStorageRoot();
  await mkdir(accountPhotosFsRoot(), { recursive: true });
}

/**
 * Ensure the account-photos folder exists in DB + on disk; return folder cuid.
 * Safe to call repeatedly (idempotent by name under root).
 */
// @relation(GSSC-BLLR-453, scope=range_start, role=Implementation)
export async function ensureAccountPhotosFolder(): Promise<string> {
  accountPhotosReady ??= (async () => {
    await ensureAccountPhotosFs();
    const prisma = runtimePrisma();
    const existing = await prisma.storedFileEntry.findFirst({
      where: {
        name: ACCOUNT_PHOTOS_DIR,
        kind: "folder",
        parentId: null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.storedFileEntry.create({
      data: {
        name: ACCOUNT_PHOTOS_DIR,
        kind: "folder",
        parentId: null,
        isPublic: false,
        readRoles: JSON.stringify(["member"]),
        writeRoles: JSON.stringify(["member"]),
      },
      select: { id: true },
    });
    return created.id;
  })().catch((error: unknown) => {
    accountPhotosReady = undefined;
    throw error;
  });
  return accountPhotosReady;
}
// @relation(GSSC-BLLR-453, scope=range_end, role=Implementation)

function storageKeyForUser(userCuid: string): string {
  return `${ACCOUNT_PHOTOS_DIR}/${userCuid}`;
}

async function loadAccountPhotoByUserCuid(userCuid: string) {
  const prisma = runtimePrisma();
  const folderId = await ensureAccountPhotosFolder();
  const byName = await prisma.storedFileEntry.findFirst({
    where: {
      name: userCuid,
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
  if (byName !== null) return byName;
  // Legacy: entry id was the path token before cuid-named photos.
  return prisma.storedFileEntry.findUnique({
    where: { id: userCuid },
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

/** True when the file sits directly under the account-photos folder. */
async function isAccountPhotoEntry(parentId: string | null): Promise<boolean> {
  if (parentId === null) return false;
  const folderId = await ensureAccountPhotosFolder();
  return parentId === folderId;
}

/**
 * GET allowed when the caller has a valid login session, or when some user
 * stores this photo (or owns the cuid-named photo) and has a non-empty position.
 * Cuid-named photos remain readable after replace once the user record points at
 * the new key (upload updates accountPhoto); soft-deleted priors stay 404.
 */
// @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_start, role=Implementation)
export async function canGetAccountPhoto(
  photoKey: string,
  session: Session,
): Promise<boolean> {
  if ("user" in session) return true;
  const prisma = runtimePrisma();
  const owner = await prisma.user.findFirst({
    where: {
      OR: [{ accountPhoto: photoKey }, { id: photoKey }],
      NOT: [{ position: null }, { position: "" }],
    },
    select: { id: true },
  });
  return owner !== null;
}
// @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_end, role=Implementation)

function canUploadForUser(sessionUser: SessionUser, targetUserCuid: string): boolean {
  if (sessionUser.id === targetUserCuid) return true;
  return sessionUser.isAdmin || sessionUser.isUserMod;
}

/**
 * Soft-delete a prior photo entry and remove its bytes when they are not the
 * replacement storage key (same-key overwrites keep the file on disk).
 */
async function retirePriorAccountPhoto(args: {
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

/** Soft-delete prior photos for this user that the replacement supersedes. */
async function deletePriorAccountPhotos(args: {
  userCuid: string;
  priorAccountPhoto: string | null | undefined;
  keepEntryId: string;
  keepStorageKey: string;
  folderId: string;
}): Promise<void> {
  const prisma = runtimePrisma();
  const prior = args.priorAccountPhoto?.trim() ?? "";
  if (prior.length > 0 && prior !== args.userCuid) {
    const priorEntry = await prisma.storedFileEntry.findUnique({
      where: { id: prior },
      select: { id: true, storageKey: true, deletedAt: true },
    });
    if (priorEntry !== null && priorEntry.deletedAt === null) {
      await retirePriorAccountPhoto({
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
      OR: [{ name: args.userCuid }, ...(prior.length > 0 ? [{ id: prior }] : [])],
    },
    select: { id: true, storageKey: true },
  });
  for (const sibling of siblings) {
    await retirePriorAccountPhoto({
      entryId: sibling.id,
      storageKey: sibling.storageKey,
      keepEntryId: args.keepEntryId,
      keepStorageKey: args.keepStorageKey,
    });
  }
}

export const accountPhotos = new Elysia({ prefix: "/account-photos" })
  .guard({ cookie: loginTokenCookie })
  .onStart(() => {
    void ensureAccountPhotosFolder();
  })
  .post(
    "/",
    async ({ body, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      if (!("user" in session)) {
        return statusFn(403, "Forbidden" as const);
      }

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(422, "Invalid" as const);
      }

      const targetUserCuid =
        typeof body.userCuid === "string" && body.userCuid.trim().length > 0
          ? body.userCuid.trim()
          : session.user.id;
      if (!canUploadForUser(session.user, targetUserCuid)) {
        return statusFn(403, "Forbidden" as const);
      }

      const prisma = runtimePrisma();
      const target = await prisma.user.findUnique({
        where: { id: targetUserCuid },
        select: { id: true, accountPhoto: true },
      });
      if (target === null) return statusFn(404, "Not Found" as const);

      const folderId = await ensureAccountPhotosFolder();
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const storageKey = storageKeyForUser(targetUserCuid);
      const mimeType = upload.type || null;

      // @relation(GSSC-BLLR-456, GSSC-BLLR-458, scope=range_start, role=Implementation)
      const existing = await prisma.storedFileEntry.findFirst({
        where: {
          name: targetUserCuid,
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
            name: targetUserCuid,
            kind: "file",
            parentId: folderId,
            storageKey,
            mimeType,
            sizeBytes: bytes.byteLength,
            isPublic: false,
            readRoles: JSON.stringify(["member"]),
            writeRoles: JSON.stringify(["member"]),
          },
        });
        const written = await writeStoredBytes(storageKey, bytes);
        if (written === null) {
          await prisma.storedFileEntry.delete({ where: { id: created.id } });
          return statusFn(500, "Invalid" as const);
        }
        keepEntryId = created.id;
      }

      await deletePriorAccountPhotos({
        userCuid: targetUserCuid,
        priorAccountPhoto: target.accountPhoto,
        keepEntryId,
        keepStorageKey: storageKey,
        folderId,
      });

      // Point the user record at the cuid-named photo before the client PATCHes,
      // so session and position ACL resolve the replacement (not the retired prior).
      if (target.accountPhoto !== targetUserCuid) {
        await prisma.user.update({
          where: { id: targetUserCuid },
          data: { accountPhoto: targetUserCuid },
        });
      }
      // @relation(GSSC-BLLR-456, GSSC-BLLR-458, scope=range_end, role=Implementation)

      return { cuid: targetUserCuid, path: storageKey };
    },
    {
      body: t.Object({
        file: t.File(),
        userCuid: t.Optional(t.String()),
        name: t.Optional(t.String()),
      }),
      response: {
        200: AccountPhotoCreated,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
        500: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const row = await loadAccountPhotoByUserCuid(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, "Not Found" as const);
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, "Not Found" as const);
      }
      if (!(await isAccountPhotoEntry(row.parentId))) {
        return statusFn(404, "Not Found" as const);
      }
      // @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_start, role=Implementation)
      if (!(await canGetAccountPhoto(params.cuid, session))) {
        return statusFn(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_end, role=Implementation)

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
export function resetAccountPhotosInitForTests(): void {
  accountPhotosReady = undefined;
}

/** Resolve storage path under account-photos for tests. */
export function accountPhotoAbsolutePath(storageKey: string): string | null {
  return absoluteStoragePath(storageKey);
}
