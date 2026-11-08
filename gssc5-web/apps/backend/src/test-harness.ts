// Shared helpers for backend tests. Expected outcomes stay in the test files.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Database } from "bun:sqlite";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));

const CONFIGURED_KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_ENABLED",
  "LOGIN_TOKEN_LIFETIME_DAYS",
] as const;

const NOT_A_TOKEN = new Set(["ok", "valid", "invalid", "forbidden"]);

export const DAY_MS = 24 * 60 * 60 * 1000;

export const memberUsername = "gssc-member";
export const memberPassword = "member-secret";
export const memberEmail = "member@example.com";

export type BackendFetch = (request: Request) => Promise<Response> | Response;

export type ColumnInfo = {
  name: string;
  notnull: boolean;
  pk: boolean;
};

export type Sql = {
  query(sql: string): Promise<Array<Record<string, unknown>>>;
  execute(sql: string): Promise<void>;
};

export type RunningBackend = {
  fetch: BackendFetch;
  databaseFile: string;
  stop: () => Promise<void>;
};

export type InProcessApp = {
  backend: BackendFetch;
  sql: Sql;
  table: string;
  columns: ColumnInfo[];
  startupRows: Array<Record<string, unknown>>;
};

const originalEnv = new Map<string, string | undefined>();

export function setEnv(key: string, value: string | undefined): void {
  if (!originalEnv.has(key)) originalEnv.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv(): void {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  originalEnv.clear();
}

let inProcess: Promise<InProcessApp> | undefined;

// One database for the process. getPrisma keeps the first client it creates.
export function bootInProcess(): Promise<InProcessApp> {
  inProcess ??= startInProcess();
  return inProcess;
}

async function startInProcess(): Promise<InProcessApp> {
  const tempDir = mkdtempSync(path.join(tmpdir(), "gssc-test-"));
  const databaseFile = path.join(tempDir, "test.db");
  const databaseUrl = `file:${databaseFile}`;
  process.once("exit", () => {
    restoreEnv();
    rmSync(tempDir, { recursive: true, force: true });
  });

  setEnv("DATABASE_URL", databaseUrl);
  setEnv("ADMIN_ENABLED", "true");
  setEnv("ADMIN_USERNAME", memberUsername);
  setEnv("ADMIN_PASSWORD", memberPassword);
  setEnv("ADMIN_EMAIL", memberEmail);
  setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);

  migrate(databaseUrl);
  const [{ app }, { getPrisma }] = await Promise.all([import("./app"), import("./db")]);
  await Promise.all((app.event.start ?? []).map((hook) => hook.fn(app)));
  const prisma = getPrisma(databaseUrl);
  const sql = prismaSql(prisma);
  const table = await usersTable(sql);
  if (!table) throw new Error("users table was not created");
  const columns = await tableColumns(sql, table);
  const startupRows = await selectAll(sql, table);
  return {
    backend: (request) => app.fetch(request),
    sql,
    table,
    columns,
    startupRows,
  };
}

export function prismaSql(prisma: {
  $queryRawUnsafe<T>(sql: string): Promise<T>;
  $executeRawUnsafe(sql: string): Promise<unknown>;
}): Sql {
  return {
    async query(sqlText: string) {
      return (await prisma.$queryRawUnsafe(sqlText)) as Array<Record<string, unknown>>;
    },
    async execute(sqlText: string) {
      await prisma.$executeRawUnsafe(sqlText);
    },
  };
}

export function quote(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`unexpected SQL identifier ${identifier}`);
  }
  return `"${identifier}"`;
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  const text = typeof value === "string" ? value : String(value);
  return `'${text.replaceAll("'", "''")}'`;
}

export function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function isUnset(value: unknown): boolean {
  const text = cellText(value);
  return text === null || text === "";
}

export function columnFor(columns: ColumnInfo[], concept: string): string | undefined {
  const target = concept.toLowerCase().replace(/[^a-z0-9]/g, "");
  return columns.find((column) => column.name.toLowerCase().replace(/[^a-z0-9]/g, "") === target)?.name;
}

function mapColumns(rows: Array<Record<string, unknown>>): ColumnInfo[] {
  return rows.map((row) => ({
    name: String(row.name),
    notnull: Number(row.notnull) !== 0,
    pk: Number(row.pk) > 0,
  }));
}

export async function usersTable(sql: Sql): Promise<string | undefined> {
  const rows = await sql.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) = 'users'",
  );
  const name = rows[0]?.name;
  return typeof name === "string" ? name : undefined;
}

export async function tableColumns(sql: Sql, table: string): Promise<ColumnInfo[]> {
  return mapColumns(await sql.query(`PRAGMA table_info(${quote(table)})`));
}

export async function selectAll(sql: Sql, table: string): Promise<Array<Record<string, unknown>>> {
  return sql.query(`SELECT * FROM ${quote(table)}`);
}

export async function countWhere(
  sql: Sql,
  table: string,
  column: string,
  value: string,
): Promise<number> {
  const rows = await sql.query(
    `SELECT COUNT(*) AS n FROM ${quote(table)} WHERE ${quote(column)} = ${sqlLiteral(value)}`,
  );
  return Number(rows[0]?.n ?? 0);
}

export async function deleteWhere(
  sql: Sql,
  table: string,
  column: string,
  value: string,
): Promise<void> {
  await sql.execute(`DELETE FROM ${quote(table)} WHERE ${quote(column)} = ${sqlLiteral(value)}`);
}

export async function insertCopy(
  sql: Sql,
  table: string,
  columns: ColumnInfo[],
  template: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Promise<void> {
  const names = columns.map((column) => column.name);
  const values = names.map((name) =>
    Object.prototype.hasOwnProperty.call(overrides, name) ? overrides[name] : template[name],
  );
  await sql.execute(
    `INSERT INTO ${quote(table)} (${names.map(quote).join(", ")}) VALUES (${values
      .map((value) => sqlLiteral(value))
      .join(", ")})`,
  );
}

export function readUsers(databaseFile: string): {
  columns: ColumnInfo[];
  rows: Array<Record<string, unknown>>;
} {
  const database = new Database(databaseFile);
  try {
    const columns = mapColumns(
      database.query('PRAGMA table_info("users")').all() as Array<Record<string, unknown>>,
    );
    const rows = database.query('SELECT * FROM "users"').all() as Array<Record<string, unknown>>;
    return { columns, rows };
  } finally {
    database.close();
  }
}

export function updateUserColumn(
  databaseFile: string,
  column: string,
  value: string | null,
  whereColumn: string,
  whereValue: string,
): void {
  const database = new Database(databaseFile);
  try {
    database.exec(
      `UPDATE ${quote("users")} SET ${quote(column)} = ${sqlLiteral(value)} WHERE ${quote(whereColumn)} = ${sqlLiteral(whereValue)}`,
    );
  } finally {
    database.close();
  }
}

export function migrate(databaseUrl: string): void {
  const result = spawnSync(
    process.execPath,
    ["x", "--bun", "prisma", "migrate", "deploy", "--config", "prisma7.config.ts"],
    {
      cwd: backendRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "database migration failed";
    throw new Error(detail.slice(-2000));
  }
}

export async function temporaryEnv(contents: string): Promise<{ file: string; remove: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(tmpdir(), "gssc-dotenv-"));
  const file = path.join(dir, ".env");
  await writeFile(file, contents);
  return {
    file,
    remove: () => rm(dir, { recursive: true, force: true }),
  };
}

export async function temporaryDatabase(): Promise<{
  databaseFile: string;
  remove: () => Promise<void>;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), "gssc-test-server-"));
  return {
    databaseFile: path.join(dir, "test.db"),
    remove: () => rm(dir, { recursive: true, force: true }),
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("no free port"));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function tail(text: string): string {
  return text.length > 2000 ? text.slice(-2000) : text;
}

async function waitUntilReady(
  child: ChildProcess,
  baseUrl: string,
  output: () => string,
): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`backend exited ${child.exitCode}\n${tail(output())}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`backend did not start\n${tail(output())}`);
}

export async function startBackend(
  databaseFile: string,
  env: Record<string, string>,
): Promise<RunningBackend> {
  const port = await freePort();
  const databaseUrl = `file:${databaseFile}`;
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    DATABASE_URL: databaseUrl,
  };
  for (const key of CONFIGURED_KEYS) delete childEnv[key];
  Object.assign(childEnv, env);

  const child = spawn(process.execPath, ["src/index.ts"], {
    cwd: backendRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer | string) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    output += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitUntilReady(child, baseUrl, () => output);
  } catch (error) {
    await stopChild(child);
    throw error;
  }

  return {
    fetch: bindFetch(baseUrl),
    databaseFile,
    stop: () => stopChild(child),
  };
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
  ]);
  if (!exited) child.kill("SIGKILL");
}

export function bindFetch(baseUrl: string): BackendFetch {
  return async (request) => {
    const url = new URL(request.url);
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    return fetch(`${baseUrl}${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body,
    });
  };
}

export type JsonResponse = {
  status: number;
  body: string;
};

/** HTTP cookie that carries the Login Token (matches GSSC5-48 name). */
export const LOGIN_TOKEN_COOKIE = "gssc_login_token";

export function cookieHeaderForToken(token: string): string {
  return `${LOGIN_TOKEN_COOKIE}=${token}`;
}

export async function postJsonResponse(
  backend: BackendFetch,
  pathname: string,
  json: unknown,
  options?: { cookie?: string },
): Promise<JsonResponse> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options?.cookie) headers.cookie = options.cookie;
  const response = await backend(
    new Request(`http://127.0.0.1${pathname}`, {
      method: "POST",
      headers,
      body: JSON.stringify(json),
    }),
  );
  return { status: response.status, body: await response.text() };
}

export async function postJson(
  backend: BackendFetch,
  pathname: string,
  json: unknown,
  options?: { cookie?: string },
): Promise<string> {
  return (await postJsonResponse(backend, pathname, json, options)).body;
}

export function classifyReport(body: string): "valid" | "invalid" | "other" {
  const trimmed = body.trim();
  if (trimmed === "valid" || trimmed === "invalid") return trimmed;
  return "other";
}

function responseStrings(body: string): string[] {
  const found: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === "string") found.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  try {
    walk(JSON.parse(body));
  } catch {
    if (body.trim()) found.push(body.trim());
  }
  return found;
}

// A body establishes a login when one of its strings challenges as the word valid.
export async function establishedToken(backend: BackendFetch, body: string): Promise<string | null> {
  const seen = new Set<string>();
  for (const candidate of responseStrings(body)) {
    if (candidate === "" || NOT_A_TOKEN.has(candidate.toLowerCase()) || seen.has(candidate)) continue;
    seen.add(candidate);
    const report = await postJson(backend, "/challenge", { token: candidate });
    if (classifyReport(report) === "valid") return candidate;
  }
  return null;
}

export async function establishedLogin(
  backend: BackendFetch,
  json: Record<string, unknown>,
): Promise<string | null> {
  return establishedToken(backend, await postJson(backend, "/login", json));
}

export async function challenge(backend: BackendFetch, token: string): Promise<string> {
  return postJson(backend, "/challenge", { token });
}

export async function logout(backend: BackendFetch, token: string): Promise<void> {
  await postJson(backend, "/logout", { token });
}
