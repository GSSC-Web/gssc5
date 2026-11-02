import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app } from "./app";
import { loadConfig } from "./config";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const config = loadConfig();

deployMigrations(config.DATABASE_URL);

// Elysia opens the socket before onStart and does not await those hooks.
await Promise.all((app.event.start ?? []).map((hook) => hook.fn(app)));

app.listen(config.PORT);

function deployMigrations(databaseUrl: string): void {
  if (!existsSync(path.join(backendRoot, "prisma/schema.prisma"))) return;
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

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
