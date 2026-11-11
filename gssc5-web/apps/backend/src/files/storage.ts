import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config";

/** Resolve and write bytes under FILE_STORAGE_ROOT (GSSC5-71). */

export function storageRoot(): string {
  // @relation(GSSC-BLLR-365, scope=range_start, role=Implementation)
  return path.resolve(loadConfig().FILE_STORAGE_ROOT);
  // @relation(GSSC-BLLR-365, scope=range_end, role=Implementation)
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

export function readStoredFile(storageKey: string): Bun.BunFile | null {
  const absolute = absoluteStoragePath(storageKey);
  if (absolute === null) return null;
  return Bun.file(absolute);
}
