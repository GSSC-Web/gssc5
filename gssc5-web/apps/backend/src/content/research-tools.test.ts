import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let editorTok = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const passwordHash = await Bun.password.hash("tool-editor-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "tool-editor",
      primaryEmail: "tool.editor@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      isToolEditor: true,
      firstName: "Tool",
      lastName: "Editor",
      primaryPhone: "2095550301",
      preferredContactMethod: "Email",
      homeLine1: "1 Tool",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Tool",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-member-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-rt",
      primaryEmail: "plain.rt@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      isToolEditor: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550302",
      preferredContactMethod: "Email",
      homeLine1: "2 Plain",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Plain",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  adminTok =
    (await establishedLogin(backend, {
      username: memberUsername,
      password: memberPassword,
    })) ?? "";
  expect(adminTok.length).toBeGreaterThan(0);

  memberTok =
    (await establishedLogin(backend, {
      username: "plain-member-rt",
      password: "plain-member-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  editorTok =
    (await establishedLogin(backend, {
      username: "tool-editor",
      password: "tool-editor-secret",
    })) ?? "";
  expect(editorTok.length).toBeGreaterThan(0);
});

async function getJson(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(new Request(`http://127.0.0.1${path}`, { headers }));
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: response.status, body };
}

async function sendJson(
  method: string,
  path: string,
  body: unknown,
  token?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      method,
      headers,
      body: JSON.stringify(body),
    }),
  );
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: response.status, body: parsed };
}

// @relation(GSSC-BLLR-343, scope=range_start, role=Test)
test("GSSC-BLLR-343 Research Tools Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.researchTool.create({
    data: {
      title: `Stored Tool ${Date.now()}`,
      referenceLink: "https://example.org/stored",
    },
  });
  const loaded = await prisma.researchTool.findUnique({ where: { id: row.id } });
  expect(loaded).toEqual({
    id: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
  });
});
// @relation(GSSC-BLLR-343, scope=range_end, role=Test)

// @relation(GSSC-BLLR-345, scope=range_start, role=Test)
test("GSSC-BLLR-345 Research Tools List", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.researchTool.create({
    data: {
      title: `List Tool ${Date.now()}`,
      referenceLink: "https://example.org/list",
    },
  });
  const { status, body } = await getJson("/research-tools");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const entry = (body as Array<{ cuid: string; title: string; referenceLink: string }>).find(
    (item) => item.cuid === row.id,
  );
  expect(entry).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
  });
});
// @relation(GSSC-BLLR-345, scope=range_end, role=Test)

// @relation(GSSC-BLLR-346, scope=range_start, role=Test)
test("GSSC-BLLR-346 Research Tool Creation", async () => {
  const title = `Create Tool ${Date.now()}`;
  const { status, body } = await sendJson(
    "POST",
    "/research-tools",
    { title, referenceLink: "https://example.org/create" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toMatchObject({
    title,
    referenceLink: "https://example.org/create",
  });
  expect(typeof (body as { cuid: string }).cuid).toBe("string");
});
// @relation(GSSC-BLLR-346, scope=range_end, role=Test)

// @relation(GSSC-BLLR-350, scope=range_start, role=Test)
test("GSSC-BLLR-350 Research Tool Creation Forbidden", async () => {
  const before = await getPrisma(loadConfig().DATABASE_URL).researchTool.count();
  const { status } = await sendJson(
    "POST",
    "/research-tools",
    { title: "Nope", referenceLink: "https://example.org/nope" },
    memberTok,
  );
  expect(status).toBe(403);
  const after = await getPrisma(loadConfig().DATABASE_URL).researchTool.count();
  expect(after).toBe(before);
});
// @relation(GSSC-BLLR-350, scope=range_end, role=Test)

// @relation(GSSC-BLLR-347, scope=range_start, role=Test)
test("GSSC-BLLR-347 Research Tool Get", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `Get Tool ${Date.now()}`,
      referenceLink: "https://example.org/get",
    },
  });
  const { status, body } = await getJson(`/research-tools/${row.id}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
  });
});
// @relation(GSSC-BLLR-347, scope=range_end, role=Test)

// @relation(GSSC-BLLR-348, scope=range_start, role=Test)
test("GSSC-BLLR-348 Research Tool Modification", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `Patch Tool ${Date.now()}`,
      referenceLink: "https://example.org/old",
    },
  });
  const { status, body } = await sendJson(
    "PATCH",
    `/research-tools/${row.id}`,
    { title: "Patched Title", referenceLink: "https://example.org/new" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    title: "Patched Title",
    referenceLink: "https://example.org/new",
  });
});
// @relation(GSSC-BLLR-348, scope=range_end, role=Test)

// @relation(GSSC-BLLR-351, scope=range_start, role=Test)
test("GSSC-BLLR-351 Research Tool Modification Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `No Patch ${Date.now()}`,
      referenceLink: "https://example.org/locked",
    },
  });
  const { status } = await sendJson(
    "PATCH",
    `/research-tools/${row.id}`,
    { title: "Hijack" },
    memberTok,
  );
  expect(status).toBe(403);
  const unchanged = await getPrisma(loadConfig().DATABASE_URL).researchTool.findUnique({
    where: { id: row.id },
  });
  expect(unchanged?.title).toBe(row.title);
});
// @relation(GSSC-BLLR-351, scope=range_end, role=Test)

// @relation(GSSC-BLLR-349, scope=range_start, role=Test)
test("GSSC-BLLR-349 Research Tool Deletion", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `Delete Tool ${Date.now()}`,
      referenceLink: "https://example.org/delete",
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/research-tools/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(editorTok) },
    }),
  );
  expect(response.status).toBe(204);
  const gone = await getPrisma(loadConfig().DATABASE_URL).researchTool.findUnique({
    where: { id: row.id },
  });
  expect(gone).toBeNull();
});
// @relation(GSSC-BLLR-349, scope=range_end, role=Test)

// @relation(GSSC-BLLR-352, scope=range_start, role=Test)
test("GSSC-BLLR-352 Research Tool Deletion Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `No Delete ${Date.now()}`,
      referenceLink: "https://example.org/keep",
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/research-tools/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(response.status).toBe(403);
  const kept = await getPrisma(loadConfig().DATABASE_URL).researchTool.findUnique({
    where: { id: row.id },
  });
  expect(kept).not.toBeNull();
});
// @relation(GSSC-BLLR-352, scope=range_end, role=Test)
