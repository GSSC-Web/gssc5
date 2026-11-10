// Page data /sections and /templates. Each assertion is limited to that requirement's statement.
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

const MEMBER_PERM = 0o1;
const MOD_PERM = 0o2;

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
      username: "pd-member",
      primaryEmail: "pd.member@example.com",
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
      username: "pd-moderator",
      primaryEmail: "pd.moderator@example.com",
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
      username: "pd-member",
      password: "page-data-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  moderatorTok =
    (await establishedLogin(backend, {
      username: "pd-moderator",
      password: "page-data-secret",
    })) ?? "";
  expect(moderatorTok.length).toBeGreaterThan(0);

  const publicTemplate = await prisma.pageTemplate.create({
    data: {
      name: "Public About",
      isPublic: true,
      tags: JSON.stringify(["about"]),
      createPerm: MEMBER_PERM,
      modifyPerm: MEMBER_PERM,
      deletePerm: MEMBER_PERM,
    },
  });
  publicTemplateId = publicTemplate.id;

  const memberCreate = await prisma.pageTemplate.create({
    data: {
      name: "Member Create",
      isPublic: false,
      tags: JSON.stringify(["members"]),
      createPerm: MEMBER_PERM,
      modifyPerm: MEMBER_PERM,
      deletePerm: 0,
    },
  });
  memberCreateTemplateId = memberCreate.id;

  const locked = await prisma.pageTemplate.create({
    data: {
      name: "Admin Only Create",
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

test("GSSC-BLLR-320 Public Section List", async () => {
  await seedSection({ body: "public body", isPublic: true, header: "Pub", index: 1 });
  await seedSection({ body: "private body", isPublic: false, header: "Priv", index: 2 });

  const { status, body } = await getJson("/sections");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const list = body as Array<{ header: string | null; body: string }>;
  expect(list.some((entry) => entry.body === "public body")).toBe(true);
  expect(list.some((entry) => entry.body === "private body")).toBe(false);
});

test("GSSC-BLLR-321 Authenticated Section List", async () => {
  await seedSection({ body: "auth-public", isPublic: true, index: 10 });
  await seedSection({ body: "auth-private", isPublic: false, index: 11 });

  const { status, body } = await getJson("/sections", memberTok);
  expect(status).toBe(200);
  const list = body as Array<{ body: string }>;
  expect(list.some((entry) => entry.body === "auth-public")).toBe(true);
  expect(list.some((entry) => entry.body === "auth-private")).toBe(true);
});

test("GSSC-BLLR-322 Section List Entry Fields", async () => {
  const row = await seedSection({
    header: "Fields",
    body: "field body",
    tags: ["t1"],
    index: 42,
    isPublic: true,
  });

  const { status, body } = await getJson("/sections");
  expect(status).toBe(200);
  const entry = (body as Array<Record<string, unknown>>).find((item) => item.cuid === row.id);
  expect(entry).toEqual({
    cuid: row.id,
    header: "Fields",
    body: "field body",
    tags: ["t1"],
    index: 42,
  });
});

test("GSSC-BLLR-323 Section List Index Order", async () => {
  const stamp = `order-${Date.now()}`;
  await seedSection({ body: `${stamp}-c`, isPublic: true, index: 30, tags: [stamp] });
  await seedSection({ body: `${stamp}-a`, isPublic: true, index: 10, tags: [stamp] });
  await seedSection({ body: `${stamp}-b`, isPublic: true, index: 20, tags: [stamp] });

  const { status, body } = await getJson(`/sections?tag=${encodeURIComponent(stamp)}`);
  expect(status).toBe(200);
  const list = body as Array<{ body: string; index: number }>;
  expect(list.map((entry) => entry.body)).toEqual([`${stamp}-a`, `${stamp}-b`, `${stamp}-c`]);
  expect(list.map((entry) => entry.index)).toEqual([10, 20, 30]);
});

test("GSSC-BLLR-324 Public Section Get", async () => {
  const row = await seedSection({
    header: "Get Pub",
    body: "get public",
    resources: ["r1"],
    tags: ["g"],
    index: 5,
    isPublic: true,
  });

  const { status, body } = await getJson(`/sections/${row.id}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "Get Pub",
    body: "get public",
    resources: ["r1"],
    tags: ["g"],
    index: 5,
  });
});

test("GSSC-BLLR-325 Public Section Get Rejects Private", async () => {
  const row = await seedSection({ body: "hidden", isPublic: false });
  const { status } = await getJson(`/sections/${row.id}`);
  expect(status).toBe(403);
});

test("GSSC-BLLR-326 Authenticated Section Get", async () => {
  const row = await seedSection({
    header: "Mem",
    body: "member get",
    resources: ["x"],
    tags: ["m"],
    index: 7,
    isPublic: false,
  });

  const { status, body } = await getJson(`/sections/${row.id}`, memberTok);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "Mem",
    body: "member get",
    resources: ["x"],
    tags: ["m"],
    index: 7,
  });
});

test("GSSC-BLLR-327 Section List Filters", async () => {
  const stamp = `filt-${Date.now()}`;
  const row = await seedSection({
    header: `Alpha ${stamp}`,
    body: `Bravo body ${stamp}`,
    tags: [`tag-${stamp}`],
    isPublic: true,
    index: 1,
  });
  await seedSection({
    header: "Other",
    body: "zzz",
    tags: ["nofilter"],
    isPublic: true,
    index: 2,
  });

  const byHeader = await getJson(`/sections?header=${encodeURIComponent(stamp)}`);
  expect(byHeader.status).toBe(200);
  expect((byHeader.body as Array<{ cuid: string }>).map((e) => e.cuid)).toContain(row.id);

  const byBody = await getJson(`/sections?body=${encodeURIComponent(`bravo body ${stamp}`)}`);
  expect((byBody.body as Array<{ cuid: string }>).map((e) => e.cuid)).toContain(row.id);

  const byTag = await getJson(`/sections?tag=${encodeURIComponent(`TAG-${stamp}`)}`);
  expect((byTag.body as Array<{ cuid: string }>).map((e) => e.cuid)).toContain(row.id);

  const byCuid = await getJson(`/sections?cuid=${encodeURIComponent(row.id)}`);
  expect(byCuid.body).toEqual([
    expect.objectContaining({ cuid: row.id }),
  ]);

  const byContent = await getJson(`/sections?content=${encodeURIComponent(`alpha ${stamp}`)}`);
  expect((byContent.body as Array<{ cuid: string }>).map((e) => e.cuid)).toContain(row.id);
});

test("GSSC-BLLR-328 Section Creation", async () => {
  const { status, body } = await sendJson(
    "POST",
    "/sections",
    {
      body: "created section",
      templateId: publicTemplateId,
      header: "Created",
      resources: ["res-a"],
      tags: ["extra"],
      index: 99,
    },
    memberTok,
  );
  expect(status).toBe(201);
  const created = body as {
    cuid: string;
    header: string;
    body: string;
    resources: string[];
    tags: string[];
    index: number;
  };
  expect(created.header).toBe("Created");
  expect(created.body).toBe("created section");
  expect(created.resources).toEqual(["res-a"]);
  expect(created.tags).toEqual(expect.arrayContaining(["about", "extra"]));
  expect(created.index).toBe(99);

  const stored = await db().pageDataEntry.findUnique({ where: { id: created.cuid } });
  expect(stored?.isPublic).toBe(true);
  expect(stored?.createPerm).toBe(MEMBER_PERM);
  expect(stored?.modifyPerm).toBe(MEMBER_PERM);
  expect(stored?.deletePerm).toBe(MEMBER_PERM);
  expect(stored?.templateId).toBe(publicTemplateId);
});

test("GSSC-BLLR-329 Section Creation Forbidden", async () => {
  const before = await db().pageDataEntry.count({ where: { datatype: "section" } });
  const { status } = await sendJson(
    "POST",
    "/sections",
    { body: "nope", templateId: lockedTemplateId },
    memberTok,
  );
  expect(status).toBe(403);
  const after = await db().pageDataEntry.count({ where: { datatype: "section" } });
  expect(after).toBe(before);
});

test("GSSC-BLLR-330 Section Modification", async () => {
  const row = await seedSection({
    body: "before",
    isPublic: true,
    modifyPerm: MEMBER_PERM,
    index: 1,
  });

  const { status, body } = await sendJson(
    "PATCH",
    `/sections/${row.id}`,
    {
      header: "After",
      body: "after body",
      resources: ["r2"],
      tags: ["new"],
      index: 8,
    },
    memberTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "After",
    body: "after body",
    resources: ["r2"],
    tags: ["new"],
    index: 8,
  });
});

test("GSSC-BLLR-331 Section IsPublic Modification", async () => {
  const allowed = await seedSection({
    body: "flip",
    isPublic: true,
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: MEMBER_PERM,
  });
  const denied = await seedSection({
    body: "noflip",
    isPublic: true,
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: 0,
  });

  const ok = await sendJson("PATCH", `/sections/${allowed.id}`, { isPublic: false }, memberTok);
  expect(ok.status).toBe(200);
  expect((ok.body as { /* isPublic not in detail */ cuid: string }).cuid).toBe(allowed.id);
  expect((await db().pageDataEntry.findUnique({ where: { id: allowed.id } }))?.isPublic).toBe(false);

  const bad = await sendJson("PATCH", `/sections/${denied.id}`, { isPublic: false }, memberTok);
  expect(bad.status).toBe(403);
});

test("GSSC-BLLR-332 Administrator Section Permissions", async () => {
  const { status, body } = await sendJson(
    "POST",
    "/sections",
    { body: "admin created", templateId: lockedTemplateId, index: 1 },
    adminTok,
  );
  expect(status).toBe(201);
  const cuid = (body as { cuid: string }).cuid;

  const patched = await sendJson(
    "PATCH",
    `/sections/${cuid}`,
    { body: "admin modified", isPublic: false },
    adminTok,
  );
  expect(patched.status).toBe(200);
});

test("GSSC-BLLR-333 Template List", async () => {
  const { status, body } = await getJson("/templates", memberTok);
  expect(status).toBe(200);
  const list = body as Array<{ cuid: string; name: string }>;
  expect(list.some((entry) => entry.cuid === publicTemplateId && entry.name === "Public About")).toBe(
    true,
  );
  for (const entry of list) {
    expect(Object.keys(entry).sort()).toEqual(["cuid", "name"]);
  }
});

test("GSSC-BLLR-334 Template Get", async () => {
  const { status, body } = await getJson(`/templates/${publicTemplateId}`, adminTok);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: publicTemplateId,
    name: "Public About",
    isPublic: true,
    tags: ["about"],
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: MEMBER_PERM,
  });
});

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

test("GSSC-BLLR-336 Template Modify", async () => {
  const created = await db().pageTemplate.create({
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

test("GSSC-BLLR-337 Template Delete", async () => {
  const created = await db().pageTemplate.create({
    data: { name: "Disposable", isPublic: true, tags: "[]" },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/templates/${created.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(adminTok) },
    }),
  );
  expect(response.status).toBe(204);
  expect(await db().pageTemplate.findUnique({ where: { id: created.id } })).toBeNull();
});

test("GSSC-BLLR-338 Page Entry Table", async () => {
  const template = await db().pageTemplate.findUnique({ where: { id: memberCreateTemplateId } });
  expect(template).toBeTruthy();

  const section = await db().pageDataEntry.create({
    data: {
      datatype: "section",
      header: "H",
      body: "B",
      resources: JSON.stringify(["r"]),
      tags: JSON.stringify(["t"]),
      index: 3,
      isPublic: false,
      createPerm: 1,
      modifyPerm: 2,
      deletePerm: 3,
      templateId: memberCreateTemplateId,
    },
  });
  const announcement = await db().pageDataEntry.create({
    data: {
      datatype: "announcement",
      body: "announce",
      tags: JSON.stringify(["a"]),
      index: 1,
      isPublic: true,
    },
  });
  const event = await db().pageDataEntry.create({
    data: {
      datatype: "event",
      body: "event",
      tags: JSON.stringify(["e"]),
      index: 2,
      isPublic: true,
    },
  });

  const storedSection = await db().pageDataEntry.findUnique({ where: { id: section.id } });
  expect(storedSection).toMatchObject({
    datatype: "section",
    header: "H",
    body: "B",
    resources: JSON.stringify(["r"]),
    tags: JSON.stringify(["t"]),
    index: 3,
    isPublic: false,
    createPerm: 1,
    modifyPerm: 2,
    deletePerm: 3,
    templateId: memberCreateTemplateId,
  });
  expect(announcement.datatype).toBe("announcement");
  expect(event.datatype).toBe("event");
});

test("GSSC-BLLR-339 Page Entry Index", async () => {
  const a = await db().pageDataEntry.create({
    data: { datatype: "announcement", body: "a", index: 15, isPublic: true },
  });
  const e = await db().pageDataEntry.create({
    data: { datatype: "event", body: "e", index: 16, isPublic: true },
  });
  const s = await db().pageDataEntry.create({
    data: { datatype: "section", body: "s", index: 17, isPublic: true },
  });
  expect((await db().pageDataEntry.findUnique({ where: { id: a.id } }))?.index).toBe(15);
  expect((await db().pageDataEntry.findUnique({ where: { id: e.id } }))?.index).toBe(16);
  expect((await db().pageDataEntry.findUnique({ where: { id: s.id } }))?.index).toBe(17);
});

test("GSSC-BLLR-340 Template Table", async () => {
  const row = await db().pageTemplate.create({
    data: {
      name: "Stored",
      isPublic: false,
      tags: JSON.stringify(["x"]),
      createPerm: 1,
      modifyPerm: 2,
      deletePerm: 3,
    },
  });
  const stored = await db().pageTemplate.findUnique({ where: { id: row.id } });
  expect(stored).toMatchObject({
    name: "Stored",
    isPublic: false,
    tags: JSON.stringify(["x"]),
    createPerm: 1,
    modifyPerm: 2,
    deletePerm: 3,
  });
});
