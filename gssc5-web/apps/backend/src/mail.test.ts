import { expect, test } from "bun:test";

import { loadConfig } from "./config";

// @relation(GSSC-BLLR-246, scope=range_start, role=Test)
test("GSSC-BLLR-246 SMTP Configuration defaults", () => {
  const config = loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} });
  expect(config.SMTP_HOST).toBe("");
  expect(config.SMTP_PORT).toBe(587);
  expect(config.SMTP_USER).toBe("");
  expect(config.SMTP_PASSWORD).toBe("");
  expect(config.SMTP_FROM).toBe("");
});
// @relation(GSSC-BLLR-246, scope=range_end, role=Test)
