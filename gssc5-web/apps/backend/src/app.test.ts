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

test("GET / returns health/version/capabilities JSON", async () => {
  const response = await backend(new Request("http://127.0.0.1/"));
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    status: string;
    name: string;
    version: string;
    api: { auth: string; softDelete: { users: string; files: string } };
    capabilities: { listFilters: boolean; openapi: string; collections: string[] };
  };
  expect(body).toMatchObject({
    status: "ok",
    name: "GSSC5 Backend",
    version: "5.0.0",
    api: {
      auth: "cookie",
      softDelete: {
        users: "DELETE /users/{cuid}",
        files: "DELETE /files/{cuid}",
      },
    },
    capabilities: {
      listFilters: true,
      openapi: "/openapi",
    },
  });
  expect(body.capabilities.collections).toContain("users");
  expect(body.capabilities.collections).toContain("newsletters");
});
