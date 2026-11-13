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

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let editorTok = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);

  const editorHash = await Bun.password.hash("file-editor-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "file-editor",
      primaryEmail: "file.editor@example.com",
      passwordHash: editorHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: true,
      firstName: "File",
      lastName: "Editor",
      primaryPhone: "2095550401",
      preferredContactMethod: "Email",
      homeLine1: "1 File",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 File",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-file-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-file-member",
      primaryEmail: "plain.file@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
      firstName: "Plain",
      lastName: "File",
      primaryPhone: "2095550402",
      preferredContactMethod: "Email",
      homeLine1: "2 File",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 File",
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
      username: "plain-file-member",
      password: "plain-file-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  editorTok =
    (await establishedLogin(backend, {
      username: "file-editor",
      password: "file-editor-secret",
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

async function uploadFile(
  fileName: string,
  contents: string,
  fields: Record<string, string>,
  token?: string,
) {
  const form = new FormData();
  form.append("file", new File([contents], fileName, { type: "application/pdf" }));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(
    new Request("http://127.0.0.1/files/upload", {
      method: "POST",
      headers,
      body: form,
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

async function getBytes(pathName: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(new Request(`http://127.0.0.1${pathName}`, { headers }));
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { status: response.status, bytes, contentType: response.headers.get("content-type") };
}

// @relation(GSSC-BLLR-366, scope=range_start, role=Test)
test("GSSC-BLLR-366 Stored File Entries Table", async () => {
  const folder = await sendJson(
    "POST",
    "/files",
    { name: "meta-folder", writeRoles: ["publicationEditor"] },
    adminTok,
  );
  expect(folder.status).toBe(200);
  const cuid = (folder.body as { cuid: string }).cuid;
  const rows = await app.sql.query(
    `SELECT id, name, kind, parentId, isPublic, readRoles, writeRoles, deletedAt FROM stored_file_entries WHERE id = '${cuid}'`,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe("meta-folder");
  expect(rows[0].kind).toBe("folder");
  expect(rows[0].deletedAt).toBeNull();
});
// @relation(GSSC-BLLR-366, scope=range_end, role=Test)

// @relation(GSSC-BLLR-367, scope=range_start, role=Test)
test("GSSC-BLLR-367 File ACL Role Tokens", async () => {
  const ok = await sendJson(
    "POST",
    "/files",
    {
      name: "role-tokens",
      writeRoles: ["member", "userMod", "toolEditor", "publicationEditor"],
    },
    adminTok,
  );
  expect(ok.status).toBe(200);
  const bad = await sendJson(
    "POST",
    "/files",
    { name: "bad-role", writeRoles: ["notARole"] },
    adminTok,
  );
  expect(bad.status).toBe(400);
});
// @relation(GSSC-BLLR-367, scope=range_end, role=Test)

// @relation(GSSC-BLLR-368, scope=range_start, role=Test)
test("GSSC-BLLR-368 File ACL Inheritance on Create", async () => {
  const parent = await sendJson(
    "POST",
    "/files",
    {
      name: "inherit-parent",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  expect(parent.status).toBe(200);
  const parentCuid = (parent.body as { cuid: string }).cuid;
  const child = await sendJson(
    "POST",
    "/files",
    { name: "inherit-child", parent: parentCuid },
    editorTok,
  );
  expect(child.status).toBe(200);
  const body = child.body as {
    isPublic: boolean;
    readRoles: string[];
    writeRoles: string[];
  };
  expect(body.isPublic).toBe(false);
  expect(body.readRoles).toEqual(["publicationEditor"]);
  expect(body.writeRoles).toEqual(["publicationEditor"]);
});
// @relation(GSSC-BLLR-368, scope=range_end, role=Test)

// @relation(GSSC-BLLR-369, scope=range_start, role=Test)
test("GSSC-BLLR-369 File ACL Non-Loosening Enforcement", async () => {
  const parent = await sendJson(
    "POST",
    "/files",
    {
      name: "tight-parent",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const parentCuid = (parent.body as { cuid: string }).cuid;
  const looserPublic = await sendJson(
    "POST",
    "/files",
    { name: "looser-public", parent: parentCuid, isPublic: true },
    editorTok,
  );
  expect(looserPublic.status).toBe(400);
  const looserRead = await sendJson(
    "POST",
    "/files",
    {
      name: "looser-read",
      parent: parentCuid,
      readRoles: ["member"],
    },
    editorTok,
  );
  expect(looserRead.status).toBe(400);
});
// @relation(GSSC-BLLR-369, scope=range_end, role=Test)

// @relation(GSSC-BLLR-370, scope=range_start, role=Test)
test("GSSC-BLLR-370 Soft-Delete Marker Retention", async () => {
  const uploaded = await uploadFile(
    "keep-bytes.pdf",
    "%PDF-keep",
    {},
    adminTok,
  );
  expect(uploaded.status).toBe(200);
  const cuid = (uploaded.body as { cuid: string }).cuid;
  const storagePath = path.join(loadConfig().FILE_STORAGE_ROOT, cuid);
  await access(storagePath);
  const deleted = await sendJson("DELETE", `/files/${cuid}`, {}, adminTok);
  expect(deleted.status).toBe(200);
  await access(storagePath);
  const rows = await app.sql.query(
    `SELECT deletedAt FROM stored_file_entries WHERE id = '${cuid}'`,
  );
  expect(rows[0].deletedAt).not.toBeNull();
});
// @relation(GSSC-BLLR-370, scope=range_end, role=Test)

// @relation(GSSC-BLLR-371, scope=range_start, role=Test)
test("GSSC-BLLR-371 Directory List Parent", async () => {
  const folder = await sendJson("POST", "/files", { name: "list-parent" }, adminTok);
  const folderCuid = (folder.body as { cuid: string }).cuid;
  await uploadFile("child.pdf", "%PDF-child", { parent: folderCuid }, adminTok);
  const root = await getJson("/files", adminTok);
  expect(root.status).toBe(200);
  expect(
    (root.body as Array<{ name: string }>).some((entry) => entry.name === "list-parent"),
  ).toBe(true);
  const nested = await getJson(`/files?parent=${folderCuid}`, adminTok);
  expect(nested.status).toBe(200);
  expect(
    (nested.body as Array<{ name: string }>).some((entry) => entry.name === "child.pdf"),
  ).toBe(true);
});
// @relation(GSSC-BLLR-371, scope=range_end, role=Test)

// @relation(GSSC-BLLR-372, scope=range_start, role=Test)
test("GSSC-BLLR-372 Directory List Omits Soft-Deleted", async () => {
  const folder = await sendJson("POST", "/files", { name: "omit-deleted" }, adminTok);
  const cuid = (folder.body as { cuid: string }).cuid;
  await sendJson("DELETE", `/files/${cuid}`, {}, adminTok);
  const listed = await getJson("/files", adminTok);
  expect(
    (listed.body as Array<{ cuid: string }>).some((entry) => entry.cuid === cuid),
  ).toBe(false);
});
// @relation(GSSC-BLLR-372, scope=range_end, role=Test)

// @relation(GSSC-BLLR-373, scope=range_start, role=Test)
test("GSSC-BLLR-373 Directory List Read Access", async () => {
  const folder = await sendJson(
    "POST",
    "/files",
    {
      name: "private-list",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const cuid = (folder.body as { cuid: string }).cuid;
  const denied = await getJson(`/files?parent=${cuid}`, memberTok);
  expect(denied.status).toBe(403);
  const allowed = await getJson(`/files?parent=${cuid}`, editorTok);
  expect(allowed.status).toBe(200);
});
// @relation(GSSC-BLLR-373, scope=range_end, role=Test)

// @relation(GSSC-BLLR-374, scope=range_start, role=Test)
test("GSSC-BLLR-374 Directory List Entry Fields", async () => {
  await sendJson("POST", "/files", { name: "fields-folder" }, adminTok);
  const listed = await getJson("/files", adminTok);
  const entry = (listed.body as Array<Record<string, unknown>>).find(
    (item) => item.name === "fields-folder",
  );
  expect(entry).toBeDefined();
  expect(entry).toHaveProperty("cuid");
  expect(entry).toHaveProperty("name");
  expect(entry).toHaveProperty("kind");
  expect(entry).toHaveProperty("isPublic");
  expect(entry).toHaveProperty("readRoles");
  expect(entry).toHaveProperty("writeRoles");
});
// @relation(GSSC-BLLR-374, scope=range_end, role=Test)

// @relation(GSSC-BLLR-375, scope=range_start, role=Test)
test("GSSC-BLLR-375 Folder Creation", async () => {
  const created = await sendJson(
    "POST",
    "/files",
    { name: "created-folder", writeRoles: ["publicationEditor"] },
    adminTok,
  );
  expect(created.status).toBe(200);
  const body = created.body as {
    cuid: string;
    name: string;
    kind: string;
    isPublic: boolean;
    readRoles: string[];
    writeRoles: string[];
  };
  expect(body.name).toBe("created-folder");
  expect(body.kind).toBe("folder");
  expect(typeof body.cuid).toBe("string");
  expect(body.writeRoles).toEqual(["publicationEditor"]);
});
// @relation(GSSC-BLLR-375, scope=range_end, role=Test)

// @relation(GSSC-BLLR-376, scope=range_start, role=Test)
test("GSSC-BLLR-376 Folder Creation Forbidden", async () => {
  const denied = await sendJson("POST", "/files", { name: "nope" }, memberTok);
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-376, scope=range_end, role=Test)

// @relation(GSSC-BLLR-377, scope=range_start, role=Test)
test("GSSC-BLLR-377 File Upload", async () => {
  const uploaded = await uploadFile("newsletter.pdf", "%PDF-1.4 demo", {}, adminTok);
  expect(uploaded.status).toBe(200);
  const body = uploaded.body as {
    cuid: string;
    name: string;
    kind: string;
  };
  expect(body.kind).toBe("file");
  expect(body.name).toBe("newsletter.pdf");
  const storagePath = path.join(loadConfig().FILE_STORAGE_ROOT, body.cuid);
  await access(storagePath);
});
// @relation(GSSC-BLLR-377, scope=range_end, role=Test)

// @relation(GSSC-BLLR-378, scope=range_start, role=Test)
test("GSSC-BLLR-378 File Upload Forbidden", async () => {
  const denied = await uploadFile("secret.pdf", "%PDF-no", {}, memberTok);
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-378, scope=range_end, role=Test)

// @relation(GSSC-BLLR-379, scope=range_start, role=Test)
test("GSSC-BLLR-379 File Get", async () => {
  const uploaded = await uploadFile("get-me.pdf", "%PDF-get-bytes", {}, adminTok);
  const cuid = (uploaded.body as { cuid: string }).cuid;
  const got = await getBytes(`/files/${cuid}`);
  expect(got.status).toBe(200);
  expect(new TextDecoder().decode(got.bytes)).toBe("%PDF-get-bytes");
});
// @relation(GSSC-BLLR-379, scope=range_end, role=Test)

// @relation(GSSC-BLLR-380, scope=range_start, role=Test)
test("GSSC-BLLR-380 File Get Denied", async () => {
  const folder = await sendJson("POST", "/files", { name: "not-a-file" }, adminTok);
  const folderCuid = (folder.body as { cuid: string }).cuid;
  expect((await getBytes(`/files/${folderCuid}`)).status).toBe(404);

  const privateFolder = await sendJson(
    "POST",
    "/files",
    {
      name: "private-get-parent",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const parentCuid = (privateFolder.body as { cuid: string }).cuid;
  const uploaded = await uploadFile(
    "private.pdf",
    "%PDF-private",
    { parent: parentCuid },
    editorTok,
  );
  const cuid = (uploaded.body as { cuid: string }).cuid;
  expect((await getBytes(`/files/${cuid}`, memberTok)).status).toBe(403);

  await sendJson("DELETE", `/files/${cuid}`, {}, editorTok);
  expect((await getBytes(`/files/${cuid}`, editorTok)).status).toBe(404);
});
// @relation(GSSC-BLLR-380, scope=range_end, role=Test)

// @relation(GSSC-BLLR-381, scope=range_start, role=Test)
test("GSSC-BLLR-381 File Soft Deletion", async () => {
  const uploaded = await uploadFile("soft.pdf", "%PDF-soft", {}, adminTok);
  const cuid = (uploaded.body as { cuid: string }).cuid;
  const deleted = await sendJson("DELETE", `/files/${cuid}`, {}, adminTok);
  expect(deleted.status).toBe(200);
  expect((deleted.body as { ok: boolean }).ok).toBe(true);
  await access(path.join(loadConfig().FILE_STORAGE_ROOT, cuid));
});
// @relation(GSSC-BLLR-381, scope=range_end, role=Test)

// @relation(GSSC-BLLR-382, scope=range_start, role=Test)
test("GSSC-BLLR-382 File Soft Deletion Forbidden", async () => {
  const uploaded = await uploadFile("no-delete.pdf", "%PDF-x", {}, adminTok);
  const cuid = (uploaded.body as { cuid: string }).cuid;
  const denied = await sendJson("DELETE", `/files/${cuid}`, {}, memberTok);
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-382, scope=range_end, role=Test)

// @relation(GSSC-BLLR-383, scope=range_start, role=Test)
test("GSSC-BLLR-383 Administrator File ACL Bypass", async () => {
  const folder = await sendJson(
    "POST",
    "/files",
    {
      name: "admin-bypass",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const cuid = (folder.body as { cuid: string }).cuid;
  const listed = await getJson(`/files?parent=${cuid}`, adminTok);
  expect(listed.status).toBe(200);
  const child = await sendJson(
    "POST",
    "/files",
    { name: "admin-child", parent: cuid },
    adminTok,
  );
  expect(child.status).toBe(200);
});
// @relation(GSSC-BLLR-383, scope=range_end, role=Test)

// @relation(GSSC-BLLR-384, scope=range_start, role=Test)
test("GSSC-BLLR-384 Public File Read Access", async () => {
  const uploaded = await uploadFile("public.pdf", "%PDF-public", {}, adminTok);
  const cuid = (uploaded.body as { cuid: string }).cuid;
  const got = await getBytes(`/files/${cuid}`);
  expect(got.status).toBe(200);
  const listed = await getJson("/files");
  expect(
    (listed.body as Array<{ cuid: string }>).some((entry) => entry.cuid === cuid),
  ).toBe(true);
});
// @relation(GSSC-BLLR-384, scope=range_end, role=Test)

// @relation(GSSC-BLLR-385, scope=range_start, role=Test)
test("GSSC-BLLR-385 Role File Read Access", async () => {
  const folder = await sendJson(
    "POST",
    "/files",
    {
      name: "role-read",
      isPublic: false,
      readRoles: ["publicationEditor"],
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const parentCuid = (folder.body as { cuid: string }).cuid;
  const uploaded = await uploadFile(
    "role-read.pdf",
    "%PDF-role",
    { parent: parentCuid },
    editorTok,
  );
  const cuid = (uploaded.body as { cuid: string }).cuid;
  expect((await getBytes(`/files/${cuid}`, editorTok)).status).toBe(200);
  expect((await getBytes(`/files/${cuid}`, memberTok)).status).toBe(403);
});
// @relation(GSSC-BLLR-385, scope=range_end, role=Test)

// @relation(GSSC-BLLR-386, scope=range_start, role=Test)
test("GSSC-BLLR-386 Role File Write Access", async () => {
  const folder = await sendJson(
    "POST",
    "/files",
    {
      name: "role-write",
      isPublic: true,
      writeRoles: ["publicationEditor"],
    },
    adminTok,
  );
  const parentCuid = (folder.body as { cuid: string }).cuid;
  const allowed = await uploadFile(
    "editor-write.pdf",
    "%PDF-editor",
    { parent: parentCuid },
    editorTok,
  );
  expect(allowed.status).toBe(200);
  const denied = await uploadFile(
    "member-write.pdf",
    "%PDF-member",
    { parent: parentCuid },
    memberTok,
  );
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-386, scope=range_end, role=Test)
