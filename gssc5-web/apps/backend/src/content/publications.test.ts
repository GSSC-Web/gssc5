import { access } from "node:fs/promises";
import path from "node:path";

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
import {
  ensurePublicationsFolder,
  PUBLICATIONS_DIR,
  resetPublicationsInitForTests,
} from "./publications";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let editorTok = "";

beforeAll(async () => {
  resetPublicationsInitForTests();
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

async function getJson(pathName: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(new Request(`http://127.0.0.1${pathName}`, { headers }));
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
  pathName: string,
  body: unknown,
  token?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(
    new Request(`http://127.0.0.1${pathName}`, {
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

async function uploadPublicationFile(
  cuid: string,
  token: string,
  bytes = "pub-bytes",
  filename = "issue.pdf",
): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes], filename, { type: "application/pdf" }));
  return backend(
    new Request(`http://127.0.0.1/publications/${cuid}/file`, {
      method: "POST",
      headers: { cookie: cookieHeaderForToken(token) },
      body: form,
    }),
  );
}

async function getPublicationFile(cuid: string): Promise<Response> {
  return backend(
    new Request(`http://127.0.0.1/publications/${cuid}/file`, {
      method: "GET",
    }),
  );
}

function expectedPath(cuid: string): string {
  return `${PUBLICATIONS_DIR}/${cuid}`;
}

// @relation(GSSC-BLLR-354, scope=range_start, role=Test)
test("GSSC-BLLR-354 Publications Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.publication.create({
    data: {
      title: `Stored Pub ${Date.now()}`,
      referenceLink: "publications/temp",
    },
  });
  const pathKey = expectedPath(row.id);
  await prisma.publication.update({
    where: { id: row.id },
    data: { referenceLink: pathKey },
  });
  const loaded = await prisma.publication.findUnique({ where: { id: row.id } });
  expect(loaded).toEqual({
    id: row.id,
    title: row.title,
    referenceLink: pathKey,
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
      referenceLink: "publications/pending-list",
    },
  });
  const pathKey = expectedPath(row.id);
  await prisma.publication.update({
    where: { id: row.id },
    data: { referenceLink: pathKey },
  });
  const { status, body } = await getJson("/publications");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const entry = (
    body as Array<{
      cuid: string;
      title: string;
      referenceLink: string;
      description: string | null;
    }>
  ).find((item) => item.cuid === row.id);
  expect(entry).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: pathKey,
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
    { title },
    editorTok,
  );
  expect(status).toBe(201);
  const cuid = (body as { cuid: string }).cuid;
  expect(body).toMatchObject({
    title,
    referenceLink: expectedPath(cuid),
    description: null,
  });
  expect(typeof cuid).toBe("string");

  const withDesc = await sendJson(
    "POST",
    "/publications",
    { title: `Desc Pub ${Date.now()}`, description: "Optional blurb" },
    editorTok,
  );
  expect(withDesc.status).toBe(201);
  const descCuid = (withDesc.body as { cuid: string }).cuid;
  expect(withDesc.body).toMatchObject({
    referenceLink: expectedPath(descCuid),
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
    { title: "Nope" },
    memberTok,
  );
  expect(status).toBe(403);
  const after = await getPrisma(loadConfig().DATABASE_URL).publication.count();
  expect(after).toBe(before);
});
// @relation(GSSC-BLLR-361, scope=range_end, role=Test)

// @relation(GSSC-BLLR-358, scope=range_start, role=Test)
test("GSSC-BLLR-358 Publication Get", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Get Pub ${Date.now()}` },
    editorTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const { status, body } = await getJson(`/publications/${cuid}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid,
    title: (created.body as { title: string }).title,
    referenceLink: expectedPath(cuid),
    description: null,
  });
});
// @relation(GSSC-BLLR-358, scope=range_end, role=Test)

// @relation(GSSC-BLLR-359, scope=range_start, role=Test)
test("GSSC-BLLR-359 Publication Modification", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Patch Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  const { status, body } = await sendJson(
    "PATCH",
    `/publications/${cuid}`,
    { title: "Patched Title" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid,
    title: "Patched Title",
    referenceLink: expectedPath(cuid),
    description: null,
  });

  const described = await sendJson(
    "PATCH",
    `/publications/${cuid}`,
    { description: "Now described" },
    editorTok,
  );
  expect(described.status).toBe(200);
  expect(described.body).toMatchObject({ description: "Now described" });
});
// @relation(GSSC-BLLR-359, scope=range_end, role=Test)

// @relation(GSSC-BLLR-362, scope=range_start, role=Test)
test("GSSC-BLLR-362 Publication Modification Forbidden", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `No Patch Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  const title = (created.body as { title: string }).title;
  const { status } = await sendJson(
    "PATCH",
    `/publications/${cuid}`,
    { title: "Hijack" },
    memberTok,
  );
  expect(status).toBe(403);
  const unchanged = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: cuid },
  });
  expect(unchanged?.title).toBe(title);
});
// @relation(GSSC-BLLR-362, scope=range_end, role=Test)

// @relation(GSSC-BLLR-360, scope=range_start, role=Test)
test("GSSC-BLLR-360 Publication Deletion", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Delete Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  const uploaded = await uploadPublicationFile(cuid, editorTok, "delete-me");
  expect(uploaded.status).toBe(200);

  const response = await backend(
    new Request(`http://127.0.0.1/publications/${cuid}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(editorTok) },
    }),
  );
  expect(response.status).toBe(204);
  const gone = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: cuid },
  });
  expect(gone).toBeNull();
  expect((await getPublicationFile(cuid)).status).toBe(404);
  const filePath = path.resolve(loadConfig().FILE_STORAGE_ROOT, expectedPath(cuid));
  expect(await Bun.file(filePath).exists()).toBe(false);
});
// @relation(GSSC-BLLR-360, scope=range_end, role=Test)

// @relation(GSSC-BLLR-363, scope=range_start, role=Test)
test("GSSC-BLLR-363 Publication Deletion Forbidden", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `No Delete Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  const response = await backend(
    new Request(`http://127.0.0.1/publications/${cuid}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(response.status).toBe(403);
  const kept = await getPrisma(loadConfig().DATABASE_URL).publication.findUnique({
    where: { id: cuid },
  });
  expect(kept).not.toBeNull();
});
// @relation(GSSC-BLLR-363, scope=range_end, role=Test)

// @relation(GSSC-BLLR-501, scope=range_start, role=Test)
test("GSSC-BLLR-501 publications directory exists on init", async () => {
  const folderId = await ensurePublicationsFolder();
  expect(folderId.length).toBeGreaterThan(0);
  const root = path.resolve(loadConfig().FILE_STORAGE_ROOT, PUBLICATIONS_DIR);
  await access(root);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.storedFileEntry.findUnique({ where: { id: folderId } });
  expect(row?.name).toBe(PUBLICATIONS_DIR);
  expect(row?.kind).toBe("folder");
});
// @relation(GSSC-BLLR-501, scope=range_end, role=Test)

// @relation(GSSC-BLLR-502, scope=range_start, role=Test)
test("GSSC-BLLR-502 authenticated upload stores by publication cuid", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Upload Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  const response = await uploadPublicationFile(cuid, editorTok, "named-pub");
  expect(response.status).toBe(200);
  const body = (await response.json()) as { cuid: string; path: string };
  expect(body.cuid).toBe(cuid);
  expect(body.path).toBe(expectedPath(cuid));
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, body.path));

  const denied = await uploadPublicationFile(cuid, memberTok, "denied");
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-502, scope=range_end, role=Test)

// @relation(GSSC-BLLR-503, scope=range_start, role=Test)
test("GSSC-BLLR-503 GET publication file without token succeeds", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Public File Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  expect((await uploadPublicationFile(cuid, editorTok, "public-bytes")).status).toBe(200);
  const got = await getPublicationFile(cuid);
  expect(got.status).toBe(200);
  expect(await got.text()).toBe("public-bytes");
});
// @relation(GSSC-BLLR-503, scope=range_end, role=Test)

// @relation(GSSC-BLLR-504, scope=range_start, role=Test)
test("GSSC-BLLR-504 upload for same publication cuid overwrites existing file", async () => {
  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Replace Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  expect((await uploadPublicationFile(cuid, editorTok, "first-bytes")).status).toBe(200);
  expect((await uploadPublicationFile(cuid, editorTok, "second-bytes")).status).toBe(200);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const folderId = await ensurePublicationsFolder();
  const rows = await prisma.storedFileEntry.findMany({
    where: { name: cuid, parentId: folderId, kind: "file", deletedAt: null },
  });
  expect(rows.length).toBe(1);
  const got = await getPublicationFile(cuid);
  expect(got.status).toBe(200);
  expect(await got.text()).toBe("second-bytes");
});
// @relation(GSSC-BLLR-504, scope=range_end, role=Test)

test("Publication mutation body schema rejects empty title and empty patch", async () => {
  expect(
    (
      await sendJson(
        "POST",
        "/publications",
        { title: "" },
        editorTok,
      )
    ).status,
  ).toBe(422);

  const created = await sendJson(
    "POST",
    "/publications",
    { title: `Schema Pub ${Date.now()}` },
    editorTok,
  );
  const cuid = (created.body as { cuid: string }).cuid;
  expect((await sendJson("PATCH", `/publications/${cuid}`, {}, editorTok)).status).toBe(422);
});

// silence unused adminTok for future admin-only asserts
void adminTok;
