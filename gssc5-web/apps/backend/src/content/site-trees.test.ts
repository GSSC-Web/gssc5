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
  seedSiteTrees,
  type NestedSiteTree,
  type NestedSiteTreeNode,
} from "./site-trees";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);

  const plainHash = await Bun.password.hash("plain-member-st", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-st",
      primaryEmail: "plain.st@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550401",
      preferredContactMethod: "Email",
      homeLine1: "1 Plain",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Plain",
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
      username: "plain-member-st",
      password: "plain-member-st",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  await seedSiteTrees();
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
      body: body === undefined ? undefined : JSON.stringify(body),
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

function collectPaths(node: NestedSiteTreeNode): string[] {
  return [node.path, ...node.children.flatMap(collectPaths)];
}

// @relation(GSSC-BLLR-483, scope=range_start, role=Test)
test("GSSC-BLLR-483 Site Trees Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const publicTree = await prisma.siteTree.findUnique({ where: { frontend: "public" } });
  const membersTree = await prisma.siteTree.findUnique({ where: { frontend: "members" } });
  expect(publicTree).toMatchObject({ frontend: "public" });
  expect(membersTree).toMatchObject({ frontend: "members" });
  expect(typeof publicTree?.id).toBe("string");
  expect(typeof membersTree?.id).toBe("string");
  expect(publicTree?.id).not.toBe(membersTree?.id);

  let duplicateFailed = false;
  try {
    await prisma.siteTree.create({ data: { frontend: "public" } });
  } catch {
    duplicateFailed = true;
  }
  expect(duplicateFailed).toBe(true);
});
// @relation(GSSC-BLLR-483, scope=range_end, role=Test)

// @relation(GSSC-BLLR-484, scope=range_start, role=Test)
test("GSSC-BLLR-484 Site Tree Nodes Table", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tree = await prisma.siteTree.findUniqueOrThrow({ where: { frontend: "public" } });
  const root = await prisma.siteTreeNode.findFirstOrThrow({
    where: { treeId: tree.id, parentId: null },
  });
  const child = await prisma.siteTreeNode.create({
    data: {
      treeId: tree.id,
      parentId: root.id,
      label: `Stored Node ${Date.now()}`,
      path: "/stored-node",
      sortOrder: 99,
      sectionTag: "stored",
    },
  });
  const loaded = await prisma.siteTreeNode.findUnique({ where: { id: child.id } });
  expect(loaded).toEqual({
    id: child.id,
    treeId: tree.id,
    parentId: root.id,
    label: child.label,
    path: "/stored-node",
    sortOrder: 99,
    sectionTag: "stored",
  });
});
// @relation(GSSC-BLLR-484, scope=range_end, role=Test)

// @relation(GSSC-BLLR-467, scope=range_start, role=Test)
test("GSSC-BLLR-467 Site Tree Get", async () => {
  const publicRes = await getJson("/site-trees/public");
  expect(publicRes.status).toBe(200);
  const publicTree = publicRes.body as NestedSiteTree;
  expect(publicTree.frontend).toBe("public");
  expect(publicTree.root.label).toBe("Home");
  expect(publicTree.root.path).toBe("/");
  expect(publicTree.root.children.length).toBeGreaterThan(0);
  for (const child of publicTree.root.children) {
    expect(typeof child.label).toBe("string");
    expect(typeof child.path).toBe("string");
    expect(typeof child.sortOrder).toBe("number");
    expect(Array.isArray(child.children)).toBe(true);
  }

  const membersRes = await getJson("/site-trees/members");
  expect(membersRes.status).toBe(200);
  const membersTree = membersRes.body as NestedSiteTree;
  expect(membersTree.frontend).toBe("members");
  expect(membersTree.root.label).toBe("Dashboard");
  expect(membersTree.root.path).toBe("/");
  expect(membersTree.root.children.length).toBeGreaterThan(0);
});
// @relation(GSSC-BLLR-467, scope=range_end, role=Test)

// @relation(GSSC-BLLR-468, scope=range_start, role=Test)
test("GSSC-BLLR-468 Site Tree Get Unknown Frontend", async () => {
  const { status, body } = await getJson("/site-trees/admin");
  expect(status).toBe(422);
  expect(body).toBe("Invalid");
});
// @relation(GSSC-BLLR-468, scope=range_end, role=Test)

// @relation(GSSC-BLLR-469, scope=range_start, role=Test)
test("GSSC-BLLR-469 Site Tree Node Creation", async () => {
  const stamp = Date.now();
  const created = await sendJson(
    "POST",
    "/site-trees/public",
    {
      label: `Created ${stamp}`,
      path: `/created-${stamp}`,
      sortOrder: 50,
    },
    adminTok,
  );
  expect(created.status).toBe(201);
  expect(created.body).toMatchObject({
    label: `Created ${stamp}`,
    path: `/created-${stamp}`,
    sortOrder: 50,
  });
  const cuid = (created.body as { cuid: string }).cuid;
  expect(typeof cuid).toBe("string");

  const tree = (await getJson("/site-trees/public")).body as NestedSiteTree;
  const underRoot = tree.root.children.find((child) => child.cuid === cuid);
  expect(underRoot).toBeDefined();

  const nested = await sendJson(
    "POST",
    "/site-trees/public",
    {
      label: `Child ${stamp}`,
      path: `/child-${stamp}`,
      sortOrder: 0,
      parentId: cuid,
    },
    adminTok,
  );
  expect(nested.status).toBe(201);
  const after = (await getJson("/site-trees/public")).body as NestedSiteTree;
  const parent = after.root.children.find((child) => child.cuid === cuid);
  expect(parent?.children.some((child) => child.path === `/child-${stamp}`)).toBe(true);
});
// @relation(GSSC-BLLR-469, scope=range_end, role=Test)

// @relation(GSSC-BLLR-470, scope=range_start, role=Test)
test("GSSC-BLLR-470 Site Tree Node Creation Forbidden", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const before = await prisma.siteTreeNode.count();
  const { status } = await sendJson(
    "POST",
    "/site-trees/public",
    { label: "Nope", path: "/nope", sortOrder: 1 },
    memberTok,
  );
  expect(status).toBe(403);
  expect(await prisma.siteTreeNode.count()).toBe(before);

  const missing = await sendJson("POST", "/site-trees/public", {
    label: "Nope",
    path: "/nope2",
    sortOrder: 1,
  });
  expect(missing.status).toBe(403);
  expect(await prisma.siteTreeNode.count()).toBe(before);
});
// @relation(GSSC-BLLR-470, scope=range_end, role=Test)

// @relation(GSSC-BLLR-471, scope=range_start, role=Test)
test("GSSC-BLLR-471 Site Tree Node Modification", async () => {
  const stamp = Date.now();
  const created = await sendJson(
    "POST",
    "/site-trees/members",
    { label: `Patch Me ${stamp}`, path: `/patch-me-${stamp}`, sortOrder: 10 },
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;

  const patched = await sendJson(
    "PATCH",
    `/site-trees/members/nodes/${cuid}`,
    {
      label: `Patched ${stamp}`,
      path: `/patched-${stamp}`,
      sortOrder: 3,
      sectionTag: "meta",
    },
    adminTok,
  );
  expect(patched.status).toBe(200);
  expect(patched.body).toMatchObject({
    cuid,
    label: `Patched ${stamp}`,
    path: `/patched-${stamp}`,
    sortOrder: 3,
    sectionTag: "meta",
  });
});
// @relation(GSSC-BLLR-471, scope=range_end, role=Test)

// @relation(GSSC-BLLR-472, scope=range_start, role=Test)
test("GSSC-BLLR-472 Site Tree Node Modification Forbidden", async () => {
  const tree = (await getJson("/site-trees/public")).body as NestedSiteTree;
  const target = tree.root.children[0];
  expect(target).toBeDefined();
  const beforeLabel = target!.label;

  const { status } = await sendJson(
    "PATCH",
    `/site-trees/public/nodes/${target!.cuid}`,
    { label: "Hijacked" },
    memberTok,
  );
  expect(status).toBe(403);

  const after = (await getJson("/site-trees/public")).body as NestedSiteTree;
  const still = after.root.children.find((child) => child.cuid === target!.cuid);
  expect(still?.label).toBe(beforeLabel);
});
// @relation(GSSC-BLLR-472, scope=range_end, role=Test)

// @relation(GSSC-BLLR-473, scope=range_start, role=Test)
test("GSSC-BLLR-473 Site Tree Node Deletion", async () => {
  const stamp = Date.now();
  const parent = await sendJson(
    "POST",
    "/site-trees/public",
    { label: `Branch ${stamp}`, path: `/branch-${stamp}`, sortOrder: 80 },
    adminTok,
  );
  expect(parent.status).toBe(201);
  const parentId = (parent.body as { cuid: string }).cuid;

  const child = await sendJson(
    "POST",
    "/site-trees/public",
    {
      label: `Leaf ${stamp}`,
      path: `/leaf-${stamp}`,
      sortOrder: 0,
      parentId,
    },
    adminTok,
  );
  expect(child.status).toBe(201);
  const childId = (child.body as { cuid: string }).cuid;

  const deleted = await sendJson(
    "DELETE",
    `/site-trees/public/nodes/${parentId}`,
    undefined,
    adminTok,
  );
  expect(deleted.status).toBe(204);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  expect(await prisma.siteTreeNode.findUnique({ where: { id: parentId } })).toBeNull();
  expect(await prisma.siteTreeNode.findUnique({ where: { id: childId } })).toBeNull();
});
// @relation(GSSC-BLLR-473, scope=range_end, role=Test)

// @relation(GSSC-BLLR-474, scope=range_start, role=Test)
test("GSSC-BLLR-474 Site Tree Node Deletion Forbidden", async () => {
  const stamp = Date.now();
  const created = await sendJson(
    "POST",
    "/site-trees/public",
    { label: `Keep ${stamp}`, path: `/keep-${stamp}`, sortOrder: 81 },
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;

  const { status } = await sendJson(
    "DELETE",
    `/site-trees/public/nodes/${cuid}`,
    undefined,
    memberTok,
  );
  expect(status).toBe(403);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  expect(await prisma.siteTreeNode.findUnique({ where: { id: cuid } })).not.toBeNull();
});
// @relation(GSSC-BLLR-474, scope=range_end, role=Test)

// @relation(GSSC-BLLR-475, scope=range_start, role=Test)
test("GSSC-BLLR-475 Site Tree Seed", async () => {
  await seedSiteTrees();
  const publicTree = (await getJson("/site-trees/public")).body as NestedSiteTree;
  const membersTree = (await getJson("/site-trees/members")).body as NestedSiteTree;

  expect(publicTree.root.path).toBe("/");
  expect(collectPaths(publicTree.root)).toEqual(
    expect.arrayContaining([
      "/",
      "/membership",
      "/leadership",
      "/calendar",
      "/publications",
      "/research-tools",
      "/newsletters",
      "/sitemap",
      "/search",
    ]),
  );

  expect(membersTree.root.path).toBe("/");
  const membersPaths = collectPaths(membersTree.root);
  expect(membersPaths).toEqual(
    expect.arrayContaining([
      "/",
      "/directory",
      "/account",
      "/page-sections",
      "/newsletters",
      "/publications",
      "/research-tools",
      "/templates",
      "/site-trees",
      "/sitemap",
      "/search",
    ]),
  );
  // GSSC5-126: announcement/event editors are under Pages / PDE, not top-level seed tabs.
  expect(membersPaths).not.toContain("/announcements");
  expect(membersPaths).not.toContain("/events");
});

test("GSSC-BLLR-475 Site Tree Seed adds missing paths without wiping edits", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const publicTree = await prisma.siteTree.findUniqueOrThrow({
    where: { frontend: "public" },
    include: { nodes: true },
  });
  const root = publicTree.nodes.find((node) => node.parentId === null);
  expect(root).toBeDefined();

  const membership = publicTree.nodes.find((node) => node.path === "/membership");
  expect(membership).toBeDefined();
  const editedLabel = `Admin Membership ${Date.now()}`;
  await prisma.siteTreeNode.update({
    where: { id: membership!.id },
    data: { label: editedLabel, sortOrder: membership!.sortOrder },
  });

  // Simulate an older DB that never received later seed routes.
  await prisma.siteTreeNode.deleteMany({
    where: {
      treeId: publicTree.id,
      path: { in: ["/sitemap", "/search"] },
    },
  });

  const beforePaths = new Set(
    (
      await prisma.siteTreeNode.findMany({
        where: { treeId: publicTree.id },
        select: { path: true },
      })
    ).map((node) => node.path),
  );
  expect(beforePaths.has("/sitemap")).toBe(false);
  expect(beforePaths.has("/search")).toBe(false);
  expect(beforePaths.has("/membership")).toBe(true);

  await seedSiteTrees();

  const after = await prisma.siteTreeNode.findMany({
    where: { treeId: publicTree.id },
  });
  const afterPaths = after.map((node) => node.path);
  expect(afterPaths).toEqual(expect.arrayContaining(["/sitemap", "/search", "/membership"]));

  const membershipAfter = after.find((node) => node.id === membership!.id);
  expect(membershipAfter).toMatchObject({
    id: membership!.id,
    label: editedLabel,
    path: "/membership",
    sortOrder: membership!.sortOrder,
    parentId: membership!.parentId,
  });

  // Re-seed is idempotent: no duplicate paths for seed destinations.
  await seedSiteTrees();
  const sitemapCount = await prisma.siteTreeNode.count({
    where: { treeId: publicTree.id, path: "/sitemap" },
  });
  expect(sitemapCount).toBe(1);
});
// @relation(GSSC-BLLR-475, scope=range_end, role=Test)
