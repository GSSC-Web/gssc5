import { unlink } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { bootInProcess } from "../test-harness";
import {
  absoluteStoragePath,
  ensureStorageRoot,
  readStoredFile,
  writeStoredBytes,
} from "./storage";

beforeAll(async () => {
  await bootInProcess();
  await ensureStorageRoot();
});

const keys: string[] = [];

afterAll(async () => {
  for (const key of keys) {
    const absolute = absoluteStoragePath(key);
    if (absolute === null) continue;
    try {
      await unlink(absolute);
    } catch {
      /* missing ok */
    }
  }
});

// @relation(GSSC-BLLR-508, scope=range_start, role=Test)
test("GSSC-BLLR-508 writeStoredBytes accepts File without intermediate Uint8Array", async () => {
  const key = `gssc5-146-file-${Date.now()}.bin`;
  keys.push(key);
  const payload = new File(["catalog-upload-bytes"], "upload.bin", {
    type: "application/octet-stream",
  });
  const written = await writeStoredBytes(key, payload);
  expect(written).not.toBeNull();
  expect(written).toBe(path.join(loadConfig().FILE_STORAGE_ROOT, key));

  const file = readStoredFile(key);
  expect(file).not.toBeNull();
  expect(await file!.text()).toBe("catalog-upload-bytes");
});
// @relation(GSSC-BLLR-508, scope=range_end, role=Test)

test("writeStoredBytes rejects storage keys that escape the root", async () => {
  const written = await writeStoredBytes("../escape.bin", new Uint8Array([1]));
  expect(written).toBeNull();
});

test("writeStoredBytes still accepts Uint8Array for legacy callers", async () => {
  const key = `gssc5-146-u8-${Date.now()}.bin`;
  keys.push(key);
  const written = await writeStoredBytes(key, new TextEncoder().encode("legacy"));
  expect(written).not.toBeNull();
  expect(await readStoredFile(key)!.text()).toBe("legacy");
});
