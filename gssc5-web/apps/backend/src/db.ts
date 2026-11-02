import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { loadConfig } from "./config";
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
  const base = new PrismaClient({ adapter });
  // @relation(GSSC-BLLR-15, scope=range_start, role=Implementation)
  // The users table allows a missing Primary Email only on the permanent admin account.
  const guarded = base.$extends({
    query: {
      user: {
        async create({ args, query }) {
          guardPrimaryEmail(args.data);
          return query(args);
        },
        async update({ args, query }) {
          await guardPrimaryEmailUpdate(base, args.where, args.data);
          return query(args);
        },
        async upsert({ args, query }) {
          guardPrimaryEmail(args.create);
          await guardPrimaryEmailUpdate(base, args.where, args.update);
          return query(args);
        },
      },
    },
  });
  // @relation(GSSC-BLLR-15, scope=range_end, role=Implementation)
  return guarded as unknown as PrismaClient;
}

// @relation(GSSC-BLLR-15, scope=range_start, role=Implementation)
export function storedPrimaryEmail(
  username: string,
  primaryEmail: string | null | undefined,
  adminUsername: string,
): string | null {
  if (primaryEmail === null || primaryEmail === undefined || primaryEmail === "") {
    if (username === adminUsername) return null;
    throw new Error("a user other than the permanent admin requires a primary email");
  }
  return primaryEmail;
}
// @relation(GSSC-BLLR-15, scope=range_end, role=Implementation)

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

type UserWrite = {
  username?: string;
  primaryEmail?: string | null;
};

// @relation(GSSC-BLLR-15, scope=range_start, role=Implementation)
function guardPrimaryEmail(data: UserWrite): void {
  const username = data.username ?? "";
  const email = storedPrimaryEmail(
    username,
    "primaryEmail" in data ? data.primaryEmail : null,
    loadConfig().ADMIN_USERNAME,
  );
  if (email === null) delete data.primaryEmail;
  else data.primaryEmail = email;
}

async function guardPrimaryEmailUpdate(
  base: PrismaClient,
  where: unknown,
  data: UserWrite,
): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(data, "primaryEmail")) return;
  const named = data.username ?? usernameFromWhere(where);
  const username =
    named ??
    (
      await base.user.findUnique({
        where: where as Parameters<PrismaClient["user"]["findUnique"]>[0]["where"],
      })
    )?.username ??
    "";
  data.primaryEmail = storedPrimaryEmail(username, data.primaryEmail, loadConfig().ADMIN_USERNAME);
}

function usernameFromWhere(where: unknown): string | undefined {
  if (!where || typeof where !== "object" || !("username" in where)) return undefined;
  const username = (where as { username?: unknown }).username;
  return typeof username === "string" ? username : undefined;
}
// @relation(GSSC-BLLR-15, scope=range_end, role=Implementation)
