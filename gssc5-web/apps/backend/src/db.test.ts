import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Database } from "bun:sqlite";

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

function columnNamed(aliases: string[], label: string): string {
  const wanted = new Set(aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const found = started.columns.filter((column) =>
    wanted.has(column.name.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  expect(found, label).toHaveLength(1);
  return found[0]?.name ?? "";
}

function flagIsFalse(value: unknown): boolean {
  const text = cellText(value);
  return text === null || text === "0" || text?.toLowerCase() === "false";
}

let historicalFlags: Promise<{ isAdmin: unknown; isUserMod: unknown }> | undefined;

function flagsAfterColumnAdded(): Promise<{ isAdmin: unknown; isUserMod: unknown }> {
  historicalFlags ??= readHistoricalFlags();
  return historicalFlags;
}

async function readHistoricalFlags(): Promise<{ isAdmin: unknown; isUserMod: unknown }> {
  const migrations = fileURLToPath(new URL("../prisma/migrations", import.meta.url));
  const dir = await mkdtemp(path.join(tmpdir(), "gssc-history-"));
  const database = new Database(path.join(dir, "history.db"));
  try {
    database.exec(readFileSync(path.join(migrations, "20261101120000_user_access/migration.sql"), "utf8"));
    database.exec(
      "INSERT INTO users (id, username, primaryEmail, passwordHash, updatedAt) VALUES ('hist-user', 'hist-user', 'hist@example.com', 'hash', '2026-01-01T00:00:00.000Z')",
    );
    database.exec(readFileSync(path.join(migrations, "20261102140000_account_data/migration.sql"), "utf8"));
    const row = database
      .query("SELECT isAdmin, isUserMod FROM users WHERE username = 'hist-user'")
      .get() as { isAdmin: unknown; isUserMod: unknown };
    return { isAdmin: row.isAdmin, isUserMod: row.isUserMod };
  } finally {
    database.close();
    await rm(dir, { recursive: true, force: true });
  }
}

// @relation(GSSC-BLLR-26, scope=range_start, role=Test)
test("GSSC-BLLR-26 User First Name", async () => {
  const column = columnNamed(["firstName", "first"], "First Name");
  const present = `gssc-bllr-26-${randomUUID()}`;
  const omitted = `gssc-bllr-26-omit-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(present, `${present}@example.com`, null),
      [column]: "Ada",
    });
    expect(cellText((await selectWhere(present))?.[column])).toBe("Ada");
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(omitted, `${omitted}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(omitted))?.[column])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), present);
    await deleteWhere(started.sql, started.table, usernameColumn(), omitted);
  }
});
// @relation(GSSC-BLLR-26, scope=range_end, role=Test)

// @relation(GSSC-BLLR-27, scope=range_start, role=Test)
test("GSSC-BLLR-27 User Middle Name", async () => {
  const column = columnNamed(["middleName", "middle"], "Middle Name");
  const absentUser = `gssc-bllr-27-absent-${randomUUID()}`;
  const presentUser = `gssc-bllr-27-present-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(absentUser, `${absentUser}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(absentUser))?.[column])).toBe(true);
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(presentUser, `${presentUser}@example.com`, null),
      [column]: "Lee",
    });
    expect(cellText((await selectWhere(presentUser))?.[column])).toBe("Lee");
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), absentUser);
    await deleteWhere(started.sql, started.table, usernameColumn(), presentUser);
  }
});
// @relation(GSSC-BLLR-27, scope=range_end, role=Test)

// @relation(GSSC-BLLR-28, scope=range_start, role=Test)
test("GSSC-BLLR-28 User Last Name", async () => {
  const column = columnNamed(["lastName", "last"], "Last Name");
  const present = `gssc-bllr-28-${randomUUID()}`;
  const omitted = `gssc-bllr-28-omit-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(present, `${present}@example.com`, null),
      [column]: "Lovelace",
    });
    expect(cellText((await selectWhere(present))?.[column])).toBe("Lovelace");
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(omitted, `${omitted}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(omitted))?.[column])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), present);
    await deleteWhere(started.sql, started.table, usernameColumn(), omitted);
  }
});
// @relation(GSSC-BLLR-28, scope=range_end, role=Test)

// @relation(GSSC-BLLR-29, scope=range_start, role=Test)
test("GSSC-BLLR-29 User Primary Phone Number", async () => {
  const column = columnNamed(["primaryPhone", "primaryPhoneNumber"], "Primary Phone Number");
  const present = `gssc-bllr-29-${randomUUID()}`;
  const omitted = `gssc-bllr-29-omit-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(present, `${present}@example.com`, null),
      [column]: "2095550100",
    });
    expect(cellText((await selectWhere(present))?.[column])).toBe("2095550100");
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(omitted, `${omitted}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(omitted))?.[column])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), present);
    await deleteWhere(started.sql, started.table, usernameColumn(), omitted);
  }
});
// @relation(GSSC-BLLR-29, scope=range_end, role=Test)

// @relation(GSSC-BLLR-30, scope=range_start, role=Test)
test("GSSC-BLLR-30 User Secondary Phone Number", async () => {
  const column = columnNamed(["secondaryPhone", "secondaryPhoneNumber"], "Secondary Phone Number");
  const absentUser = `gssc-bllr-30-absent-${randomUUID()}`;
  const presentUser = `gssc-bllr-30-present-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(absentUser, `${absentUser}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(absentUser))?.[column])).toBe(true);
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(presentUser, `${presentUser}@example.com`, null),
      [column]: "2095550102",
    });
    expect(cellText((await selectWhere(presentUser))?.[column])).toBe("2095550102");
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), absentUser);
    await deleteWhere(started.sql, started.table, usernameColumn(), presentUser);
  }
});
// @relation(GSSC-BLLR-30, scope=range_end, role=Test)

// @relation(GSSC-BLLR-34, scope=range_start, role=Test)
test("GSSC-BLLR-34 User Home Address", async () => {
  const line1 = columnNamed(["homeLine1", "homeAddressLine1"], "Home Address line 1");
  const line2 = columnNamed(["homeLine2", "homeAddressLine2"], "Home Address line 2");
  const line3 = columnNamed(["homeLine3", "homeAddressLine3"], "Home Address line 3");
  const city = columnNamed(["homeCity", "homeAddressCity"], "Home Address city");
  const state = columnNamed(["homeState", "homeAddressState"], "Home Address state");
  const zip = columnNamed(["homeZip", "homeZipCode", "homeAddressZip"], "Home Address zip code");
  const extension = columnNamed(["homeZipExtension", "homeAddressZipExtension"], "Home Address zip extension");
  const present = `gssc-bllr-34-${randomUUID()}`;
  const omitted = `gssc-bllr-34-omit-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(present, `${present}@example.com`, null),
      [line1]: "1 Home Street",
      [line2]: null,
      [line3]: null,
      [city]: "Modesto",
      [state]: "CA",
      [zip]: "95354",
      [extension]: "1234",
    });
    const row = await selectWhere(present);
    expect(cellText(row?.[line1])).toBe("1 Home Street");
    expect(isUnset(row?.[line2])).toBe(true);
    expect(isUnset(row?.[line3])).toBe(true);
    expect(cellText(row?.[city])).toBe("Modesto");
    expect(cellText(row?.[state])).toBe("CA");
    expect(cellText(row?.[zip])).toBe("95354");
    expect(cellText(row?.[extension])).toBe("1234");
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(omitted, `${omitted}@example.com`, null),
      [line1]: null,
      [city]: null,
      [state]: null,
      [zip]: null,
      [extension]: null,
    });
    const empty = await selectWhere(omitted);
    expect(isUnset(empty?.[line1])).toBe(true);
    expect(isUnset(empty?.[zip])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), present);
    await deleteWhere(started.sql, started.table, usernameColumn(), omitted);
  }
});
// @relation(GSSC-BLLR-34, scope=range_end, role=Test)

// @relation(GSSC-BLLR-36, scope=range_start, role=Test)
test("GSSC-BLLR-36 User Mailing Address", async () => {
  const line1 = columnNamed(["mailingLine1", "mailingAddressLine1"], "Mailing Address line 1");
  const line2 = columnNamed(["mailingLine2", "mailingAddressLine2"], "Mailing Address line 2");
  const line3 = columnNamed(["mailingLine3", "mailingAddressLine3"], "Mailing Address line 3");
  const city = columnNamed(["mailingCity", "mailingAddressCity"], "Mailing Address city");
  const state = columnNamed(["mailingState", "mailingAddressState"], "Mailing Address state");
  const zip = columnNamed(["mailingZip", "mailingZipCode", "mailingAddressZip"], "Mailing Address zip code");
  const extension = columnNamed(
    ["mailingZipExtension", "mailingAddressZipExtension"],
    "Mailing Address zip extension",
  );
  const display = started.columns.filter((column) =>
    ["mailingaddressdisplay", "mailingdisplay", "maildisplay"].includes(
      column.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    ),
  );
  expect(display).toHaveLength(0);
  const present = `gssc-bllr-36-${randomUUID()}`;
  const omitted = `gssc-bllr-36-omit-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(present, `${present}@example.com`, null),
      [line1]: "PO Box 1",
      [line2]: null,
      [line3]: null,
      [city]: "Modesto",
      [state]: "CA",
      [zip]: "95353",
      [extension]: null,
    });
    const row = await selectWhere(present);
    expect(cellText(row?.[line1])).toBe("PO Box 1");
    expect(isUnset(row?.[line2])).toBe(true);
    expect(cellText(row?.[zip])).toBe("95353");
    expect(isUnset(row?.[extension])).toBe(true);
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(omitted, `${omitted}@example.com`, null),
      [line1]: null,
      [city]: null,
      [state]: null,
      [zip]: null,
    });
    expect(isUnset((await selectWhere(omitted))?.[line1])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), present);
    await deleteWhere(started.sql, started.table, usernameColumn(), omitted);
  }
});
// @relation(GSSC-BLLR-36, scope=range_end, role=Test)

// @relation(GSSC-BLLR-37, scope=range_start, role=Test)
test("GSSC-BLLR-37 User Is Admin", async () => {
  const column = columnNamed(["isAdmin"], "isAdmin");
  const flags = await flagsAfterColumnAdded();
  expect(flagIsFalse(flags.isAdmin)).toBe(true);
  const enabled = `gssc-bllr-37-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(enabled, `${enabled}@example.com`, null),
      [column]: 1,
    });
    const text = cellText((await selectWhere(enabled))?.[column]);
    expect(text === "1" || text?.toLowerCase() === "true").toBe(true);
    const admin = started.startupRows.find((row) => cellText(row[usernameColumn()]) === memberUsername);
    const adminFlag = cellText(admin?.[column]);
    expect(adminFlag === "1" || adminFlag?.toLowerCase() === "true").toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), enabled);
  }
});
// @relation(GSSC-BLLR-37, scope=range_end, role=Test)

// @relation(GSSC-BLLR-38, scope=range_start, role=Test)
test("GSSC-BLLR-38 User Is User Mod", async () => {
  const column = columnNamed(["isUserMod"], "isUserMod");
  const flags = await flagsAfterColumnAdded();
  expect(flagIsFalse(flags.isUserMod)).toBe(true);
  const enabled = `gssc-bllr-38-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(enabled, `${enabled}@example.com`, null),
      [column]: 0,
    });
    expect(flagIsFalse((await selectWhere(enabled))?.[column])).toBe(true);
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), enabled);
  }
});
// @relation(GSSC-BLLR-38, scope=range_end, role=Test)

// @relation(GSSC-BLLR-64, scope=range_start, role=Test)
test("GSSC-BLLR-64 User Membership Status", async () => {
  const column = columnNamed(["membershipStatus"], "Membership Status");
  const absentUser = `gssc-bllr-64-absent-${randomUUID()}`;
  const presentUser = `gssc-bllr-64-present-${randomUUID()}`;
  try {
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(absentUser, `${absentUser}@example.com`, null),
      [column]: null,
    });
    expect(isUnset((await selectWhere(absentUser))?.[column])).toBe(true);
    await insertCopy(started.sql, started.table, started.columns, started.startupRows[0] ?? {}, {
      ...freshIdentity(presentUser, `${presentUser}@example.com`, null),
      [column]: "roster-example",
    });
    expect(cellText((await selectWhere(presentUser))?.[column])).toBe("roster-example");
  } finally {
    await deleteWhere(started.sql, started.table, usernameColumn(), absentUser);
    await deleteWhere(started.sql, started.table, usernameColumn(), presentUser);
  }
});
// @relation(GSSC-BLLR-64, scope=range_end, role=Test)
