import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config";

/** Resolve and write bytes under FILE_STORAGE_ROOT (GSSC5-71). */

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

export async function writeStoredBytes(
  storageKey: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const absolute = absoluteStoragePath(storageKey);
  if (absolute === null) return null;
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return absolute;
}

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
