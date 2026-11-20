// Key-value store checks. Each assertion is limited to that requirement's statement.
import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "./config";
import { getPrisma } from "./db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  postJsonResponse,
  type BackendFetch,
  type InProcessApp,
} from "./test-harness";

let app: InProcessApp;
let backend: BackendFetch;
let moderatorToken = "";
let memberToken = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = db();
  const passwordHash = await Bun.password.hash("kvs-member-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "kvs-moderator",
      primaryEmail: "kvs.moderator@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: true,
      firstName: "Mod",
      lastName: "Erator",
      primaryPhone: "2095550101",
      preferredContactMethod: "Email",
      homeLine1: "1 Mod",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Mod",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  await prisma.user.create({
    data: {
      username: "kvs-member",
      primaryEmail: "kvs.member@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550102",
      preferredContactMethod: "Email",
      homeLine1: "2 Mem",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Mem",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const admin = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect(admin).toEqual(expect.any(String));

  moderatorToken =
    (await establishedLogin(backend, {
      username: "kvs-moderator",
      password: "kvs-member-secret",
    })) ?? "";
  expect(moderatorToken.length).toBeGreaterThan(0);

  memberToken =
    (await establishedLogin(backend, {
      username: "kvs-member",
      password: "kvs-member-secret",
    })) ?? "";
  expect(memberToken.length).toBeGreaterThan(0);
}, 120_000);

function db() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function adminToken(): Promise<string> {
  const token = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect(token).toEqual(expect.any(String));
  return token ?? "";
}

async function getEntry(key: string): Promise<{ status: number; body: string; entry?: { key: string; value: string } }> {
  const response = await backend(new Request(`http://127.0.0.1/kvs/${encodeURIComponent(key)}`));
  const body = await response.text();
  let entry: { key: string; value: string } | undefined;
  if (response.status === 200) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { key?: unknown }).key === "string" &&
        typeof (parsed as { value?: unknown }).value === "string"
      ) {
        entry = parsed as { key: string; value: string };
      }
    } catch {
      entry = undefined;
    }
  }
  return { status: response.status, body, entry };
}

async function upsert(
  key: string,
  payload: unknown,
  token?: string,
): Promise<{ status: number; body: string }> {
  return postJsonResponse(
    backend,
    `/kvs/${encodeURIComponent(key)}`,
    payload,
    token === undefined ? undefined : { cookie: cookieHeaderForToken(token) },
  );
}

async function storedValue(key: string): Promise<string | null> {
  const row = await db().keyValue.findUnique({ where: { key } });
  return row?.value ?? null;
}

// @relation(GSSC-BLLR-293, scope=range_start, role=Test)
test("GSSC-BLLR-293 Key-Value Public Read", async () => {
  await db().keyValue.upsert({
    where: { key: "test.public.read" },
    create: { key: "test.public.read", value: "visible" },
    update: { value: "visible" },
  });
  const result = await getEntry("test.public.read");
  expect(result.status).toBe(200);
});
// @relation(GSSC-BLLR-293, scope=range_end, role=Test)

// @relation(GSSC-BLLR-294, scope=range_start, role=Test)
test("GSSC-BLLR-294 Key-Value Entry Contents", async () => {
  await db().keyValue.upsert({
    where: { key: "test.contents" },
    create: { key: "test.contents", value: "payload" },
    update: { value: "payload" },
  });
  const result = await getEntry("test.contents");
  expect(result.status).toBe(200);
  expect(result.entry).toEqual({ key: "test.contents", value: "payload" });
});
// @relation(GSSC-BLLR-294, scope=range_end, role=Test)

// @relation(GSSC-BLLR-295, scope=range_start, role=Test)
test("GSSC-BLLR-295 Key-Value Entry Not Found", async () => {
  await db().keyValue.deleteMany({ where: { key: "test.missing.key" } });
  const result = await getEntry("test.missing.key");
  expect(result.status).toBe(404);
});
// @relation(GSSC-BLLR-295, scope=range_end, role=Test)

// @relation(GSSC-BLLR-296, scope=range_start, role=Test)
test("GSSC-BLLR-296 Key-Value Entry Upsert", async () => {
  const token = await adminToken();
  const key = "test.upsert.create";
  await db().keyValue.deleteMany({ where: { key } });
  expect((await upsert(key, { value: "created" }, token)).status).toBe(204);
  expect(await storedValue(key)).toBe("created");
  expect((await upsert(key, { value: "replaced" }, token)).status).toBe(204);
  expect(await storedValue(key)).toBe("replaced");
});
// @relation(GSSC-BLLR-296, scope=range_end, role=Test)

// @relation(GSSC-BLLR-297, scope=range_start, role=Test)
test("GSSC-BLLR-297 Key-Value Upsert Login Token Required", async () => {
  const key = "test.upsert.auth";
  await db().keyValue.upsert({
    where: { key },
    create: { key, value: "before" },
    update: { value: "before" },
  });
  expect((await upsert(key, { value: "after" }, "not-a-login-token")).status).toBe(403);
  expect((await upsert(key, { value: "after" })).status).toBe(403);
  // Body token must not authenticate.
  expect((await upsert(key, { token: await adminToken(), value: "after" })).status).toBe(403);
  expect(await storedValue(key)).toBe("before");
});
// @relation(GSSC-BLLR-297, scope=range_end, role=Test)

// @relation(GSSC-BLLR-298, scope=range_start, role=Test)
test("GSSC-BLLR-298 Key-Value Upsert Privilege", async () => {
  const token = await adminToken();
  const key = "test.upsert.admin";
  expect((await upsert(key, { value: "admin-ok" }, token)).status).toBe(204);
  expect(await storedValue(key)).toBe("admin-ok");
});
// @relation(GSSC-BLLR-298, scope=range_end, role=Test)

// @relation(GSSC-BLLR-299, scope=range_start, role=Test)
test("GSSC-BLLR-299 Key-Value Upsert Forbidden", async () => {
  const key = "test.upsert.forbidden";
  await db().keyValue.upsert({
    where: { key },
    create: { key, value: "before" },
    update: { value: "before" },
  });
  expect((await upsert(key, { value: "after" }, moderatorToken)).status).toBe(403);
  expect((await upsert(key, { value: "after" }, memberToken)).status).toBe(403);
  expect(await storedValue(key)).toBe("before");
});
// @relation(GSSC-BLLR-299, scope=range_end, role=Test)

// @relation(GSSC-BLLR-300, scope=range_start, role=Test)
test("GSSC-BLLR-300 Key-Value Upsert Value Required", async () => {
  const token = await adminToken();
  const key = "test.upsert.invalid";
  await db().keyValue.upsert({
    where: { key },
    create: { key, value: "before" },
    update: { value: "before" },
  });
  expect((await upsert(key, {}, token)).status).toBe(422);
  expect((await upsert(key, { value: 12 }, token)).status).toBe(422);
  expect(await storedValue(key)).toBe("before");
});
// @relation(GSSC-BLLR-300, scope=range_end, role=Test)

// @relation(GSSC-BLLR-306, scope=range_start, role=Test)
test("GSSC-BLLR-306 Key-Value Table", async () => {
  const rows = await app.sql.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='key_value'",
  );
  expect(rows).toHaveLength(1);
});
// @relation(GSSC-BLLR-306, scope=range_end, role=Test)

// @relation(GSSC-BLLR-307, scope=range_start, role=Test)
test("GSSC-BLLR-307 Key-Value Key", async () => {
  const token = await adminToken();
  expect((await upsert("test.field.key", { value: "v" }, token)).status).toBe(204);
  const rows = await app.sql.query(
    "SELECT key FROM key_value WHERE key='test.field.key'",
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.key).toBe("test.field.key");
});
// @relation(GSSC-BLLR-307, scope=range_end, role=Test)

// @relation(GSSC-BLLR-308, scope=range_start, role=Test)
test("GSSC-BLLR-308 Key-Value Value", async () => {
  const token = await adminToken();
  expect((await upsert("test.field.value", { value: "stored-value" }, token)).status).toBe(204);
  const rows = await app.sql.query(
    "SELECT value FROM key_value WHERE key='test.field.value'",
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.value).toBe("stored-value");
});
// @relation(GSSC-BLLR-308, scope=range_end, role=Test)

async function listCatalog(
  token?: string,
): Promise<{ status: number; body: string; entries?: Array<{ key: string; value: string }> }> {
  const headers: HeadersInit = {};
  if (token !== undefined) {
    headers.cookie = cookieHeaderForToken(token);
  }
  const response = await backend(
    new Request("http://127.0.0.1/kvs", { headers }),
  );
  const body = await response.text();
  let entries: Array<{ key: string; value: string }> | undefined;
  if (response.status === 200) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (Array.isArray(parsed)) {
        entries = parsed as Array<{ key: string; value: string }>;
      }
    } catch {
      entries = undefined;
    }
  }
  return { status: response.status, body, entries };
}

async function deleteEntry(
  key: string,
  token?: string,
): Promise<{ status: number; body: string }> {
  const headers: HeadersInit = {};
  if (token !== undefined) {
    headers.cookie = cookieHeaderForToken(token);
  }
  const response = await backend(
    new Request(`http://127.0.0.1/kvs/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers,
    }),
  );
  return { status: response.status, body: await response.text() };
}

// @relation(GSSC-BLLR-509, scope=range_start, role=Test)
test("GSSC-BLLR-509 Key-Value Catalog List", async () => {
  const token = await adminToken();
  await db().keyValue.upsert({
    where: { key: "test.list.a" },
    create: { key: "test.list.a", value: "alpha" },
    update: { value: "alpha" },
  });
  await db().keyValue.upsert({
    where: { key: "test.list.b" },
    create: { key: "test.list.b", value: "beta" },
    update: { value: "beta" },
  });
  const result = await listCatalog(token);
  expect(result.status).toBe(200);
  expect(result.entries).toEqual(
    expect.arrayContaining([
      { key: "test.list.a", value: "alpha" },
      { key: "test.list.b", value: "beta" },
    ]),
  );
});
// @relation(GSSC-BLLR-509, scope=range_end, role=Test)

// @relation(GSSC-BLLR-510, scope=range_start, role=Test)
test("GSSC-BLLR-510 Key-Value List Forbidden", async () => {
  expect((await listCatalog()).status).toBe(403);
  expect((await listCatalog("not-a-login-token")).status).toBe(403);
  expect((await listCatalog(moderatorToken)).status).toBe(403);
  expect((await listCatalog(memberToken)).status).toBe(403);
});
// @relation(GSSC-BLLR-510, scope=range_end, role=Test)

// @relation(GSSC-BLLR-511, scope=range_start, role=Test)
test("GSSC-BLLR-511 Key-Value Entry Delete", async () => {
  const token = await adminToken();
  const key = "test.delete.ok";
  await db().keyValue.upsert({
    where: { key },
    create: { key, value: "gone-soon" },
    update: { value: "gone-soon" },
  });
  expect((await deleteEntry(key, token)).status).toBe(204);
  expect(await storedValue(key)).toBeNull();
});
// @relation(GSSC-BLLR-511, scope=range_end, role=Test)

// @relation(GSSC-BLLR-512, scope=range_start, role=Test)
test("GSSC-BLLR-512 Key-Value Delete Forbidden", async () => {
  const key = "test.delete.forbidden";
  await db().keyValue.upsert({
    where: { key },
    create: { key, value: "keep" },
    update: { value: "keep" },
  });
  expect((await deleteEntry(key)).status).toBe(403);
  expect((await deleteEntry(key, moderatorToken)).status).toBe(403);
  expect((await deleteEntry(key, memberToken)).status).toBe(403);
  expect(await storedValue(key)).toBe("keep");
});
// @relation(GSSC-BLLR-512, scope=range_end, role=Test)

// @relation(GSSC-BLLR-513, scope=range_start, role=Test)
test("GSSC-BLLR-513 Key-Value Delete Not Found", async () => {
  const token = await adminToken();
  await db().keyValue.deleteMany({ where: { key: "test.delete.missing" } });
  expect((await deleteEntry("test.delete.missing", token)).status).toBe(404);
});
// @relation(GSSC-BLLR-513, scope=range_end, role=Test)
