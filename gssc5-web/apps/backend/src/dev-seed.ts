import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config";
import { createPrisma } from "./db";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));

/** Local website KVS rows the public shell expects (Footer society contact). */
export const SOCIETY_DEV_KVS = [
  { key: "society.phoneNumber", value: "(209) 529-9430" },
  { key: "society.emailAddress", value: "gsscfounded1968@gmail.com" },
  { key: "society.postalAddress", value: "P.O. Box 1352 Modesto, CA 95353-1352" },
] as const;

/** Apply migrations then upsert expected website KVS values (idempotent). */
export async function prepareDevDatabase(
  databaseUrl = loadConfig().DATABASE_URL,
): Promise<void> {
  deployMigrations(databaseUrl);
  await seedWebsiteKvs(databaseUrl);
}

/** Upsert society contact KVS keys used by the public Footer. */
export async function seedWebsiteKvs(
  databaseUrl = loadConfig().DATABASE_URL,
): Promise<void> {
  const prisma = createPrisma(databaseUrl);
  try {
    for (const row of SOCIETY_DEV_KVS) {
      await prisma.keyValue.upsert({
        where: { key: row.key },
        create: { key: row.key, value: row.value },
        update: { value: row.value },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

function deployMigrations(databaseUrl: string): void {
  if (!existsSync(path.join(backendRoot, "prisma/schema.prisma"))) {
    throw new Error("prisma schema missing; run from the backend app");
  }
  prepareSqliteFile(databaseUrl);
  const result = spawnSync(
    process.execPath,
    ["x", "--bun", "prisma", "migrate", "deploy", "--config", "prisma7.config.ts"],
    {
      cwd: backendRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error("database migration failed");
  }
}

function prepareSqliteFile(databaseUrl: string): void {
  if (!databaseUrl.startsWith("file:")) return;
  const specifier = databaseUrl.slice("file:".length);
  if (specifier === ":memory:" || specifier.startsWith(":memory:") || specifier.startsWith("//")) {
    return;
  }
  const file = path.isAbsolute(specifier) ? specifier : path.resolve(backendRoot, specifier);
  mkdirSync(path.dirname(file), { recursive: true });
}

if (import.meta.main) {
  await prepareDevDatabase();
  console.log(
    `Prepared local database with ${SOCIETY_DEV_KVS.length} website KVS keys.`,
  );
}
