// Account service checks. Each assertion is limited to that requirement's statement.
import { randomUUID } from "node:crypto";

import { beforeAll, expect, setSystemTime, test } from "bun:test";

import {
  DAY_MS,
  bootInProcess,
  challenge,
  cookieHeaderForToken,
  establishedLogin,
  loginTokenFromSetCookie,
  loginTokenSetCookieHeader,
  logout,
  memberEmail,
  memberPassword,
  memberUsername,
  postJsonResponse,
  setEnv,
  type BackendFetch,
} from "../test-harness";

let backend: BackendFetch;

beforeAll(async () => {
  backend = (await bootInProcess()).backend;
}, 120_000);

async function expectForbidden(json: Record<string, unknown>): Promise<void> {
  const response = await postJsonResponse(backend, "/login", json);
  expect(response.status).toBe(403);
}

// @relation(GSSC-BLLR-4, scope=range_start, role=Test)
test("GSSC-BLLR-4 Unknown Username Forbidden", async () => {
  await expectForbidden({
    password: memberPassword,
    username: "no-such-member",
  });
});
// @relation(GSSC-BLLR-4, scope=range_end, role=Test)

// @relation(GSSC-BLLR-5, scope=range_start, role=Test)
test("GSSC-BLLR-5 Unknown Primary Email Forbidden", async () => {
  await expectForbidden({
    password: memberPassword,
    primaryEmail: "nobody@example.com",
  });
});
// @relation(GSSC-BLLR-5, scope=range_end, role=Test)

// @relation(GSSC-BLLR-6, scope=range_start, role=Test)
test("GSSC-BLLR-6 Password Mismatch Forbidden", async () => {
  await expectForbidden({
    password: "member-secret-wrong",
    username: memberUsername,
  });
  await expectForbidden({
    password: "member-secret-wrong",
    primaryEmail: memberEmail,
  });
});
// @relation(GSSC-BLLR-6, scope=range_end, role=Test)

// @relation(GSSC-BLLR-7, scope=range_start, role=Test)
test("GSSC-BLLR-7 Password Match", async () => {
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
// @relation(GSSC-BLLR-7, scope=range_end, role=Test)

// @relation(GSSC-BLLR-8, scope=range_start, role=Test)
test("GSSC-BLLR-8 Login Token Issued", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  expect(response.status).toBe(200);
  const token = loginTokenFromSetCookie(response.headers);
  expect(token).toEqual(expect.any(String));
  expect(token?.length).toBeGreaterThan(0);
  expect((await challenge(backend, token ?? "", { viaCookie: true })).trim()).toBe("valid");
});
// @relation(GSSC-BLLR-8, scope=range_end, role=Test)

// @relation(GSSC-BLLR-292, scope=range_start, role=Test)
test("GSSC-BLLR-292 Login Token Cookie Attributes", async () => {
  try {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", "3");
    const response = await postJsonResponse(backend, "/login", {
      password: memberPassword,
      username: memberUsername,
    });
    const header = loginTokenSetCookieHeader(response.headers);
    expect(header).toEqual(expect.any(String));
    const cookie = header ?? "";
    const lower = cookie.toLowerCase();
    expect(lower.includes("httponly")).toBe(true);
    expect(lower.includes("secure")).toBe(true);
    expect(lower.includes("samesite=lax")).toBe(true);
    expect(lower.includes("path=/")).toBe(true);
    expect(lower.includes(`max-age=${3 * 24 * 60 * 60}`)).toBe(true);
  } finally {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
  }
});
// @relation(GSSC-BLLR-292, scope=range_end, role=Test)

// @relation(GSSC-BLLR-9, scope=range_start, role=Test)
test("GSSC-BLLR-9 Login Token Challenge", async () => {
  const token = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token).toEqual(expect.any(String));
  const issued = token ?? "";
  const valid = await challenge(backend, issued, { viaCookie: true });
  expect(valid.trim()).toBe("valid");
  expect(valid.includes(issued)).toBe(false);

  const unknown = `unknown-${randomUUID()}`;
  const invalid = await challenge(backend, unknown, { viaCookie: true });
  expect(invalid.trim()).toBe("invalid");
  expect(invalid.includes(unknown)).toBe(false);
});
// @relation(GSSC-BLLR-9, scope=range_end, role=Test)

// @relation(GSSC-BLLR-10, scope=range_start, role=Test)
test("GSSC-BLLR-10 Member Logout", async () => {
  const token = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token).toEqual(expect.any(String));
  const issued = token ?? "";
  const response = await logout(backend, issued, { viaCookie: true });
  expect(response.status).toBe(204);
  const cleared = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(
    cleared.includes("max-age=0") ||
      cleared.includes(`${cookieHeaderForToken("").toLowerCase()}`) ||
      cleared.includes("expires="),
  ).toBe(true);
  expect((await challenge(backend, issued, { viaCookie: true })).trim()).toBe("invalid");
});
// @relation(GSSC-BLLR-10, scope=range_end, role=Test)

// @relation(GSSC-BLLR-11, scope=range_start, role=Test)
test("GSSC-BLLR-11 Login Token Lifetime", async () => {
  const start = new Date("2026-06-01T00:00:00.000Z");
  try {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
    setSystemTime(start);
    const defaultToken = await establishedLogin(backend, {
      password: memberPassword,
      username: memberUsername,
    });
    expect(defaultToken).toEqual(expect.any(String));
    const issued = defaultToken ?? "";
    setSystemTime(new Date(start.getTime() + 7 * DAY_MS - 1));
    expect((await challenge(backend, issued)).trim()).toBe("valid");
    setSystemTime(new Date(start.getTime() + 7 * DAY_MS));
    expect((await challenge(backend, issued)).trim()).toBe("invalid");

    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", "2");
    setSystemTime(start);
    const configuredToken = await establishedLogin(backend, {
      password: memberPassword,
      username: memberUsername,
    });
    expect(configuredToken).toEqual(expect.any(String));
    const configured = configuredToken ?? "";
    setSystemTime(new Date(start.getTime() + 2 * DAY_MS - 1));
    expect((await challenge(backend, configured)).trim()).toBe("valid");
    setSystemTime(new Date(start.getTime() + 2 * DAY_MS));
    expect((await challenge(backend, configured)).trim()).toBe("invalid");
  } finally {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
    setSystemTime();
  }
});
// @relation(GSSC-BLLR-11, scope=range_end, role=Test)

// @relation(GSSC-BLLR-12, scope=range_start, role=Test)
test("GSSC-BLLR-12 Expired Login Token", async () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  try {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
    // Move past the default lifetime before issuance so expiry is measured from the token.
    setSystemTime(new Date(start.getTime() + 10 * DAY_MS));
    const issuedAt = Date.now();
    const token = await establishedLogin(backend, {
      password: memberPassword,
      username: memberUsername,
    });
    expect(token).toEqual(expect.any(String));
    const issued = token ?? "";
    expect((await challenge(backend, issued)).trim()).toBe("valid");
    setSystemTime(new Date(issuedAt + 7 * DAY_MS));
    expect((await challenge(backend, issued)).trim()).toBe("invalid");
  } finally {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
    setSystemTime();
  }
});
// @relation(GSSC-BLLR-12, scope=range_end, role=Test)
