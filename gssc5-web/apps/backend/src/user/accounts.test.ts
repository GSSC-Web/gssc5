// Account service checks. Each assertion is limited to that requirement's statement.
import { randomBytes, randomUUID } from "node:crypto";

import { beforeAll, expect, setSystemTime, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
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
  type InProcessApp,
} from "../test-harness";
import { scrubExpiredLoginTokens } from "./accounts";
import { hashLoginToken } from "./login-session";

let app: InProcessApp;
let backend: BackendFetch;

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
}, 120_000);

function prisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function loginTokenRows() {
  return prisma().loginToken.findMany({ orderBy: { issuedAt: "desc" } });
}

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
  expect((await challenge(backend, token ?? "")).trim()).toBe("valid");
});
// @relation(GSSC-BLLR-8, scope=range_end, role=Test)

// @relation(GSSC-BLLR-309, scope=range_start, role=Test)
test("GSSC-BLLR-309 Login Token Cookie Storage", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  expect(response.status).toBe(200);
  const token = loginTokenFromSetCookie(response.headers);
  expect(token).toEqual(expect.any(String));
  expect(JSON.parse(response.body)).toEqual({ status: "ok" });
  expect(Object.prototype.hasOwnProperty.call(JSON.parse(response.body), "token")).toBe(false);
});
// @relation(GSSC-BLLR-309, scope=range_end, role=Test)

// @relation(GSSC-BLLR-292, scope=range_start, role=Test)
test("GSSC-BLLR-292 Login Token Cookie HttpOnly", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  const header = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(header.includes("httponly")).toBe(true);
});
// @relation(GSSC-BLLR-292, scope=range_end, role=Test)

// @relation(GSSC-BLLR-310, scope=range_start, role=Test)
test("GSSC-BLLR-310 Login Token Cookie Secure", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  const header = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(header.includes("secure")).toBe(true);
});
// @relation(GSSC-BLLR-310, scope=range_end, role=Test)

// @relation(GSSC-BLLR-311, scope=range_start, role=Test)
test("GSSC-BLLR-311 Login Token Cookie SameSite", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  const header = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(header.includes("samesite=lax")).toBe(true);
});
// @relation(GSSC-BLLR-311, scope=range_end, role=Test)

// @relation(GSSC-BLLR-312, scope=range_start, role=Test)
test("GSSC-BLLR-312 Login Token Cookie Path", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  const header = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(header.includes("path=/")).toBe(true);
});
// @relation(GSSC-BLLR-312, scope=range_end, role=Test)

// @relation(GSSC-BLLR-313, scope=range_start, role=Test)
test("GSSC-BLLR-313 Login Token Cookie Max-Age", async () => {
  try {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", "3");
    const response = await postJsonResponse(backend, "/login", {
      password: memberPassword,
      username: memberUsername,
    });
    const header = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
    expect(header.includes(`max-age=${3 * 24 * 60 * 60}`)).toBe(true);
  } finally {
    setEnv("LOGIN_TOKEN_LIFETIME_DAYS", undefined);
  }
});
// @relation(GSSC-BLLR-313, scope=range_end, role=Test)

// @relation(GSSC-BLLR-9, scope=range_start, role=Test)
test("GSSC-BLLR-9 Login Token Challenge", async () => {
  const token = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token).toEqual(expect.any(String));
  const issued = token ?? "";
  const valid = await challenge(backend, issued);
  expect(valid.trim()).toBe("valid");
  expect(valid.includes(issued)).toBe(false);

  const unknown = `unknown-${randomUUID()}`;
  const invalid = await challenge(backend, unknown);
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
  const response = await logout(backend, issued);
  expect(response.status).toBe(204);
  expect((await challenge(backend, issued)).trim()).toBe("invalid");
});
// @relation(GSSC-BLLR-10, scope=range_end, role=Test)

// @relation(GSSC-BLLR-314, scope=range_start, role=Test)
test("GSSC-BLLR-314 Logout Clears Login Token Cookie", async () => {
  const token = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token).toEqual(expect.any(String));
  const response = await logout(backend, token ?? "");
  expect(response.status).toBe(204);
  const cleared = loginTokenSetCookieHeader(response.headers)?.toLowerCase() ?? "";
  expect(
    cleared.includes("max-age=0") ||
      cleared.includes(`${cookieHeaderForToken("").toLowerCase()}`) ||
      cleared.includes("expires="),
  ).toBe(true);
});
// @relation(GSSC-BLLR-314, scope=range_end, role=Test)

// @relation(GSSC-BLLR-315, scope=range_start, role=Test)
test("GSSC-BLLR-315 Login Token Hash Stored", async () => {
  const response = await postJsonResponse(backend, "/login", {
    password: memberPassword,
    username: memberUsername,
  });
  const token = loginTokenFromSetCookie(response.headers);
  expect(token).toEqual(expect.any(String));
  const rows = await loginTokenRows();
  expect(rows.some((row) => row.tokenHash === hashLoginToken(token ?? ""))).toBe(true);
});
// @relation(GSSC-BLLR-315, scope=range_end, role=Test)

// @relation(GSSC-BLLR-316, scope=range_start, role=Test)
test("GSSC-BLLR-316 Login Token Row Removed On Logout", async () => {
  const token = await establishedLogin(backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token).toEqual(expect.any(String));
  const issued = token ?? "";
  expect((await logout(backend, issued)).status).toBe(204);
  const row = await prisma().loginToken.findUnique({
    where: { tokenHash: hashLoginToken(issued) },
  });
  expect(row).toBeNull();
});
// @relation(GSSC-BLLR-316, scope=range_end, role=Test)

// @relation(GSSC-BLLR-317, scope=range_start, role=Test)
test("GSSC-BLLR-317 Login Token Rows", async () => {
  const rows = await app.sql.query(`PRAGMA table_info("login_tokens")`);
  const names = new Set(rows.map((row) => String(row.name)));
  for (const column of ["tokenHash", "userId", "issuedAt", "expiresAt"]) {
    expect(names.has(column)).toBe(true);
  }
  expect(names.has("loggedOutAt")).toBe(false);
});
// @relation(GSSC-BLLR-317, scope=range_end, role=Test)

// @relation(GSSC-BLLR-318, scope=range_start, role=Test)
test("GSSC-BLLR-318 Login Token Available After Start", async () => {
  const user = await prisma().user.findUnique({ where: { username: memberUsername } });
  expect(user).not.toBeNull();
  const token = randomBytes(32).toString("base64url");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + DAY_MS);
  await prisma().loginToken.create({
    data: {
      tokenHash: hashLoginToken(token),
      userId: user!.id,
      issuedAt,
      expiresAt,
    },
  });
  expect((await challenge(backend, token)).trim()).toBe("valid");
});
// @relation(GSSC-BLLR-318, scope=range_end, role=Test)

// @relation(GSSC-BLLR-319, scope=range_start, role=Test)
test("GSSC-BLLR-319 Expired Login Token Rows Removed", async () => {
  const user = await prisma().user.findUnique({ where: { username: memberUsername } });
  expect(user).not.toBeNull();
  const token = randomBytes(32).toString("base64url");
  const issuedAt = new Date("2020-01-01T00:00:00.000Z");
  const expiresAt = new Date("2020-01-08T00:00:00.000Z");
  await prisma().loginToken.create({
    data: {
      tokenHash: hashLoginToken(token),
      userId: user!.id,
      issuedAt,
      expiresAt,
    },
  });
  expect(
    await prisma().loginToken.findUnique({ where: { tokenHash: hashLoginToken(token) } }),
  ).not.toBeNull();

  await scrubExpiredLoginTokens(prisma());
  expect(
    await prisma().loginToken.findUnique({ where: { tokenHash: hashLoginToken(token) } }),
  ).toBeNull();
});
// @relation(GSSC-BLLR-319, scope=range_end, role=Test)

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
