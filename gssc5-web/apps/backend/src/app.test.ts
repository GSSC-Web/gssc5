// Login shape is fixed by the composed app. Exact-mirror normalization would drop one identifier.
import { beforeAll, expect, test } from "bun:test";

import {
  bootInProcess,
  establishedLogin,
  memberEmail,
  memberPassword,
  memberUsername,
  postJsonResponse,
  type BackendFetch,
} from "./test-harness";

let backend: BackendFetch;

beforeAll(async () => {
  backend = (await bootInProcess()).backend;
}, 120_000);

// @relation(GSSC-BLLR-1, scope=range_start, role=Test)
test("GSSC-BLLR-1 Login Identifiers", async () => {
  const byUsername = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  const byEmail = await establishedLogin(backend, {
    password: memberPassword,
    primaryEmail: memberEmail,
  });
  expect(byUsername).not.toBeNull();
  expect(byEmail).not.toBeNull();
});
// @relation(GSSC-BLLR-1, scope=range_end, role=Test)

// @relation(GSSC-BLLR-2, scope=range_start, role=Test)
test("GSSC-BLLR-2 Both Identifiers Invalidated", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
    primaryEmail: memberEmail,
  });
  expect(response.status).toBe(422);
});
// @relation(GSSC-BLLR-2, scope=range_end, role=Test)

// @relation(GSSC-BLLR-3, scope=range_start, role=Test)
test("GSSC-BLLR-3 Neither Identifier Invalidated", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
  });
  expect(response.status).toBe(422);
});
// @relation(GSSC-BLLR-3, scope=range_end, role=Test)
