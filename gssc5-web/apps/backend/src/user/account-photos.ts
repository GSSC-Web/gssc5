import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  absoluteStoragePath,
  ensureStorageRoot,
  readStoredFile,
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

type SessionUser = { id: string };

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: SessionUser };

let accountPhotosReady: Promise<string> | undefined;

function runtimePrisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtimePrisma(), cookie, { id: true });
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

function sanitizeFileName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
    return null;
  }
  if (trimmed === "." || trimmed === "..") return null;
  return trimmed;
}

async function loadAccountPhotoFile(cuid: string) {
  const prisma = runtimePrisma();
  return prisma.storedFileEntry.findUnique({
    where: { id: cuid },
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
 * stores this photo cuid and has a non-empty position (leadership display).
 */
// @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_start, role=Implementation)
export async function canGetAccountPhoto(
  fileCuid: string,
  session: Session,
): Promise<boolean> {
  if ("user" in session) return true;
  const prisma = runtimePrisma();
  const owner = await prisma.user.findFirst({
    where: {
      accountPhoto: fileCuid,
      NOT: [{ position: null }, { position: "" }],
    },
    select: { id: true },
  });
  return owner !== null;
}
// @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_end, role=Implementation)

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
        return statusFn(401, { error: "unauthorized" });
      }

      const upload = body.file;
      if (upload === undefined || upload === null) {
        return statusFn(400, { error: "missing file" });
      }

      const providedName =
        typeof body.name === "string" && body.name.length > 0
          ? body.name
          : upload.name;
      const name = sanitizeFileName(providedName ?? "photo.bin");
      if (name === null) return statusFn(400, { error: "invalid name" });

      const folderId = await ensureAccountPhotosFolder();
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const prisma = runtimePrisma();

      // @relation(GSSC-BLLR-456, scope=range_start, role=Implementation)
      const created = await prisma.storedFileEntry.create({
        data: {
          name,
          kind: "file",
          parentId: folderId,
          storageKey: "pending",
          mimeType: upload.type || null,
          sizeBytes: bytes.byteLength,
          isPublic: false,
          readRoles: JSON.stringify(["member"]),
          writeRoles: JSON.stringify(["member"]),
        },
      });
      const storageKey = `${ACCOUNT_PHOTOS_DIR}/${created.id}`;
      const written = await writeStoredBytes(storageKey, bytes);
      if (written === null) {
        await prisma.storedFileEntry.delete({ where: { id: created.id } });
        return statusFn(500, { error: "storage write failed" });
      }
      await prisma.storedFileEntry.update({
        where: { id: created.id },
        data: { storageKey },
      });
      // @relation(GSSC-BLLR-456, scope=range_end, role=Implementation)

      return { cuid: created.id, path: storageKey };
    },
    {
      body: t.Object({
        file: t.File(),
        name: t.Optional(t.String()),
      }),
      response: {
        200: AccountPhotoCreated,
        400: t.Object({ error: t.String() }),
        401: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() }),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status: statusFn }) => {
      const session = await openSession(cookie);
      const row = await loadAccountPhotoFile(params.cuid);
      if (row === null || row.deletedAt !== null) {
        return statusFn(404, { error: "not found" });
      }
      if (row.kind !== "file" || row.storageKey === null) {
        return statusFn(404, { error: "not found" });
      }
      if (!(await isAccountPhotoEntry(row.parentId))) {
        return statusFn(404, { error: "not found" });
      }
      // @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_start, role=Implementation)
      if (!(await canGetAccountPhoto(row.id, session))) {
        return statusFn(403, { error: "forbidden" });
      }
      // @relation(GSSC-BLLR-454, GSSC-BLLR-455, scope=range_end, role=Implementation)

      const file = readStoredFile(row.storageKey);
      if (file === null || !(await file.exists())) {
        return statusFn(404, { error: "not found" });
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
