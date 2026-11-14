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
  const passwordHash = await Bun.password.hash("pub-editor-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "pub-editor",
      primaryEmail: "pub.editor@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: true,
      firstName: "Pub",
      lastName: "Editor",
      primaryPhone: "2095550301",
      preferredContactMethod: "Email",
      homeLine1: "1 Pub",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Pub",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-pub-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-pub",
      primaryEmail: "plain.pub@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
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
      username: "plain-member-pub",
      password: "plain-pub-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  editorTok =
    (await establishedLogin(backend, {
      username: "pub-editor",
      password: "pub-editor-secret",
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

// @relation(GSSC-BLLR-354, scope=range_start, role=Test)
test("GSSC-BLLR-354 Publications Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.publication.create({
    data: {
      title: `Stored Pub ${Date.now()}`,
      referenceLink: "https://example.org/stored",
    },
  });
  const loaded = await prisma.publication.findUnique({ where: { id: row.id } });
  expect(loaded).toEqual({
    id: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    description: null,
  });
});
// @relation(GSSC-BLLR-354, scope=range_end, role=Test)

// @relation(GSSC-BLLR-356, scope=range_start, role=Test)
test("GSSC-BLLR-356 Publications List", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.publication.create({
    data: {
      title: `List Pub ${Date.now()}`,
      referenceLink: "https://example.org/list",
    },
  });
  const { status, body } = await getJson("/publications");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const entry = (body as Array<{ cuid: string; title: string; referenceLink: string; description: string | null }>).find(
    (item) => item.cuid === row.id,
  );
  expect(entry).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    description: null,
  });
});
// @relation(GSSC-BLLR-356, scope=range_end, role=Test)

// @relation(GSSC-BLLR-357, scope=range_start, role=Test)
test("GSSC-BLLR-357 Publication Creation", async () => {
  const title = `Create Pub ${Date.now()}`;
  const { status, body } = await sendJson(
    "POST",
    "/publications",
    { title, referenceLink: "https://example.org/create" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toMatchObject({
    title,
    referenceLink: "https://example.org/create",
    description: null,
  });
  expect(typeof (body as { cuid: string }).cuid).toBe("string");

  const withDesc = await sendJson(
    "POST",
    "/publications",
    { title: `Desc Pub ${Date.now()}`, referenceLink: "https://example.org/desc", description: "Optional blurb" },
    editorTok,
  );
  expect(withDesc.status).toBe(200);
  expect(withDesc.body).toMatchObject({
    referenceLink: "https://example.org/desc",
    description: "Optional blurb",
  });
});
// @relation(GSSC-BLLR-357, scope=range_end, role=Test)

// @relation(GSSC-BLLR-361, scope=range_start, role=Test)
test("GSSC-BLLR-361 Publication Creation Forbidden", async () => {
  const before = await getPrisma(loadConfig().DATABASE_URL).publication.count();
  const { status } = await sendJson(
    "POST",
    "/publications",
    { title: "Nope", referenceLink: "https://example.org/nope" },
    memberTok,
  );
  expect(status).toBe(403);
  const after = await getPrisma(loadConfig().DATABASE_URL).publication.count();
  expect(after).toBe(before);
});
// @relation(GSSC-BLLR-361, scope=range_end, role=Test)

// @relation(GSSC-BLLR-358, scope=range_start, role=Test)
test("GSSC-BLLR-358 Publication Get", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `Get Pub ${Date.now()}`,
      referenceLink: "https://example.org/get",
    },
  });
  const { status, body } = await getJson(`/publications/${row.id}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    description: null,
  });
});
// @relation(GSSC-BLLR-358, scope=range_end, role=Test)

// @relation(GSSC-BLLR-359, scope=range_start, role=Test)
test("GSSC-BLLR-359 Publication Modification", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `Patch Pub ${Date.now()}`,
      referenceLink: "https://example.org/old",
    },
  });
  const { status, body } = await sendJson(
    "PATCH",
    `/publications/${row.id}`,
    { title: "Patched Title", referenceLink: "https://example.org/new" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    title: "Patched Title",
    referenceLink: "https://example.org/new",
    description: null,
  });

  const described = await sendJson(
    "PATCH",
    `/publications/${row.id}`,
    { description: "Now described" },
    editorTok,
  );
  expect(described.status).toBe(200);
  expect(described.body).toMatchObject({ description: "Now described" });
});
// @relation(GSSC-BLLR-359, scope=range_end, role=Test)

// @relation(GSSC-BLLR-362, scope=range_start, role=Test)
test("GSSC-BLLR-362 Publication Modification Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `No Patch Pub ${Date.now()}`,
      referenceLink: "https://example.org/locked",
    },
  });
  const { status } = await sendJson(
    "PATCH",
    `/publications/${row.id}`,
    { title: "Hijack" },
    memberTok,
  );
  expect(status).toBe(403);
  const unchanged = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: row.id },
  });
  expect(unchanged?.title).toBe(row.title);
});
// @relation(GSSC-BLLR-362, scope=range_end, role=Test)

// @relation(GSSC-BLLR-360, scope=range_start, role=Test)
test("GSSC-BLLR-360 Publication Deletion", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `Delete Pub ${Date.now()}`,
      referenceLink: "https://example.org/delete",
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/publications/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(editorTok) },
    }),
  );
  expect(response.status).toBe(204);
  const gone = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: row.id },
  });
  expect(gone).toBeNull();
});
// @relation(GSSC-BLLR-360, scope=range_end, role=Test)

// @relation(GSSC-BLLR-363, scope=range_start, role=Test)
test("GSSC-BLLR-363 Publication Deletion Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `No Delete Pub ${Date.now()}`,
      referenceLink: "https://example.org/keep",
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/publications/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(response.status).toBe(403);
  const kept = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: row.id },
  });
  expect(kept).not.toBeNull();
});
// @relation(GSSC-BLLR-363, scope=range_end, role=Test)

test("Publication mutation body schema rejects empty title and empty patch", async () => {
  expect(
    (
      await sendJson(
        "POST",
        "/publications",
        { title: "", referenceLink: "https://example.org/x" },
        editorTok,
      )
    ).status,
  ).toBe(422);

  const row = await getPrisma(loadConfig().DATABASE_URL).publication.create({
    data: {
      title: `Schema Pub ${Date.now()}`,
      referenceLink: "https://example.org/schema",
    },
  });
  expect((await sendJson("PATCH", `/publications/${row.id}`, {}, editorTok)).status).toBe(422);
});
