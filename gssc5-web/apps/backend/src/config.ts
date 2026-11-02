import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const CONFIG_KEYS = [
  "PORT",
  "NODE_ENV",
  "DATABASE_URL",
  "LOGIN_TOKEN_LIFETIME_DAYS",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_ENABLED",
] as const;

export const ConfigSchema = Type.Object({
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  NODE_ENV: Type.Union(
    [Type.Literal("development"), Type.Literal("test"), Type.Literal("production")],
    { default: "development" },
  ),
  DATABASE_URL: Type.String({ minLength: 1, default: "file:./data/dev.db" }),
  // @relation(GSSC-BLLR-11, scope=range_start, role=Implementation)
  LOGIN_TOKEN_LIFETIME_DAYS: Type.Number({ exclusiveMinimum: 0, default: 7 }),
  // @relation(GSSC-BLLR-11, scope=range_end, role=Implementation)
  // @relation(GSSC-BLLR-20, scope=range_start, role=Implementation)
  ADMIN_USERNAME: Type.String({ minLength: 1, default: "admin" }),
  // @relation(GSSC-BLLR-20, scope=range_end, role=Implementation)
  // @relation(GSSC-BLLR-21, scope=range_start, role=Implementation)
  ADMIN_PASSWORD: Type.String({ minLength: 1, default: "1234" }),
  // @relation(GSSC-BLLR-21, scope=range_end, role=Implementation)
  // @relation(GSSC-BLLR-15, GSSC-BLLR-23, scope=range_start, role=Implementation)
  ADMIN_EMAIL: Type.String({ default: "" }),
  // @relation(GSSC-BLLR-15, GSSC-BLLR-23, scope=range_end, role=Implementation)
  // @relation(GSSC-BLLR-22, scope=range_start, role=Implementation)
  ADMIN_ENABLED: Type.Boolean({ default: false }),
  // @relation(GSSC-BLLR-22, scope=range_end, role=Implementation)
});

export type Config = Static<typeof ConfigSchema>;

export class ConfigError extends Error {
  constructor(details: string[]) {
    super(details.join("\n"));
    this.name = "ConfigError";
  }
}

export type LoadConfigOptions = {
  envFile?: string;
  processEnv?: NodeJS.ProcessEnv;
};

const defaultEnvFile = fileURLToPath(new URL("../.env", import.meta.url));

export function loadConfig(options: LoadConfigOptions = {}): Config {
  const processEnv = options.processEnv ?? process.env;
  const envFile = options.envFile ?? defaultEnvFile;
  const fileEnv = readEnvFile(envFile);
  const input: Record<string, string> = {};

  for (const key of CONFIG_KEYS) {
    const fromShell = Object.prototype.hasOwnProperty.call(processEnv, key)
      ? processEnv[key]
      : undefined;
    if (fromShell !== undefined) {
      input[key] = normalizeConfigValue(key, fromShell);
      continue;
    }
    const fromFile = fileEnv[key];
    if (fromFile !== undefined && fromFile !== "") {
      input[key] = normalizeConfigValue(key, fromFile);
    }
  }

  const converted = Value.Convert(ConfigSchema, input);
  const config = Value.Default(ConfigSchema, converted);
  if (!Value.Check(ConfigSchema, config)) {
    const details = [...Value.Errors(ConfigSchema, config)].map((error) => {
      const field = error.path.startsWith("/") ? error.path.slice(1) : error.path;
      return `${field}: ${error.message}`;
    });
    throw new ConfigError(details);
  }
  return config;
}

function normalizeConfigValue(key: string, value: string): string {
  if (key === "ADMIN_ENABLED") return value.trim().toLowerCase();
  if (key === "ADMIN_USERNAME" || key === "ADMIN_EMAIL") return value.trim();
  return value;
}

function readEnvFile(envFile: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(envFile, "utf8");
  } catch (error) {
    if (isNotFound(error)) return {};
    throw error;
  }
  return parseEnv(text);
}

function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const body = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const separator = body.indexOf("=");
    if (separator === -1) {
      throw new ConfigError([`line ${index + 1}: expected KEY=value`]);
    }
    const key = body.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new ConfigError([`line ${index + 1}: invalid name ${key}`]);
    }
    values[key] = unquote(body.slice(separator + 1).trim());
  }
  return values;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
