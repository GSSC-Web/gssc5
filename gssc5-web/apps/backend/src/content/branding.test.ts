import { access } from "node:fs/promises";
import path from "node:path";

import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import {
  BRANDING_DIR,
  BRANDING_FAVICON_KEY,
  BRANDING_LOGO_KEY,
  DEFAULT_BRANDING_FAVICON_PATH,
  DEFAULT_BRANDING_LOGO_PATH,
  ensureBrandingStubFiles,
  prepareBrandingAssets,
} from "./branding";

let app: InProcessApp;
let backend: BackendFetch;

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  await prepareBrandingAssets();
}, 120_000);

function db() {
  return getPrisma(loadConfig().DATABASE_URL);
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

// @relation(GSSC-BLLR-514, scope=range_start, role=Test)
test("GSSC-BLLR-514 Branding Directory Under Storage Root", async () => {
  await ensureBrandingStubFiles();
  const root = path.resolve(loadConfig().FILE_STORAGE_ROOT, BRANDING_DIR);
  await access(root);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, DEFAULT_BRANDING_FAVICON_PATH));
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, DEFAULT_BRANDING_LOGO_PATH));
});
// @relation(GSSC-BLLR-514, scope=range_end, role=Test)

// @relation(GSSC-BLLR-515, scope=range_start, role=Test)
test("GSSC-BLLR-515 Branding Default Path KV Stubs", async () => {
  await db().keyValue.deleteMany({
    where: { key: { in: [BRANDING_FAVICON_KEY, BRANDING_LOGO_KEY] } },
  });
  await prepareBrandingAssets();
  const favicon = await db().keyValue.findUnique({ where: { key: BRANDING_FAVICON_KEY } });
  const logo = await db().keyValue.findUnique({ where: { key: BRANDING_LOGO_KEY } });
  expect(favicon?.value).toBe(DEFAULT_BRANDING_FAVICON_PATH);
  expect(logo?.value).toBe(DEFAULT_BRANDING_LOGO_PATH);

  const viaApi = await backend(
    new Request(`http://127.0.0.1/kvs/${encodeURIComponent(BRANDING_LOGO_KEY)}`),
  );
  expect(viaApi.status).toBe(200);
  expect(await viaApi.json()).toEqual({
    key: BRANDING_LOGO_KEY,
    value: DEFAULT_BRANDING_LOGO_PATH,
  });

  const adminFavicon = "branding/admin-favicon.ico";
  const adminLogo = "branding/admin-logo.png";
  await db().keyValue.update({
    where: { key: BRANDING_FAVICON_KEY },
    data: { value: adminFavicon },
  });
  await db().keyValue.update({
    where: { key: BRANDING_LOGO_KEY },
    data: { value: adminLogo },
  });
  await prepareBrandingAssets();
  expect(
    (await db().keyValue.findUnique({ where: { key: BRANDING_FAVICON_KEY } }))?.value,
  ).toBe(adminFavicon);
  expect(
    (await db().keyValue.findUnique({ where: { key: BRANDING_LOGO_KEY } }))?.value,
  ).toBe(adminLogo);
});
// @relation(GSSC-BLLR-515, scope=range_end, role=Test)

// @relation(GSSC-BLLR-516, scope=range_start, role=Test)
test("GSSC-BLLR-516 Public Branding File Get", async () => {
  const logo = await backend(new Request("http://127.0.0.1/branding/gssc-society-logo.png"));
  expect(logo.status).toBe(200);
  expect(logo.headers.get("content-type")).toBe("image/png");
  const logoBytes = new Uint8Array(await logo.arrayBuffer());
  expect(logoBytes[0]).toBe(0x89);
  expect(logoBytes[1]).toBe(0x50);
  expect(logoBytes[2]).toBe(0x4e);
  expect(logoBytes[3]).toBe(0x47);

  const favicon = await backend(new Request("http://127.0.0.1/branding/favicon.ico"));
  expect(favicon.status).toBe(200);
  expect(favicon.headers.get("content-type")).toBe("image/x-icon");
  const faviconBytes = new Uint8Array(await favicon.arrayBuffer());
  expect(readU16LE(faviconBytes, 0)).toBe(0);
  expect(readU16LE(faviconBytes, 2)).toBe(1);
  expect(readU16LE(faviconBytes, 4)).toBeGreaterThan(0);

  const missing = await backend(new Request("http://127.0.0.1/branding/missing.png"));
  expect(missing.status).toBe(404);

  const escape = await backend(new Request("http://127.0.0.1/branding/..%2Fconfig.ts"));
  expect(escape.status).toBe(404);
});
// @relation(GSSC-BLLR-516, scope=range_end, role=Test)

// @relation(GSSC-BLLR-517, scope=range_start, role=Test)
test("GSSC-BLLR-517 Branding Stub Files When Missing", async () => {
  await ensureBrandingStubFiles();
  const faviconPath = path.resolve(
    loadConfig().FILE_STORAGE_ROOT,
    DEFAULT_BRANDING_FAVICON_PATH,
  );
  const logoPath = path.resolve(loadConfig().FILE_STORAGE_ROOT, DEFAULT_BRANDING_LOGO_PATH);
  const favicon = Bun.file(faviconPath);
  const logo = Bun.file(logoPath);
  expect(await favicon.exists()).toBe(true);
  expect(await logo.exists()).toBe(true);
  expect(favicon.size).toBeGreaterThan(0);
  expect(logo.size).toBeGreaterThan(0);
});
// @relation(GSSC-BLLR-517, scope=range_end, role=Test)
