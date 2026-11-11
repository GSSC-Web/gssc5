// Content module checks. Each assertion is limited to that requirement's statement.
import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  postJsonResponse,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import { PERM_MEMBER, PERM_USER_MOD } from "./helpers";

const MEMBER_PERM = PERM_MEMBER;
const MOD_PERM = PERM_USER_MOD;

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let moderatorTok = "";
let publicTemplateId = "";
let memberCreateTemplateId = "";
let lockedTemplateId = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = db();
  const passwordHash = await Bun.password.hash("page-data-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "tpl-member",
      primaryEmail: "tpl.member@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550201",
      preferredContactMethod: "Email",
      homeLine1: "1 Mem",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Mem",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  await prisma.user.create({
    data: {
      username: "tpl-moderator",
      primaryEmail: "tpl.moderator@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: true,
      firstName: "Mod",
      lastName: "Erator",
      primaryPhone: "2095550202",
      preferredContactMethod: "Email",
      homeLine1: "2 Mod",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Mod",
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
      username: "tpl-member",
      password: "page-data-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  moderatorTok =
    (await establishedLogin(backend, {
      username: "tpl-moderator",
      password: "page-data-secret",
    })) ?? "";
  expect(moderatorTok.length).toBeGreaterThan(0);

  const publicTemplate = await prisma.contentTemplate.create({
    data: {
      name: "Tpl Public About",
      isPublic: true,
      tags: JSON.stringify(["about"]),
      createPerm: MEMBER_PERM,
      modifyPerm: MEMBER_PERM,
      deletePerm: MEMBER_PERM,
    },
  });
  publicTemplateId = publicTemplate.id;

  const memberCreate = await prisma.contentTemplate.create({
    data: {
      name: "Tpl Member Create",
      isPublic: false,
      tags: JSON.stringify(["members"]),
      createPerm: MEMBER_PERM,
      modifyPerm: MEMBER_PERM,
      deletePerm: 0,
    },
  });
  memberCreateTemplateId = memberCreate.id;

  const locked = await prisma.contentTemplate.create({
    data: {
      name: "Tpl Admin Only Create",
      isPublic: true,
      tags: JSON.stringify(["locked"]),
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });
  lockedTemplateId = locked.id;
}, 120_000);

function db() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function getJson(
  path: string,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      headers: token ? { cookie: cookieHeaderForToken(token) } : undefined,
    }),
  );
  const text = await response.text();
  let body: unknown = text;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

function parseBody(text: string): unknown {
  if (text.length === 0) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function sendJson(
  method: string,
  path: string,
  payload: unknown,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  if (method === "POST") {
    const response = await postJsonResponse(
      backend,
      path,
      payload,
      token ? { cookie: cookieHeaderForToken(token) } : undefined,
    );
    return { status: response.status, body: parseBody(response.body) };
  }
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: cookieHeaderForToken(token) } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );
  return { status: response.status, body: parseBody(await response.text()) };
}

async function seedSection(data: {
  header?: string | null;
  body: string;
  tags?: string[];
  index?: number;
  isPublic: boolean;
  resources?: string[];
  createPerm?: number;
  modifyPerm?: number;
  deletePerm?: number;
  templateId?: string;
}) {
  return db().pageDataEntry.create({
    data: {
      datatype: "section",
      header: data.header ?? null,
      body: data.body,
      tags: JSON.stringify(data.tags ?? []),
      resources: JSON.stringify(data.resources ?? []),
      index: data.index ?? 0,
      isPublic: data.isPublic,
      createPerm: data.createPerm ?? 0,
      modifyPerm: data.modifyPerm ?? 0,
      deletePerm: data.deletePerm ?? 0,
      templateId: data.templateId,
    },
  });
}

// @relation(GSSC-BLLR-333, scope=range_start, role=Test)
test("GSSC-BLLR-333 Template List", async () => {
  const { status, body } = await getJson("/templates", memberTok);
  expect(status).toBe(200);
  const list = body as Array<{ cuid: string; name: string }>;
  expect(list.some((entry) => entry.cuid === publicTemplateId && entry.name === "Tpl Public About")).toBe(
    true,
  );
  for (const entry of list) {
    expect(Object.keys(entry).sort()).toEqual(["cuid", "name"]);
  }
});
// @relation(GSSC-BLLR-333, scope=range_end, role=Test)

// @relation(GSSC-BLLR-334, scope=range_start, role=Test)
test("GSSC-BLLR-334 Template Get", async () => {
  const { status, body } = await getJson(`/templates/${publicTemplateId}`, adminTok);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: publicTemplateId,
    name: "Tpl Public About",
    isPublic: true,
    tags: ["about"],
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: MEMBER_PERM,
  });
});
// @relation(GSSC-BLLR-334, scope=range_end, role=Test)

// @relation(GSSC-BLLR-335, scope=range_start, role=Test)
test("GSSC-BLLR-335 Template Create", async () => {
  const { status, body } = await sendJson(
    "POST",
    "/templates",
    { name: "New Template", isPublic: false, tags: ["n"] },
    adminTok,
  );
  expect(status).toBe(201);
  expect(body).toEqual({
    cuid: expect.any(String),
    name: "New Template",
    isPublic: false,
    tags: ["n"],
    createPerm: 0,
    modifyPerm: 0,
    deletePerm: 0,
  });
});
// @relation(GSSC-BLLR-335, scope=range_end, role=Test)

// @relation(GSSC-BLLR-336, scope=range_start, role=Test)
test("GSSC-BLLR-336 Template Modify", async () => {
  const created = await db().contentTemplate.create({
    data: {
      name: "Mutable",
      isPublic: true,
      tags: JSON.stringify(["keep"]),
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });

  const { status, body } = await sendJson(
    "PATCH",
    `/templates/${created.id}`,
    { isPublic: false, createPerm: MOD_PERM, modifyPerm: MEMBER_PERM },
    adminTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: created.id,
    name: "Mutable",
    isPublic: false,
    tags: ["keep"],
    createPerm: MOD_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: 0,
  });
});
// @relation(GSSC-BLLR-336, scope=range_end, role=Test)

// @relation(GSSC-BLLR-337, scope=range_start, role=Test)
test("GSSC-BLLR-337 Template Delete", async () => {
  const created = await db().contentTemplate.create({
    data: { name: "Disposable", isPublic: true, tags: "[]" },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/templates/${created.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(adminTok) },
    }),
  );
  expect(response.status).toBe(204);
  expect(await db().contentTemplate.findUnique({ where: { id: created.id } })).toBeNull();
});
// @relation(GSSC-BLLR-337, scope=range_end, role=Test)

// @relation(GSSC-BLLR-340, scope=range_start, role=Test)
test("GSSC-BLLR-340 Template Table", async () => {
  const row = await db().contentTemplate.create({
    data: {
      name: "Stored",
      isPublic: false,
      tags: JSON.stringify(["x"]),
      createPerm: 1,
      modifyPerm: 2,
      deletePerm: 3,
    },
  });
  const stored = await db().contentTemplate.findUnique({ where: { id: row.id } });
  expect(stored).toMatchObject({
    name: "Stored",
    isPublic: false,
    tags: JSON.stringify(["x"]),
    createPerm: 1,
    modifyPerm: 2,
    deletePerm: 3,
  });
});
// @relation(GSSC-BLLR-340, scope=range_end, role=Test)
