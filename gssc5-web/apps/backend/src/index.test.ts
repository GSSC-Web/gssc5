// Permanent admin behavior observed by starting the backend process.
import { expect, test } from "bun:test";

import { loadConfig } from "./config";
import {
  cellText,
  columnFor,
  establishedLogin,
  isUnset,
  readUsers,
  startBackend,
  temporaryDatabase,
  temporaryEnv,
  updateUserColumn,
  type ColumnInfo,
} from "./test-harness";

// @relation(GSSC-BLLR-23, scope=range_start, role=Test)
test(
  "GSSC-BLLR-23 Permanent Admin Account",
  async () => {
    const provided = await temporaryEnv("ADMIN_EMAIL=admin@example.com\n");
    try {
      expect(loadConfig({ envFile: provided.file, processEnv: {} }).ADMIN_EMAIL).toBe("admin@example.com");
    } finally {
      await provided.remove();
    }
    const omitted = await temporaryEnv("");
    try {
      expect(loadConfig({ envFile: omitted.file, processEnv: {} }).ADMIN_EMAIL).toBe("");
    } finally {
      await omitted.remove();
    }

    const empty = await temporaryDatabase();
    try {
      const server = await startBackend(empty.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: "plain-admin",
        ADMIN_PASSWORD: "plain-secret",
        ADMIN_EMAIL: "",
      });
      try {
        expect(
          await establishedLogin(server.fetch, { password: "plain-secret", username: "plain-admin" }),
        ).not.toBeNull();
        expect(
          await establishedLogin(server.fetch, { password: "not-plain-secret", username: "plain-admin" }),
        ).toBeNull();
      } finally {
        await server.stop();
      }
      const stored = readUsers(empty.databaseFile);
      const email = columnFor(stored.columns, "primaryemail");
      const username = columnFor(stored.columns, "username");
      expect(email).toBeDefined();
      expect(username).toBeDefined();
      const row = stored.rows.find((item) => cellText(item[username ?? ""]) === "plain-admin");
      expect(row).toBeDefined();
      expect(isUnset(row?.[email ?? ""])).toBe(true);
    } finally {
      await empty.remove();
    }

    const replaced = await temporaryDatabase();
    const username = "kept-admin";
    const firstPassword = "first-secret";
    const secondPassword = "second-secret";
    const primary = "kept@example.com";
    const secondary = "kept-second@example.com";
    try {
      const created = await startBackend(replaced.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: firstPassword,
        ADMIN_EMAIL: primary,
      });
      try {
        expect(
          await establishedLogin(created.fetch, { password: firstPassword, username }),
        ).not.toBeNull();
      } finally {
        await created.stop();
      }

      const createdRows = readUsers(replaced.databaseFile);
      const secondaryColumn = columnFor(createdRows.columns, "secondaryemail");
      const usernameColumnName = columnFor(createdRows.columns, "username");
      expect(secondaryColumn).toBeDefined();
      expect(usernameColumnName).toBeDefined();
      updateUserColumn(replaced.databaseFile, secondaryColumn ?? "", secondary, usernameColumnName ?? "", username);

      const restarted = await startBackend(replaced.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: secondPassword,
        ADMIN_EMAIL: "other@example.com",
      });
      try {
        expect(await establishedLogin(restarted.fetch, { password: firstPassword, username })).toBeNull();
        expect(
          await establishedLogin(restarted.fetch, { password: secondPassword, username }),
        ).not.toBeNull();
      } finally {
        await restarted.stop();
      }

      const after = readUsers(replaced.databaseFile);
      const emailColumn = columnFor(after.columns, "primaryemail");
      const hashColumn = columnFor(after.columns, "passwordhash");
      expect(emailColumn).toBeDefined();
      expect(hashColumn).toBeDefined();
      const row = after.rows.find((item) => cellText(item[usernameColumnName ?? ""]) === username);
      expect(row).toBeDefined();
      expect(cellText(row?.[emailColumn ?? ""])).toBe(primary);
      expect(cellText(row?.[secondaryColumn ?? ""])).toBe(secondary);
      expect(cellText(row?.[hashColumn ?? ""])).not.toBe(secondPassword);
    } finally {
      await replaced.remove();
    }
  },
  { timeout: 240_000 },
);
// @relation(GSSC-BLLR-23, scope=range_end, role=Test)

// @relation(GSSC-BLLR-24, scope=range_start, role=Test)
test(
  "GSSC-BLLR-24 Admin Account Disabled",
  async () => {
    const fresh = await temporaryDatabase();
    try {
      const server = await startBackend(fresh.databaseFile, {
        ADMIN_ENABLED: "false",
        ADMIN_USERNAME: "would-be-admin",
        ADMIN_PASSWORD: "would-be-secret",
        ADMIN_EMAIL: "would-be@example.com",
      });
      await server.stop();
      expect(readUsers(fresh.databaseFile).rows).toHaveLength(0);
    } finally {
      await fresh.remove();
    }

    const existing = await temporaryDatabase();
    const username = "existing-admin";
    const password = "existing-secret";
    const email = "existing@example.com";
    try {
      const created = await startBackend(existing.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: password,
        ADMIN_EMAIL: email,
      });
      await created.stop();
      const before = readUsers(existing.databaseFile);
      const usernameColumnName = columnFor(before.columns, "username");
      expect(usernameColumnName).toBeDefined();
      const beforeRow = before.rows.find((row) => cellText(row[usernameColumnName ?? ""]) === username);
      expect(beforeRow).toBeDefined();

      const disabled = await startBackend(existing.databaseFile, {
        ADMIN_ENABLED: "false",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: "replacement-secret",
        ADMIN_EMAIL: "replacement@example.com",
      });
      await disabled.stop();

      const after = readUsers(existing.databaseFile);
      const afterRow = after.rows.find((row) => cellText(row[usernameColumnName ?? ""]) === username);
      expect(afterRow).toBeDefined();
      expect(storedUser(afterRow ?? {}, before.columns)).toEqual(storedUser(beforeRow ?? {}, before.columns));
    } finally {
      await existing.remove();
    }
  },
  { timeout: 240_000 },
);
// @relation(GSSC-BLLR-24, scope=range_end, role=Test)

// @relation(GSSC-BLLR-39, scope=range_start, role=Test)
test(
  "GSSC-BLLR-39 Permanent Admin Field Exceptions",
  async () => {
    const database = await temporaryDatabase();
    try {
      const server = await startBackend(database.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: "omit-admin",
        ADMIN_PASSWORD: "omit-secret",
        ADMIN_EMAIL: "",
        FIRST_NAME: "FromEnv",
        LAST_NAME: "FromEnv",
        PRIMARY_PHONE: "FromEnv",
        PREFERRED_CONTACT_METHOD: "Email",
        HOME_LINE1: "FromEnv",
        HOME_CITY: "FromEnv",
        HOME_STATE: "FromEnv",
        HOME_ZIP: "FromEnv",
        MAILING_LINE1: "FromEnv",
        MAILING_CITY: "FromEnv",
        MAILING_STATE: "FromEnv",
        MAILING_ZIP: "FromEnv",
      });
      try {
        expect(
          await establishedLogin(server.fetch, { password: "omit-secret", username: "omit-admin" }),
        ).not.toBeNull();
      } finally {
        await server.stop();
      }
      const stored = readUsers(database.databaseFile);
      const username = columnFor(stored.columns, "username");
      expect(username).toBeDefined();
      const row = stored.rows.find((item) => cellText(item[username ?? ""]) === "omit-admin");
      expect(row).toBeDefined();
      for (const concept of [
        "firstName",
        "lastName",
        "primaryPhone",
        "preferredContactMethod",
        "homeLine1",
        "homeCity",
        "homeState",
        "homeZip",
        "mailingLine1",
        "mailingCity",
        "mailingState",
        "mailingZip",
      ]) {
        const column = columnFor(stored.columns, concept);
        expect(column, concept).toBeDefined();
        expect(isUnset(row?.[column ?? ""])).toBe(true);
        expect(cellText(row?.[column ?? ""])).not.toBe("FromEnv");
        expect(cellText(row?.[column ?? ""])).not.toBe("Email");
      }
    } finally {
      await database.remove();
    }
  },
  { timeout: 120_000 },
);
// @relation(GSSC-BLLR-39, scope=range_end, role=Test)

// @relation(GSSC-BLLR-40, scope=range_start, role=Test)
test(
  "GSSC-BLLR-40 Permanent Admin Is Admin",
  async () => {
    const database = await temporaryDatabase();
    const username = "flag-admin";
    try {
      const created = await startBackend(database.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: "first-secret",
        ADMIN_EMAIL: "flag@example.com",
      });
      await created.stop();
      const createdRows = readUsers(database.databaseFile);
      const usernameColumn = columnFor(createdRows.columns, "username");
      const adminColumn = columnFor(createdRows.columns, "isAdmin");
      const moderatorColumn = columnFor(createdRows.columns, "isUserMod");
      expect(usernameColumn).toBeDefined();
      expect(adminColumn).toBeDefined();
      expect(moderatorColumn).toBeDefined();
      const createdRow = createdRows.rows.find((row) => cellText(row[usernameColumn ?? ""]) === username);
      expect(createdRow).toBeDefined();
      expect(flagIsTrue(createdRow?.[adminColumn ?? ""])).toBe(true);
      expect(flagIsTrue(createdRow?.[moderatorColumn ?? ""])).toBe(false);

      updateUserColumn(database.databaseFile, moderatorColumn ?? "", "1", usernameColumn ?? "", username);
      const restarted = await startBackend(database.databaseFile, {
        ADMIN_ENABLED: "true",
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD: "second-secret",
        ADMIN_EMAIL: "other@example.com",
      });
      try {
        expect(await establishedLogin(restarted.fetch, { password: "first-secret", username })).toBeNull();
        expect(await establishedLogin(restarted.fetch, { password: "second-secret", username })).not.toBeNull();
      } finally {
        await restarted.stop();
      }
      const after = readUsers(database.databaseFile);
      const afterRow = after.rows.find((row) => cellText(row[usernameColumn ?? ""]) === username);
      expect(afterRow).toBeDefined();
      expect(flagIsTrue(afterRow?.[adminColumn ?? ""])).toBe(true);
      expect(flagIsTrue(afterRow?.[moderatorColumn ?? ""])).toBe(true);
    } finally {
      await database.remove();
    }
  },
  { timeout: 180_000 },
);
// @relation(GSSC-BLLR-40, scope=range_end, role=Test)

function flagIsTrue(value: unknown): boolean {
  const text = cellText(value);
  return text === "1" || text?.toLowerCase() === "true";
}

function storedUser(
  row: Record<string, unknown>,
  userColumns: ColumnInfo[],
): Record<string, string | null> {
  const stored: Record<string, string | null> = {};
  for (const column of userColumns) {
    const normalized = column.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === "createdat" || normalized === "updatedat") continue;
    stored[column.name] = cellText(row[column.name]);
  }
  return stored;
}
