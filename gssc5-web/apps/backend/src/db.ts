import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { PrismaClient } from "./generated/prisma/client";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));

export function resolveDatabaseUrl(databaseUrl: string): string {
  const file = sqliteFile(databaseUrl);
  return file ? `file:${file}` : databaseUrl;
}

export function createPrisma(databaseUrl: string): PrismaClient {
  const url = resolveDatabaseUrl(databaseUrl);
  const file = sqliteFile(url);
  if (file) mkdirSync(path.dirname(file), { recursive: true });
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

let singleton: PrismaClient | undefined;

export function getPrisma(databaseUrl: string): PrismaClient {
  singleton ??= createPrisma(databaseUrl);
  return singleton;
}

export function parse<T extends TSchema>(schema: T, value: unknown): Static<T> {
  return Value.Parse(schema, value);
}

function sqliteFile(databaseUrl: string): string | undefined {
  if (!databaseUrl.startsWith("file:")) return undefined;
  const specifier = databaseUrl.slice("file:".length);
  if (
    specifier === ":memory:" ||
    specifier.startsWith(":memory:") ||
    specifier.startsWith("//")
  ) {
    return undefined;
  }
  return path.isAbsolute(specifier) ? specifier : path.resolve(backendRoot, specifier);
}
