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
  const passwordHash = await Bun.password.hash("nl-editor-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "nl-editor",
      primaryEmail: "nl.editor@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
      isNewsletterEditor: true,
      firstName: "Nl",
      lastName: "Editor",
      primaryPhone: "2095550401",
      preferredContactMethod: "Email",
      homeLine1: "1 Nl",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Nl",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-nl-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-nl",
      primaryEmail: "plain.nl@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
      isNewsletterEditor: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550402",
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
      username: "plain-member-nl",
      password: "plain-nl-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  editorTok =
    (await establishedLogin(backend, {
      username: "nl-editor",
      password: "nl-editor-secret",
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

type NewsletterBody = {
  cuid: string;
  volume: number;
  number: number;
  month: number;
  year: number;
  filePath: string;
  keywords: string[];
};

function sampleFields(suffix: string) {
  return {
    volume: 5,
    number: 3,
    month: 11,
    year: 2026,
    filePath: `file-cuid-${suffix}`,
    keywords: ["geology", "newsletter"],
  };
}

// @relation(GSSC-BLLR-395, scope=range_start, role=Test)
test("GSSC-BLLR-395 Newsletters Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.newsletter.create({
    data: {
      volume: 1,
      number: 1,
      month: 1,
      year: 2020,
      filePath: "stored-file-cuid",
      keywords: JSON.stringify(["alpha"]),
    },
  });
  const loaded = await prisma.newsletter.findUnique({ where: { id: row.id } });
  expect(loaded).toEqual({
    id: row.id,
    volume: 1,
    number: 1,
    month: 1,
    year: 2020,
    filePath: "stored-file-cuid",
    keywords: JSON.stringify(["alpha"]),
  });
});
// @relation(GSSC-BLLR-395, scope=range_end, role=Test)

// @relation(GSSC-BLLR-387, scope=range_start, role=Test)
test("GSSC-BLLR-387 Newsletters List", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const older = await prisma.newsletter.create({
    data: {
      volume: 1,
      number: 1,
      month: 1,
      year: 2024,
      filePath: "older-file",
      keywords: JSON.stringify(["list"]),
    },
  });
  const newer = await prisma.newsletter.create({
    data: {
      volume: 2,
      number: 1,
      month: 6,
      year: 2025,
      filePath: "newer-file",
      keywords: JSON.stringify(["list"]),
    },
  });
  const { status, body } = await getJson("/newsletters");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const list = body as NewsletterBody[];
  const ids = list.map((item) => item.cuid);
  expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  const entry = list.find((item) => item.cuid === newer.id);
  expect(entry).toEqual({
    cuid: newer.id,
    volume: 2,
    number: 1,
    month: 6,
    year: 2025,
    filePath: "newer-file",
    keywords: ["list"],
  });
});
// @relation(GSSC-BLLR-387, scope=range_end, role=Test)

// @relation(GSSC-BLLR-396, scope=range_start, role=Test)
test("GSSC-BLLR-396 Newsletters Keyword Filter", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const match = await prisma.newsletter.create({
    data: {
      volume: 9,
      number: 1,
      month: 3,
      year: 2019,
      filePath: "kw-match",
      keywords: JSON.stringify(["FieldTrip", "volcano"]),
    },
  });
  await prisma.newsletter.create({
    data: {
      volume: 9,
      number: 2,
      month: 4,
      year: 2019,
      filePath: "kw-miss",
      keywords: JSON.stringify(["meeting"]),
    },
  });
  const { status, body } = await getJson("/newsletters?keyword=field");
  expect(status).toBe(200);
  const list = body as NewsletterBody[];
  expect(list.some((item) => item.cuid === match.id)).toBe(true);
  expect(list.every((item) => item.keywords.some((k) => k.toLowerCase().includes("field")))).toBe(
    true,
  );
});
// @relation(GSSC-BLLR-396, scope=range_end, role=Test)

// @relation(GSSC-BLLR-388, scope=range_start, role=Test)
test("GSSC-BLLR-388 Newsletter Creation", async () => {
  const fields = sampleFields(`create-${Date.now()}`);
  const { status, body } = await sendJson("POST", "/newsletters", fields, editorTok);
  expect(status).toBe(200);
  expect(body).toMatchObject(fields);
  expect(typeof (body as NewsletterBody).cuid).toBe("string");

  const asAdmin = await sendJson(
    "POST",
    "/newsletters",
    sampleFields(`admin-${Date.now()}`),
    adminTok,
  );
  expect(asAdmin.status).toBe(200);
});
// @relation(GSSC-BLLR-388, scope=range_end, role=Test)

// @relation(GSSC-BLLR-389, scope=range_start, role=Test)
test("GSSC-BLLR-389 Newsletter Creation Forbidden", async () => {
  const before = await getPrisma(loadConfig().DATABASE_URL).newsletter.count();
  const { status } = await sendJson(
    "POST",
    "/newsletters",
    sampleFields("forbidden"),
    memberTok,
  );
  expect(status).toBe(403);
  const after = await getPrisma(loadConfig().DATABASE_URL).newsletter.count();
  expect(after).toBe(before);

  // Publication editor alone is not newsletter editor authorization.
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const passwordHash = await Bun.password.hash("pub-only-nl-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "pub-only-nl",
      primaryEmail: "pub.only.nl@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: true,
      isNewsletterEditor: false,
      firstName: "Pub",
      lastName: "Only",
      primaryPhone: "2095550403",
      preferredContactMethod: "Email",
      homeLine1: "3 Pub",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "3 Pub",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });
  const pubOnlyTok =
    (await establishedLogin(backend, {
      username: "pub-only-nl",
      password: "pub-only-nl-secret",
    })) ?? "";
  expect(pubOnlyTok.length).toBeGreaterThan(0);
  const asPub = await sendJson(
    "POST",
    "/newsletters",
    sampleFields("pub-only"),
    pubOnlyTok,
  );
  expect(asPub.status).toBe(403);
  expect(await prisma.newsletter.count()).toBe(after);
});
// @relation(GSSC-BLLR-389, scope=range_end, role=Test)

// @relation(GSSC-BLLR-390, scope=range_start, role=Test)
test("GSSC-BLLR-390 Newsletter Get", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).newsletter.create({
    data: {
      volume: 3,
      number: 2,
      month: 8,
      year: 2022,
      filePath: "get-file",
      keywords: JSON.stringify(["get"]),
    },
  });
  const { status, body } = await getJson(`/newsletter/${row.id}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    volume: 3,
    number: 2,
    month: 8,
    year: 2022,
    filePath: "get-file",
    keywords: ["get"],
  });
});
// @relation(GSSC-BLLR-390, scope=range_end, role=Test)

// @relation(GSSC-BLLR-391, scope=range_start, role=Test)
test("GSSC-BLLR-391 Newsletter Modification", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).newsletter.create({
    data: {
      volume: 4,
      number: 1,
      month: 2,
      year: 2021,
      filePath: "old-file",
      keywords: JSON.stringify(["old"]),
    },
  });
  const { status, body } = await sendJson(
    "PATCH",
    `/newsletter/${row.id}`,
    { volume: 4, number: 2, filePath: "new-file", keywords: ["patched"] },
    editorTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    volume: 4,
    number: 2,
    month: 2,
    year: 2021,
    filePath: "new-file",
    keywords: ["patched"],
  });
});
// @relation(GSSC-BLLR-391, scope=range_end, role=Test)

// @relation(GSSC-BLLR-392, scope=range_start, role=Test)
test("GSSC-BLLR-392 Newsletter Modification Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).newsletter.create({
    data: {
      volume: 7,
      number: 1,
      month: 5,
      year: 2018,
      filePath: "locked-file",
      keywords: JSON.stringify(["locked"]),
    },
  });
  const { status } = await sendJson(
    "PATCH",
    `/newsletter/${row.id}`,
    { volume: 99 },
    memberTok,
  );
  expect(status).toBe(403);
  const unchanged = await getPrisma(loadConfig().DATABASE_URL).newsletter.findUnique({
    where: { id: row.id },
  });
  expect(unchanged?.volume).toBe(7);
});
// @relation(GSSC-BLLR-392, scope=range_end, role=Test)

// @relation(GSSC-BLLR-393, scope=range_start, role=Test)
test("GSSC-BLLR-393 Newsletter Deletion", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).newsletter.create({
    data: {
      volume: 8,
      number: 1,
      month: 9,
      year: 2017,
      filePath: "delete-file",
      keywords: JSON.stringify(["delete"]),
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/newsletter/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(editorTok) },
    }),
  );
  expect(response.status).toBe(204);
  const gone = await getPrisma(loadConfig().DATABASE_URL).newsletter.findUnique({
    where: { id: row.id },
  });
  expect(gone).toBeNull();
});
// @relation(GSSC-BLLR-393, scope=range_end, role=Test)

// @relation(GSSC-BLLR-394, scope=range_start, role=Test)
test("GSSC-BLLR-394 Newsletter Deletion Forbidden", async () => {
  const row = await getPrisma(loadConfig().DATABASE_URL).newsletter.create({
    data: {
      volume: 6,
      number: 1,
      month: 10,
      year: 2016,
      filePath: "keep-file",
      keywords: JSON.stringify(["keep"]),
    },
  });
  const response = await backend(
    new Request(`http://127.0.0.1/newsletter/${row.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(response.status).toBe(403);
  const kept = await getPrisma(loadConfig().DATABASE_URL).newsletter.findUnique({
    where: { id: row.id },
  });
  expect(kept).not.toBeNull();
});
// @relation(GSSC-BLLR-394, scope=range_end, role=Test)
