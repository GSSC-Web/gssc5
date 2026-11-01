import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "bun:test";

import { ConfigError, loadConfig } from "./config";

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
  });
  expect(loadConfig({ envFile: missingEnvFile, processEnv: {} })).toEqual({
    PORT: 3000,
    NODE_ENV: "development",
    DATABASE_URL: "file:./data/dev.db",
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
