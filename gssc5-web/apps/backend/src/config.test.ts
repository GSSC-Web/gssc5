import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "bun:test";

import { ConfigError, loadConfig } from "./config";
import { temporaryEnv } from "./test-harness";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeEnv(contents: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gssc-env-"));
  temps.push(dir);
  const file = path.join(dir, ".env");
  writeFileSync(file, contents);
  return file;
}

const missingEnvFile = path.join(tmpdir(), "gssc-missing-env", ".env");

test("defaults fill a missing or blank configuration", () => {
  const envFile = writeEnv(`
# comment
export PORT=
NODE_ENV=""
DATABASE_URL=''
`);
  expect(loadConfig({ envFile, processEnv: {} })).toEqual({
    PORT: 3000,
    NODE_ENV: "development",
    DATABASE_URL: "file:./data/dev.db",
    LOGIN_TOKEN_LIFETIME_DAYS: 7,
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "1234",
    ADMIN_EMAIL: "",
    ADMIN_ENABLED: false,
    PASSWORD_HISTORY_COUNT: 3,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_RECOVERY_LIFETIME_DAYS: 1,
    SMTP_HOST: "",
    SMTP_PORT: 587,
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "",
  });
  expect(loadConfig({ envFile: missingEnvFile, processEnv: {} })).toEqual({
    PORT: 3000,
    NODE_ENV: "development",
    DATABASE_URL: "file:./data/dev.db",
    LOGIN_TOKEN_LIFETIME_DAYS: 7,
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "1234",
    ADMIN_EMAIL: "",
    ADMIN_ENABLED: false,
    PASSWORD_HISTORY_COUNT: 3,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_RECOVERY_LIFETIME_DAYS: 1,
    SMTP_HOST: "",
    SMTP_PORT: 587,
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "",
  });
});

test("a shell value overrides the env file", () => {
  const envFile = writeEnv("PORT=1234\nDATABASE_URL=file:./data/from-file.db\n");
  const config = loadConfig({
    envFile,
    processEnv: { PORT: "4000" },
  });
  expect(config.PORT).toBe(4000);
  expect(config.DATABASE_URL).toBe("file:./data/from-file.db");
});

test("admin email defaults to empty and keeps a non-email value", () => {
  const blank = loadConfig({
    envFile: missingEnvFile,
    processEnv: { ADMIN_EMAIL: "   " },
  });
  expect(blank.ADMIN_EMAIL).toBe("");
  const provided = loadConfig({
    envFile: missingEnvFile,
    processEnv: { ADMIN_EMAIL: " not-an-email " },
  });
  expect(provided.ADMIN_EMAIL).toBe("not-an-email");
});

test("an empty admin username is rejected", () => {
  expect(() =>
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { ADMIN_USERNAME: "   " },
    }),
  ).toThrow(ConfigError);
});

// @relation(GSSC-BLLR-11, scope=range_start, role=Test)
test("GSSC-BLLR-11 Login Token Lifetime configuration", () => {
  expect(
    loadConfig({ envFile: missingEnvFile, processEnv: {} }).LOGIN_TOKEN_LIFETIME_DAYS,
  ).toBe(7);
  expect(
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { LOGIN_TOKEN_LIFETIME_DAYS: "1" },
    }).LOGIN_TOKEN_LIFETIME_DAYS,
  ).toBe(1);
  expect(() =>
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { LOGIN_TOKEN_LIFETIME_DAYS: "0" },
    }),
  ).toThrow(ConfigError);
  expect(() =>
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { LOGIN_TOKEN_LIFETIME_DAYS: "-3" },
    }),
  ).toThrow(ConfigError);
});
// @relation(GSSC-BLLR-11, scope=range_end, role=Test)

test("a non-numeric PORT names that field", () => {
  expect(() =>
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { PORT: "nope" },
    }),
  ).toThrow(ConfigError);
  try {
    loadConfig({
      envFile: missingEnvFile,
      processEnv: { PORT: "nope" },
    });
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toContain("PORT");
  }
});

// @relation(GSSC-BLLR-20, scope=range_start, role=Test)
test("GSSC-BLLR-20 Admin Username", async () => {
  const configured = await temporaryEnv("ADMIN_USERNAME=file-admin\n");
  try {
    expect(loadConfig({ envFile: configured.file, processEnv: {} }).ADMIN_USERNAME).toBe("file-admin");
  } finally {
    await configured.remove();
  }

  const omitted = await temporaryEnv("");
  try {
    expect(loadConfig({ envFile: omitted.file, processEnv: {} }).ADMIN_USERNAME).toBe("admin");
  } finally {
    await omitted.remove();
  }
});
// @relation(GSSC-BLLR-20, scope=range_end, role=Test)

// @relation(GSSC-BLLR-21, scope=range_start, role=Test)
test("GSSC-BLLR-21 Admin Password", async () => {
  const configured = await temporaryEnv("ADMIN_PASSWORD=file-secret\n");
  try {
    expect(loadConfig({ envFile: configured.file, processEnv: {} }).ADMIN_PASSWORD).toBe("file-secret");
  } finally {
    await configured.remove();
  }

  const omitted = await temporaryEnv("");
  try {
    expect(loadConfig({ envFile: omitted.file, processEnv: {} }).ADMIN_PASSWORD).toBe("1234");
  } finally {
    await omitted.remove();
  }
});
// @relation(GSSC-BLLR-21, scope=range_end, role=Test)

// @relation(GSSC-BLLR-22, scope=range_start, role=Test)
test("GSSC-BLLR-22 Admin Account Enabled", async () => {
  const enabled = await temporaryEnv("ADMIN_ENABLED=true\n");
  try {
    expect(loadConfig({ envFile: enabled.file, processEnv: {} }).ADMIN_ENABLED).toBe(true);
  } finally {
    await enabled.remove();
  }

  const disabled = await temporaryEnv("ADMIN_ENABLED=false\n");
  try {
    expect(loadConfig({ envFile: disabled.file, processEnv: {} }).ADMIN_ENABLED).toBe(false);
  } finally {
    await disabled.remove();
  }

  const omitted = await temporaryEnv("");
  try {
    expect(loadConfig({ envFile: omitted.file, processEnv: {} }).ADMIN_ENABLED).toBe(false);
  } finally {
    await omitted.remove();
  }
});
// @relation(GSSC-BLLR-22, scope=range_end, role=Test)
