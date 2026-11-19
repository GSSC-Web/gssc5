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
  RESEARCH_TOOLS_DIR,
  ensureResearchToolsFolder,
  resetResearchToolsInitForTests,
} from "./research-tools";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let editorTok = "";

beforeAll(async () => {
  resetResearchToolsInitForTests();
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
  const entry = (
    body as Array<{ cuid: string; title: string; referenceLink: string; hasFile: boolean }>
  ).find((item) => item.cuid === row.id);
  expect(entry).toEqual({
    cuid: row.id,
    title: row.title,
    referenceLink: row.referenceLink,
    hasFile: false,
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
  expect(status).toBe(201);
  expect(body).toMatchObject({
    title,
    referenceLink: "https://example.org/create",
    hasFile: false,
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
    hasFile: false,
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
    hasFile: false,
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

test("Research tool mutation body schema rejects empty title and empty patch", async () => {
  expect(
    (
      await sendJson(
        "POST",
        "/research-tools",
        { title: "", referenceLink: "https://example.org/x" },
        editorTok,
      )
    ).status,
  ).toBe(422);

  const row = await getPrisma(loadConfig().DATABASE_URL).researchTool.create({
    data: {
      title: `Schema Tool ${Date.now()}`,
      referenceLink: "https://example.org/schema",
    },
  });
  expect((await sendJson("PATCH", `/research-tools/${row.id}`, {}, editorTok)).status).toBe(422);
});

async function uploadToolFile(
  toolCuid: string,
  token: string,
  bytes = "tool-file-bytes",
): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes], "guide.pdf", { type: "application/pdf" }));
  return backend(
    new Request(`http://127.0.0.1/research-tools/${toolCuid}/file`, {
      method: "POST",
      headers: { cookie: cookieHeaderForToken(token) },
      body: form,
    }),
  );
}

// @relation(GSSC-BLLR-496, scope=range_start, role=Test)
test("GSSC-BLLR-496 research-tools directory exists on init", async () => {
  const folderId = await ensureResearchToolsFolder();
  expect(folderId.length).toBeGreaterThan(0);
  const root = path.resolve(loadConfig().FILE_STORAGE_ROOT, RESEARCH_TOOLS_DIR);
  await access(root);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.storedFileEntry.findUnique({ where: { id: folderId } });
  expect(row?.name).toBe(RESEARCH_TOOLS_DIR);
  expect(row?.kind).toBe("folder");
});
// @relation(GSSC-BLLR-496, scope=range_end, role=Test)

// @relation(GSSC-BLLR-497, scope=range_start, role=Test)
test("GSSC-BLLR-497 research tool file upload stores by tool cuid", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tool = await prisma.researchTool.create({
    data: {
      title: `Upload Tool ${Date.now()}`,
      referenceLink: "https://example.org/will-clear",
    },
  });
  const response = await uploadToolFile(tool.id, editorTok, "named-tool-file");
  expect(response.status).toBe(200);
  const body = (await response.json()) as { cuid: string; path: string };
  expect(body.cuid).toBe(tool.id);
  expect(body.path).toBe(`${RESEARCH_TOOLS_DIR}/${tool.id}`);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, body.path));
  const updated = await prisma.researchTool.findUnique({ where: { id: tool.id } });
  expect(updated?.referenceLink).toBe("");
  const { body: entry } = await getJson(`/research-tools/${tool.id}`);
  expect(entry).toMatchObject({ cuid: tool.id, hasFile: true, referenceLink: "" });
});
// @relation(GSSC-BLLR-497, scope=range_end, role=Test)

// @relation(GSSC-BLLR-498, scope=range_start, role=Test)
test("GSSC-BLLR-498 research tool file upload replaces prior file", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tool = await prisma.researchTool.create({
    data: { title: `Replace Tool ${Date.now()}`, referenceLink: "" },
  });
  expect((await uploadToolFile(tool.id, editorTok, "first-bytes")).status).toBe(200);
  expect((await uploadToolFile(tool.id, editorTok, "second-bytes")).status).toBe(200);
  const folderId = await ensureResearchToolsFolder();
  const files = await prisma.storedFileEntry.findMany({
    where: {
      name: tool.id,
      kind: "file",
      parentId: folderId,
      deletedAt: null,
    },
  });
  expect(files).toHaveLength(1);
  const disk = Bun.file(
    path.resolve(loadConfig().FILE_STORAGE_ROOT, `${RESEARCH_TOOLS_DIR}/${tool.id}`),
  );
  expect(await disk.text()).toBe("second-bytes");
});
// @relation(GSSC-BLLR-498, scope=range_end, role=Test)

// @relation(GSSC-BLLR-499, scope=range_start, role=Test)
test("GSSC-BLLR-499 research tool file GET is public", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tool = await prisma.researchTool.create({
    data: { title: `Public File Tool ${Date.now()}`, referenceLink: "" },
  });
  expect((await uploadToolFile(tool.id, editorTok, "public-bytes")).status).toBe(200);
  const response = await backend(
    new Request(`http://127.0.0.1/research-tools/${tool.id}/file`),
  );
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("public-bytes");
});
// @relation(GSSC-BLLR-499, scope=range_end, role=Test)

// @relation(GSSC-BLLR-500, scope=range_start, role=Test)
test("GSSC-BLLR-500 setting URL soft-deletes stored research tool file", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tool = await prisma.researchTool.create({
    data: { title: `URL Clears File ${Date.now()}`, referenceLink: "" },
  });
  expect((await uploadToolFile(tool.id, editorTok, "to-clear")).status).toBe(200);
  const { status, body } = await sendJson(
    "PATCH",
    `/research-tools/${tool.id}`,
    { referenceLink: "https://example.org/external" },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toMatchObject({
    referenceLink: "https://example.org/external",
    hasFile: false,
  });
  const folderId = await ensureResearchToolsFolder();
  const active = await prisma.storedFileEntry.findFirst({
    where: {
      name: tool.id,
      kind: "file",
      parentId: folderId,
      deletedAt: null,
    },
  });
  expect(active).toBeNull();
});
// @relation(GSSC-BLLR-500, scope=range_end, role=Test)

// @relation(GSSC-BLLR-505, scope=range_start, role=Test)
test("GSSC-BLLR-505 upload after URL create leaves a single reference kind", async () => {
  const { status, body } = await sendJson(
    "POST",
    "/research-tools",
    {
      title: `XOR Tool ${Date.now()}`,
      referenceLink: "https://example.org/before-file",
    },
    editorTok,
  );
  expect(status).toBe(201);
  const cuid = (body as { cuid: string }).cuid;
  expect(body).toMatchObject({
    referenceLink: "https://example.org/before-file",
    hasFile: false,
  });
  expect((await uploadToolFile(cuid, editorTok, "xor-bytes")).status).toBe(200);
  const got = await sendJson("GET", `/research-tools/${cuid}`, undefined, editorTok);
  expect(got.status).toBe(200);
  expect(got.body).toMatchObject({
    referenceLink: "",
    hasFile: true,
  });
});
// @relation(GSSC-BLLR-505, scope=range_end, role=Test)

test("research tool file upload forbidden for non-editor", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tool = await prisma.researchTool.create({
    data: { title: `No Upload ${Date.now()}`, referenceLink: "" },
  });
  const response = await uploadToolFile(tool.id, memberTok);
  expect(response.status).toBe(403);
});
