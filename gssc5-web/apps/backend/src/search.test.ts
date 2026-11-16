import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "./config";
import { getPrisma } from "./db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  type BackendFetch,
  type InProcessApp,
} from "./test-harness";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";

type SearchHit = {
  title: string;
  snippet: string;
  href: string;
  kind: string;
};

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const plainHash = await Bun.password.hash("search-member-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "search-member",
      primaryEmail: "search.member@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Searchable",
      middleName: "Q",
      lastName: "Directory",
      primaryPhone: "2095550401",
      preferredContactMethod: "Email",
      homeLine1: "1 Search",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Search",
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
      username: "search-member",
      password: "search-member-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);
}, 120_000);

async function getSearch(
  query: Record<string, string>,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const params = new URLSearchParams(query);
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(
    new Request(`http://127.0.0.1/search?${params.toString()}`, { headers }),
  );
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: response.status, body };
}

function asHits(body: unknown): SearchHit[] {
  expect(Array.isArray(body)).toBe(true);
  return body as SearchHit[];
}

// @relation(GSSC-BLLR-476, scope=range_start, role=Test)
test("GSSC-BLLR-476 Site Search Query Parameters", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const stamp = `param-${Date.now()}`;
  await prisma.publication.create({
    data: {
      title: `Param Pub ${stamp}`,
      referenceLink: "https://example.org/param-pub",
      description: "param searchable",
    },
  });

  const ok = await getSearch({
    q: stamp,
    frontend: "public",
    limit: "5",
    kind: "publication",
  });
  expect(ok.status).toBe(200);
  expect(asHits(ok.body).every((hit) => hit.kind === "publication")).toBe(true);

  const missingFrontend = await getSearch({ q: stamp });
  expect(missingFrontend.status).toBe(422);
  expect(missingFrontend.body).toBe("Invalid");

  const unknownKey = await getSearch({
    q: stamp,
    frontend: "public",
    bogus: "1",
  });
  expect(unknownKey.status).toBe(422);
  expect(unknownKey.body).toBe("Invalid");

  const badKind = await getSearch({
    q: stamp,
    frontend: "public",
    kind: "not-a-kind",
  });
  expect(badKind.status).toBe(422);
  expect(badKind.body).toBe("Invalid");
});
// @relation(GSSC-BLLR-476, scope=range_end, role=Test)

// @relation(GSSC-BLLR-477, scope=range_start, role=Test)
test("GSSC-BLLR-477 Public Site Search Without Login", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const stamp = `pub-nologin-${Date.now()}`;
  await prisma.researchTool.create({
    data: {
      title: `Public Tool ${stamp}`,
      referenceLink: "https://example.org/public-tool",
    },
  });

  const result = await getSearch({ q: stamp, frontend: "public" });
  expect(result.status).toBe(200);
  const hits = asHits(result.body);
  expect(hits.some((hit) => hit.kind === "research-tool" && hit.title.includes(stamp))).toBe(
    true,
  );
});
// @relation(GSSC-BLLR-477, scope=range_end, role=Test)

// @relation(GSSC-BLLR-478, scope=range_start, role=Test)
test("GSSC-BLLR-478 Members Site Search Login Required", async () => {
  const missing = await getSearch({ q: "directory", frontend: "members" });
  expect(missing.status).toBe(403);
  expect(missing.body).toBe("Forbidden");

  const unknown = await getSearch(
    { q: "directory", frontend: "members" },
    "not-a-real-login-token",
  );
  expect(unknown.status).toBe(403);
  expect(unknown.body).toBe("Forbidden");

  const emptyUnauthed = await getSearch({ q: "", frontend: "members" });
  expect(emptyUnauthed.status).toBe(403);
  expect(emptyUnauthed.body).toBe("Forbidden");
});
// @relation(GSSC-BLLR-478, scope=range_end, role=Test)

// @relation(GSSC-BLLR-479, scope=range_start, role=Test)
test("GSSC-BLLR-479 Site Search Result Projection", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const stamp = `proj-${Date.now()}`;
  await prisma.publication.create({
    data: {
      title: `Projection ${stamp}`,
      referenceLink: "https://example.org/projection",
      description: `snippet body ${stamp}`,
    },
  });

  const result = await getSearch({
    q: stamp,
    frontend: "public",
    kind: "publication",
  });
  expect(result.status).toBe(200);
  const hits = asHits(result.body);
  expect(hits.length).toBeGreaterThan(0);
  for (const hit of hits) {
    expect(hit).toHaveProperty("title");
    expect(hit).toHaveProperty("snippet");
    expect(hit).toHaveProperty("href");
    expect(hit).toHaveProperty("kind");
    expect(typeof hit.title).toBe("string");
    expect(typeof hit.snippet).toBe("string");
    expect(typeof hit.href).toBe("string");
    expect(typeof hit.kind).toBe("string");
  }
});
// @relation(GSSC-BLLR-479, scope=range_end, role=Test)

// @relation(GSSC-BLLR-480, scope=range_start, role=Test)
test("GSSC-BLLR-480 Site Search Empty Query", async () => {
  const empty = await getSearch({ q: "", frontend: "public" });
  expect(empty.status).toBe(200);
  expect(asHits(empty.body)).toEqual([]);

  const whitespace = await getSearch({ q: "   ", frontend: "public" });
  expect(whitespace.status).toBe(200);
  expect(asHits(whitespace.body)).toEqual([]);

  const membersEmpty = await getSearch({ q: "", frontend: "members" }, memberTok);
  expect(membersEmpty.status).toBe(200);
  expect(asHits(membersEmpty.body)).toEqual([]);
});
// @relation(GSSC-BLLR-480, scope=range_end, role=Test)

// @relation(GSSC-BLLR-481, scope=range_start, role=Test)
test("GSSC-BLLR-481 Public Site Search Corpus Match", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const stamp = `corp-${Date.now()}`;

  await prisma.pageDataEntry.create({
    data: {
      datatype: "section",
      header: `Public Section ${stamp}`,
      body: `section body ${stamp}`,
      resources: "[]",
      tags: "[]",
      index: 9001,
      isPublic: true,
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });
  await prisma.pageDataEntry.create({
    data: {
      datatype: "section",
      header: `Hidden Section ${stamp}`,
      body: `hidden body ${stamp}`,
      resources: "[]",
      tags: "[]",
      index: 9002,
      isPublic: false,
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });
  await prisma.pageDataEntry.create({
    data: {
      datatype: "announcement",
      header: `Public Ann ${stamp}`,
      body: `ann body ${stamp}`,
      resources: "[]",
      tags: "[]",
      index: 9003,
      isPublic: true,
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });
  const eventPage = await prisma.pageDataEntry.create({
    data: {
      datatype: "event",
      header: `Event Header ${stamp}`,
      body: `event details ${stamp}`,
      resources: "[]",
      tags: "[]",
      index: 9004,
      isPublic: true,
      createPerm: 2,
      modifyPerm: 2,
      deletePerm: 2,
      startMonth: 6,
      startDay: 15,
      startYear: 2030,
      endMonth: 6,
      endDay: 15,
      endYear: 2030,
    },
  });
  await prisma.event.create({
    data: {
      name: `Public Event ${stamp}`,
      month: 6,
      day: 15,
      year: 2030,
      announcementStartMonth: 5,
      announcementStartDay: 1,
      announcementStartYear: 2030,
      time: "10:00",
      duration: "1h",
      location: `Hall ${stamp}`,
      isPublic: true,
      createPerm: 2,
      modifyPerm: 2,
      deletePerm: 2,
      pageDataId: eventPage.id,
    },
  });
  await prisma.publication.create({
    data: {
      title: `Pub ${stamp}`,
      referenceLink: "https://example.org/corp-pub",
      description: "catalog pub",
    },
  });
  await prisma.researchTool.create({
    data: { title: `Tool ${stamp}`, referenceLink: "https://example.org/corp-tool" },
  });
  await prisma.newsletter.create({
    data: {
      volume: 99,
      number: 1,
      month: 11,
      year: 2030,
      filePath: `file-${stamp}`,
      keywords: JSON.stringify([`kw-${stamp}`]),
    },
  });

  const tree = await getSearch({ q: "membership", frontend: "public", kind: "site-tree" });
  expect(tree.status).toBe(200);
  expect(
    asHits(tree.body).some(
      (hit) => hit.kind === "site-tree" && includesInsensitive(hit.title, "membership"),
    ),
  ).toBe(true);

  const result = await getSearch({ q: stamp, frontend: "public", limit: "50" });
  expect(result.status).toBe(200);
  const hits = asHits(result.body);
  const kinds = new Set(hits.map((hit) => hit.kind));
  expect(kinds.has("section")).toBe(true);
  expect(kinds.has("announcement")).toBe(true);
  expect(kinds.has("event")).toBe(true);
  expect(kinds.has("publication")).toBe(true);
  expect(kinds.has("research-tool")).toBe(true);
  expect(kinds.has("newsletter")).toBe(true);
  expect(hits.some((hit) => hit.title.includes("Hidden Section"))).toBe(false);

  const caseInsensitive = await getSearch({
    q: stamp.toUpperCase(),
    frontend: "public",
    kind: "publication",
  });
  expect(asHits(caseInsensitive.body).some((hit) => hit.title.includes(stamp))).toBe(true);
});
// @relation(GSSC-BLLR-481, scope=range_end, role=Test)

// @relation(GSSC-BLLR-482, scope=range_start, role=Test)
test("GSSC-BLLR-482 Members Site Search Corpus Match", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const stamp = `mem-${Date.now()}`;

  await prisma.pageDataEntry.create({
    data: {
      datatype: "section",
      header: `Members Only Section ${stamp}`,
      body: `private section ${stamp}`,
      resources: "[]",
      tags: "[]",
      index: 9101,
      isPublic: false,
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });

  const result = await getSearch(
    { q: stamp, frontend: "members", limit: "50" },
    memberTok,
  );
  expect(result.status).toBe(200);
  const hits = asHits(result.body);
  expect(hits.some((hit) => hit.kind === "section" && hit.title.includes(stamp))).toBe(true);

  const directory = await getSearch(
    { q: "Searchable", frontend: "members", kind: "directory" },
    memberTok,
  );
  expect(directory.status).toBe(200);
  expect(
    asHits(directory.body).some(
      (hit) => hit.kind === "directory" && includesInsensitive(hit.title, "Searchable"),
    ),
  ).toBe(true);

  const tree = await getSearch(
    { q: "directory", frontend: "members", kind: "site-tree" },
    memberTok,
  );
  expect(tree.status).toBe(200);
  expect(asHits(tree.body).some((hit) => hit.kind === "site-tree")).toBe(true);

  const limited = await getSearch(
    { q: "a", frontend: "members", limit: "1" },
    memberTok,
  );
  expect(limited.status).toBe(200);
  expect(asHits(limited.body).length).toBeLessThanOrEqual(1);
});
// @relation(GSSC-BLLR-482, scope=range_end, role=Test)

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
