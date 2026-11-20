import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config";

/** Resolve and write bytes under FILE_STORAGE_ROOT (GSSC5-71 / GSSC5-146). */

export function storageRoot(): string {
  return path.resolve(loadConfig().FILE_STORAGE_ROOT);
}

export function absoluteStoragePath(storageKey: string): string | null {
  const root = storageRoot();
  const absolute = path.resolve(root, storageKey);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

export async function ensureStorageRoot(): Promise<void> {
  await mkdir(storageRoot(), { recursive: true });
}

/** Body accepted by Bun.write for stored uploads (Blob/File or typed arrays). */
export type StoredWriteBody = Blob | ArrayBufferView | ArrayBuffer | string;

/** Write upload body under FILE_STORAGE_ROOT. */
// @relation(GSSC-BLLR-508, scope=range_start, role=Implementation)
export async function writeStoredBytes(
  storageKey: string,
  data: StoredWriteBody,
): Promise<string | null> {
  const absolute = absoluteStoragePath(storageKey);
  if (absolute === null) return null;
  await mkdir(path.dirname(absolute), { recursive: true });
  await Bun.write(absolute, data);
  return absolute;
}
// @relation(GSSC-BLLR-508, scope=range_end, role=Implementation)

/** Remove bytes for a storage key when present; missing files are not an error. */
export async function removeStoredBytes(storageKey: string): Promise<boolean> {
  const absolute = absoluteStoragePath(storageKey);
  if (absolute === null) return false;
  try {
    await unlink(absolute);
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

export function readStoredFile(storageKey: string): Bun.BunFile | null {
  const absolute = absoluteStoragePath(storageKey);
  if (absolute === null) return null;
  return Bun.file(absolute);
}
