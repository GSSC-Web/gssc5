import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, expect, test } from "bun:test";

import { createPrisma, getPrisma } from "./db";
import {
  bootInProcess,
  cellText,
  columnFor,
  countWhere,
  deleteWhere,
  insertCopy,
  isUnset,
  memberEmail,
  memberPassword,
  memberUsername,
  selectAll,
  type InProcessApp,
} from "./test-harness";

const dir = await mkdtemp(path.join(tmpdir(), "gssc-db-"));
const prisma = createPrisma(`file:${path.join(dir, "test.db")}`);

afterAll(async () => {
  await prisma.$disconnect();
  await rm(dir, { recursive: true, force: true });
});

test("SELECT 1", async () => {
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: number | bigint }>>("SELECT 1 AS ok");
  expect(rows).toHaveLength(1);
  expect(Number(rows[0]?.ok)).toBe(1);
});

let started: InProcessApp;

beforeAll(async () => {
  started = await bootInProcess();
}, 120_000);

// @relation(GSSC-BLLR-13, scope=range_start, role=Test)
test("GSSC-BLLR-13 Users Table", async () => {
  expect(started.table.toLowerCase()).toBe("users");
  const column = usernameColumn();
  const names = started.startupRows.map((row) => cellText(row[column]));
  expect(names).toContain(memberUsername);
});
// @relation(GSSC-BLLR-13, scope=range_end, role=Test)

// @relation(GSSC-BLLR-14, scope=range_start, role=Test)
test("GSSC-BLLR-14 User Username", () => {
  const column = usernameColumn();
  expect(started.startupRows.length).toBeGreaterThan(0);
  for (const row of started.startupRows) {
    const username = cellText(row[column]);
    expect(username).not.toBeNull();
    expect(username).not.toBe("");
  }
});
// @relation(GSSC-BLLR-14, scope=range_end, role=Test)

// @relation(GSSC-BLLR-15, scope=range_start, role=Test)
test("GSSC-BLLR-15 User Primary Email", async () => {
  // The fixture user was given a Primary Email. An empty admin email is GSSC-BLLR-23.
  const column = primaryEmailColumn();
  expect(started.startupRows.length).toBeGreaterThan(0);
  for (const row of started.startupRows) {
    expect(cellText(row[column])).toBe(memberEmail);
  }

  const prisma = getPrisma(process.env.DATABASE_URL ?? "");
  const username = `gssc-bllr-15-${randomUUID()}`;
  let rejected = false;
  try {
    await prisma.user.create({ data: { username, passwordHash: `hash-${username}` } });
  } catch (error) {
    rejected = true;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("primary email");
  }
  expect(rejected).toBe(true);
});
// @relation(GSSC-BLLR-15, scope=range_end, role=Test)

// @relation(GSSC-BLLR-16, scope=range_start, role=Test)
test("GSSC-BLLR-16 User Secondary Email", async () => {
  const secondary = secondaryEmailColumn();
  const template = started.startupRows[0];
  expect(template).toBeDefined();
  const absentUser = `gssc-bllr-16-absent-${randomUUID()}`;
  const presentUser = `gssc-bllr-16-present-${randomUUID()}`;
  const storedEmail = "second@example.com";
  try {
    await insertCopy(started.sql, started.table, started.columns, template ?? {}, {
      ...freshIdentity(absentUser, `${absentUser}@example.com`, null),
    });
    const absent = await selectWhere(absentUser);
    expect(absent).toBeDefined();
    expect(isUnset(absent?.[secondary])).toBe(true);

    await insertCopy(started.sql, started.table, started.columns, template ?? {}, {
      ...freshIdentity(presentUser, `${presentUser}@example.com`, storedEmail),
    });
    const present = await selectWhere(presentUser);
    expect(cellText(present?.[secondary])).toBe(storedEmail);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), absentUser);
    await deleteWhere(started.sql, started.table, usernameColumn(), presentUser);
  }
});
// @relation(GSSC-BLLR-16, scope=range_end, role=Test)

// @relation(GSSC-BLLR-17, scope=range_start, role=Test)
test("GSSC-BLLR-17 User Password Hash", () => {
  const column = passwordHashColumn();
  expect(started.startupRows.length).toBeGreaterThan(0);
  for (const row of started.startupRows) {
    const hash = cellText(row[column]);
    expect(hash).not.toBeNull();
    expect(hash).not.toBe("");
    expect(hash).not.toBe(memberPassword);
  }
});
// @relation(GSSC-BLLR-17, scope=range_end, role=Test)

// @relation(GSSC-BLLR-18, scope=range_start, role=Test)
test("GSSC-BLLR-18 Unique Username", async () => {
  const username = usernameColumn();
  const template = started.startupRows[0];
  expect(template).toBeDefined();
  const other = `gssc-bllr-18-${randomUUID()}`;
  const before = await countWhere(started.sql, started.table, username, memberUsername);
  try {
    await insertCopy(started.sql, started.table, started.columns, template ?? {}, {
      ...freshIdentity(other, `${other}@example.com`, null),
    });
    expect(await countWhere(started.sql, started.table, username, other)).toBe(1);
  } finally {
    await deleteWhere(started.sql, started.table, username, other);
  }

  const duplicateEmail = `gssc-bllr-18-dup-${randomUUID()}@example.com`;
  await expect(
    insertCopy(started.sql, started.table, started.columns, template ?? {}, {
      ...freshIdentity(memberUsername, duplicateEmail, null),
    }),
  ).rejects.toThrow();
  expect(await countWhere(started.sql, started.table, username, memberUsername)).toBe(before);
});
// @relation(GSSC-BLLR-18, scope=range_end, role=Test)

// @relation(GSSC-BLLR-19, scope=range_start, role=Test)
test("GSSC-BLLR-19 Unique Primary Email", async () => {
  const email = primaryEmailColumn();
  const username = usernameColumn();
  const template = started.startupRows[0];
  expect(template).toBeDefined();
  const shared = `shared-${randomUUID()}@example.com`;
  const first = `gssc-bllr-19-a-${randomUUID()}`;
  const second = `gssc-bllr-19-b-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, template ?? {}, {
      ...freshIdentity(first, shared, null),
    });
    expect(await countWhere(started.sql, started.table, email, shared)).toBe(1);
    await expect(
      insertCopy(started.sql, started.table, started.columns, template ?? {}, {
        ...freshIdentity(second, shared, null),
      }),
    ).rejects.toThrow();
    expect(await countWhere(started.sql, started.table, email, shared)).toBe(1);
  } finally {
    await deleteWhere(started.sql, started.table, username, first);
    await deleteWhere(started.sql, started.table, username, second);
  }
});
// @relation(GSSC-BLLR-19, scope=range_end, role=Test)

function usernameColumn(): string {
  const column = columnFor(started.columns, "username");
  expect(column, "users table stores a Username").toBeDefined();
  return column ?? "";
}

function primaryEmailColumn(): string {
  const column = columnFor(started.columns, "primaryemail");
  expect(column, "users table stores a Primary Email").toBeDefined();
  return column ?? "";
}

function secondaryEmailColumn(): string {
  const column = columnFor(started.columns, "secondaryemail");
  expect(column, "users table stores a Secondary Email").toBeDefined();
  return column ?? "";
}

function passwordHashColumn(): string {
  const column = columnFor(started.columns, "passwordhash");
  expect(column, "users table stores a password hash").toBeDefined();
  return column ?? "";
}

function freshIdentity(
  username: string,
  primaryEmail: string | null,
  secondaryEmail: string | null,
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  for (const column of started.columns) {
    if (column.pk) overrides[column.name] = randomUUID();
  }
  const usernameName = columnFor(started.columns, "username");
  const emailName = columnFor(started.columns, "primaryemail");
  const secondaryName = columnFor(started.columns, "secondaryemail");
  const hashName = columnFor(started.columns, "passwordhash");
  if (usernameName) overrides[usernameName] = username;
  if (emailName) overrides[emailName] = primaryEmail;
  if (secondaryName) overrides[secondaryName] = secondaryEmail;
  if (hashName) overrides[hashName] = `hash-${randomUUID()}`;
  return overrides;
}

async function selectWhere(username: string): Promise<Record<string, unknown> | undefined> {
  const rows = await selectAll(started.sql, started.table);
  const column = columnFor(started.columns, "username") ?? usernameColumn();
  return rows.find((row) => cellText(row[column]) === username);
}
