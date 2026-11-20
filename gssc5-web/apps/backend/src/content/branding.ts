import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Elysia, t } from "elysia";

import { getPrisma } from "../db";
import { loadConfig } from "../config";
import {
  absoluteStoragePath,
  ensureStorageRoot,
  readStoredFile,
  storageRoot,
  writeStoredBytes,
} from "../files/storage";

/** Dedicated public branding asset store (GSSC5-151 / GSSC-201). */
export const BRANDING_DIR = "branding";

export const BRANDING_FAVICON_KEY = "branding.favicon";
export const BRANDING_LOGO_KEY = "branding.logo";

export const DEFAULT_BRANDING_FAVICON_PATH = `${BRANDING_DIR}/favicon.ico`;
export const DEFAULT_BRANDING_LOGO_PATH = `${BRANDING_DIR}/gssc-society-logo.png`;

/** Default branding path stubs for the website key-value store. */
export const BRANDING_DEV_KVS = [
  { key: BRANDING_FAVICON_KEY, value: DEFAULT_BRANDING_FAVICON_PATH },
  { key: BRANDING_LOGO_KEY, value: DEFAULT_BRANDING_LOGO_PATH },
] as const;

/** Minimal 1×1 PNG (valid signature; not committed as a binary asset file). */
const STUB_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/** Minimal ICO with one PNG image entry (valid ICO header). */
const STUB_ICO = (() => {
  const header = new Uint8Array(6 + 16);
  // ICONDIR: reserved=0, type=1 (icon), count=1
  header[2] = 1;
  header[4] = 1;
  // ICONDIRENTRY
  header[6] = 1; // width
  header[7] = 1; // height
  header[8] = 0; // palette
  header[9] = 0;
  header[10] = 1; // planes LE
  header[12] = 32; // bit count LE
  const size = STUB_PNG.byteLength;
  header[14] = size & 0xff;
  header[15] = (size >> 8) & 0xff;
  header[16] = (size >> 16) & 0xff;
  header[17] = (size >> 24) & 0xff;
  const offset = 22;
  header[18] = offset & 0xff;
  header[19] = (offset >> 8) & 0xff;
  header[20] = (offset >> 16) & 0xff;
  header[21] = (offset >> 24) & 0xff;
  const out = new Uint8Array(header.byteLength + STUB_PNG.byteLength);
  out.set(header, 0);
  out.set(STUB_PNG, header.byteLength);
  return out;
})();

let brandingReady: Promise<void> | undefined;

/** Absolute FS directory for branding assets under FILE_STORAGE_ROOT. */
export function brandingFsRoot(): string {
  return path.join(storageRoot(), BRANDING_DIR);
}

export async function ensureBrandingFs(): Promise<void> {
  await ensureStorageRoot();
  await mkdir(brandingFsRoot(), { recursive: true });
}

function mimeForBrandingFile(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function isSafeBrandingFileName(fileName: string): boolean {
  if (fileName.length === 0) return false;
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return false;
  }
  return true;
}

/**
 * Ensure default branding files exist under FILE_STORAGE_ROOT/branding.
 * Writes minimal stub bytes when a default file is missing (not committed binaries).
 */
// @relation(GSSC-BLLR-514, GSSC-BLLR-517, scope=range_start, role=Implementation)
export async function ensureBrandingStubFiles(): Promise<void> {
  brandingReady ??= (async () => {
    await ensureBrandingFs();
    const faviconAbs = absoluteStoragePath(DEFAULT_BRANDING_FAVICON_PATH);
    const logoAbs = absoluteStoragePath(DEFAULT_BRANDING_LOGO_PATH);
    if (faviconAbs !== null) {
      const favicon = Bun.file(faviconAbs);
      if (!(await favicon.exists())) {
        await writeStoredBytes(DEFAULT_BRANDING_FAVICON_PATH, STUB_ICO);
      }
    }
    if (logoAbs !== null) {
      const logo = Bun.file(logoAbs);
      if (!(await logo.exists())) {
        await writeStoredBytes(DEFAULT_BRANDING_LOGO_PATH, STUB_PNG);
      }
    }
  })().catch((error: unknown) => {
    brandingReady = undefined;
    throw error;
  });
  return brandingReady;
}
// @relation(GSSC-BLLR-514, GSSC-BLLR-517, scope=range_end, role=Implementation)

/**
 * Upsert default branding path keys into the website key-value store.
 * Safe to call repeatedly (idempotent).
 */
// @relation(GSSC-BLLR-515, scope=range_start, role=Implementation)
export async function seedBrandingKvs(
  databaseUrl = loadConfig().DATABASE_URL,
): Promise<void> {
  const prisma = getPrisma(databaseUrl);
  for (const row of BRANDING_DEV_KVS) {
    await prisma.keyValue.upsert({
      where: { key: row.key },
      create: { key: row.key, value: row.value },
      update: { value: row.value },
    });
  }
}
// @relation(GSSC-BLLR-515, scope=range_end, role=Implementation)

/** Prepare branding FS stubs + KV path defaults (idempotent). */
export async function prepareBrandingAssets(
  databaseUrl = loadConfig().DATABASE_URL,
): Promise<void> {
  await ensureBrandingStubFiles();
  await seedBrandingKvs(databaseUrl);
}

/** Public branding asset bytes under FILE_STORAGE_ROOT/branding (GSSC5-151). */
export const branding = new Elysia({ prefix: "/branding" })
  .onStart(() => {
    void prepareBrandingAssets();
  })
  .get(
    "/:fileName",
    async ({ params, status: statusFn }) => {
      // @relation(GSSC-BLLR-516, scope=range_start, role=Implementation)
      if (!isSafeBrandingFileName(params.fileName)) {
        return statusFn(404, "Not Found" as const);
      }
      await ensureBrandingStubFiles();
      const storageKey = `${BRANDING_DIR}/${params.fileName}`;
      const file = readStoredFile(storageKey);
      if (file === null || !(await file.exists())) {
        return statusFn(404, "Not Found" as const);
      }
      return new Response(file, {
        headers: {
          "content-type": mimeForBrandingFile(params.fileName),
          "content-disposition": `inline; filename="${params.fileName.replaceAll('"', "")}"`,
          "cache-control": "public, max-age=300",
        },
      });
      // @relation(GSSC-BLLR-516, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        fileName: t.String({ minLength: 1 }),
      }),
      response: {
        404: t.Literal("Not Found"),
      },
    },
  );
