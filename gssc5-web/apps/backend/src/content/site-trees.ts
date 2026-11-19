import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  SiteTreeNodePlain,
  SiteTreeNodePlainInputCreate,
} from "../generated/prismabox/SiteTreeNode";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "../user/login-session";

export const SITE_TREE_FRONTENDS = ["public", "members"] as const;
export type SiteTreeFrontend = (typeof SITE_TREE_FRONTENDS)[number];

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { isAdmin: boolean } };

type FlatNode = {
  id: string;
  treeId: string;
  parentId: string | null;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
};

export type NestedSiteTreeNode = {
  cuid: string;
  label: string;
  path: string;
  sortOrder: number;
  sectionTag: string | null;
  children: NestedSiteTreeNode[];
};

export type NestedSiteTree = {
  frontend: SiteTreeFrontend;
  root: NestedSiteTreeNode;
};

const NestedSiteTreeNodeSchema: ReturnType<typeof t.Recursive> = t.Recursive(
  (This) =>
    t.Object({
      cuid: SiteTreeNodePlain.properties.id,
      label: SiteTreeNodePlain.properties.label,
      path: SiteTreeNodePlain.properties.path,
      sortOrder: SiteTreeNodePlain.properties.sortOrder,
      sectionTag: SiteTreeNodePlain.properties.sectionTag,
      children: t.Array(This),
    }),
);

const NestedSiteTreeSchema = t.Object({
  frontend: t.Union([t.Literal("public"), t.Literal("members")]),
  root: NestedSiteTreeNodeSchema,
});

/**
 * Wire entry: Prismabox scalars with intentional `cuid` (not raw `id`).
 * Do not drop in raw `SiteTreeNodePlain` (exposes `id` + relations).
 */
const SiteTreeNodeEntry = t.Object({
  cuid: SiteTreeNodePlain.properties.id,
  treeId: SiteTreeNodePlain.properties.treeId,
  parentId: SiteTreeNodePlain.properties.parentId,
  label: SiteTreeNodePlain.properties.label,
  path: SiteTreeNodePlain.properties.path,
  sortOrder: SiteTreeNodePlain.properties.sortOrder,
  sectionTag: SiteTreeNodePlain.properties.sectionTag,
});

/**
 * Create body from Prismabox create input + optional parent. `additionalProperties: true`
 * keeps ignored extras so auth can return 403 before a schema reject surfaces as 422.
 */
const CreateNodeBody = t.Object(
  {
    label: SiteTreeNodePlainInputCreate.properties.label,
    path: SiteTreeNodePlainInputCreate.properties.path,
    sortOrder: SiteTreeNodePlainInputCreate.properties.sortOrder,
    parentId: t.Optional(SiteTreeNodePlain.properties.parentId),
    sectionTag: t.Optional(SiteTreeNodePlain.properties.sectionTag),
  },
  { additionalProperties: true },
);

/** Patch body: same scalars, all optional; handler rejects empty patches. */
const UpdateNodeBody = t.Object(
  {
    label: t.Optional(SiteTreeNodePlain.properties.label),
    path: t.Optional(SiteTreeNodePlain.properties.path),
    sortOrder: t.Optional(SiteTreeNodePlain.properties.sortOrder),
    parentId: t.Optional(SiteTreeNodePlain.properties.parentId),
    sectionTag: t.Optional(SiteTreeNodePlain.properties.sectionTag),
  },
  { additionalProperties: true },
);

/** Public routes at seed time (apps/public app.routes). */
const PUBLIC_SEED_CHILDREN: Array<{ label: string; path: string }> = [
  { label: "Membership", path: "/membership" },
  { label: "Leadership", path: "/leadership" },
  { label: "Calendar", path: "/calendar" },
  { label: "Publications", path: "/publications" },
  { label: "Research Tools", path: "/research-tools" },
  { label: "Newsletters", path: "/newsletters" },
  { label: "Sitemap", path: "/sitemap" },
  { label: "Search", path: "/search" },
];

/**
 * Members header + editor destinations at seed time
 * (header nav from tree + authenticated editor/page routes).
 */
// @relation(GSSC-MLLR-591, scope=range_start, role=Implementation)
const MEMBERS_SEED_CHILDREN: Array<{ label: string; path: string }> = [
  { label: "Directory", path: "/directory" },
  { label: "Account", path: "/account" },
  // Announcements + Events editors live under Pages / Page Data Editor (GSSC5-126).
  { label: "Pages", path: "/page-sections" },
  { label: "Newsletters", path: "/newsletters" },
  { label: "Publications", path: "/publications" },
  { label: "Research Tools", path: "/research-tools" },
  { label: "Templates", path: "/templates" },
  { label: "Site Trees", path: "/site-trees" },
  { label: "Sitemap", path: "/sitemap" },
  { label: "Search", path: "/search" },
];
// @relation(GSSC-MLLR-591, scope=range_end, role=Implementation)

function isFrontend(value: string): value is SiteTreeFrontend {
  return (SITE_TREE_FRONTENDS as readonly string[]).includes(value);
}

function toEntry(row: FlatNode) {
  return {
    cuid: row.id,
    treeId: row.treeId,
    parentId: row.parentId,
    label: row.label,
    path: row.path,
    sortOrder: row.sortOrder,
    sectionTag: row.sectionTag,
  };
}

function nestNodes(rows: FlatNode[], rootId: string): NestedSiteTreeNode {
  const byParent = new Map<string | null, FlatNode[]>();
  for (const row of rows) {
    const key = row.parentId;
    const list = byParent.get(key);
    if (list) list.push(row);
    else byParent.set(key, [row]);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  function build(node: FlatNode): NestedSiteTreeNode {
    const kids = byParent.get(node.id) ?? [];
    return {
      cuid: node.id,
      label: node.label,
      path: node.path,
      sortOrder: node.sortOrder,
      sectionTag: node.sectionTag,
      children: kids.map(build),
    };
  }

  const root = rows.find((row) => row.id === rootId);
  if (!root) throw new Error("site tree root missing");
  return build(root);
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    isAdmin: true,
  });
}

function trimStrings(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") {
      (value as Record<string, unknown>)[key] = entry.trim();
    }
  }
}

/**
 * Seed a frontend tree only when uninitialized (no SiteTree row yet).
 * Once a tree exists, later seed/boot runs leave nodes untouched — including
 * admin-removed destinations — so deleted seed paths are never re-added.
 */
async function ensureTree(
  frontend: SiteTreeFrontend,
  root: { label: string; path: string },
  children: Array<{ label: string; path: string }>,
): Promise<void> {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const existing = await prisma.siteTree.findUnique({
    where: { frontend },
    select: { id: true },
  });
  if (existing) return;

  const tree = await prisma.siteTree.create({
    data: {
      frontend,
      nodes: {
        create: {
          label: root.label,
          path: root.path,
          sortOrder: 0,
          parentId: null,
        },
      },
    },
    include: { nodes: true },
  });
  const rootNode = tree.nodes[0];
  if (!rootNode) throw new Error(`site tree root missing for ${frontend}`);
  if (children.length > 0) {
    await prisma.siteTreeNode.createMany({
      data: children.map((child, index) => ({
        treeId: tree.id,
        parentId: rootNode.id,
        label: child.label,
        path: child.path,
        sortOrder: index,
      })),
    });
  }
}

/** Idempotent seed: Public + Members trees when uninitialized. */
export async function seedSiteTrees(
  databaseUrl = loadConfig().DATABASE_URL,
): Promise<void> {
  // Force prisma against the given URL when called from prepareDevDatabase.
  getPrisma(databaseUrl);
  // @relation(GSSC-BLLR-475, scope=range_start, role=Implementation)
  await ensureTree("public", { label: "Home", path: "/" }, PUBLIC_SEED_CHILDREN);
  await ensureTree(
    "members",
    { label: "Dashboard", path: "/" },
    MEMBERS_SEED_CHILDREN,
  );
  // @relation(GSSC-BLLR-475, scope=range_end, role=Implementation)
}

let siteTreesReady: Promise<void> | undefined;

function startSiteTrees(): Promise<void> {
  siteTreesReady ??= seedSiteTrees().catch((error: unknown) => {
    siteTreesReady = undefined;
    throw error;
  });
  return siteTreesReady;
}

async function loadNestedTree(
  frontend: SiteTreeFrontend,
): Promise<NestedSiteTree | null> {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tree = await prisma.siteTree.findUnique({
    where: { frontend },
    include: { nodes: true },
  });
  if (!tree || tree.nodes.length === 0) return null;
  const root = tree.nodes.find((node) => node.parentId === null);
  if (!root) return null;
  return {
    frontend,
    root: nestNodes(tree.nodes, root.id),
  };
}

/** Flat label/path nodes for site search corpora (BLLR-481 / BLLR-482). */
export async function siteTreeSearchNodes(
  frontend: SiteTreeFrontend,
): Promise<Array<{ label: string; path: string }>> {
  await startSiteTrees();
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const tree = await prisma.siteTree.findUnique({
    where: { frontend },
    include: { nodes: { select: { label: true, path: true } } },
  });
  if (!tree) return [];
  return tree.nodes.map((node) => ({ label: node.label, path: node.path }));
}

async function resolveParentId(
  treeId: string,
  parentId: string | null | undefined,
  rootId: string,
): Promise<string | "missing"> {
  if (parentId === undefined || parentId === null || parentId === "") {
    return rootId;
  }
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const parent = await prisma.siteTreeNode.findFirst({
    where: { id: parentId, treeId },
  });
  if (!parent) return "missing";
  return parent.id;
}

async function wouldCreateCycle(
  treeId: string,
  nodeId: string,
  newParentId: string,
): Promise<boolean> {
  if (nodeId === newParentId) return true;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === nodeId) return true;
    const row: { parentId: string | null } | null =
      await prisma.siteTreeNode.findFirst({
        where: { id: cursor, treeId },
        select: { parentId: true },
      });
    cursor = row?.parentId ?? null;
  }
  return false;
}

/** Site trees API (GSSC5-40). */
export const siteTrees = new Elysia({
  name: "content-site-trees",
  prefix: "/site-trees",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({
    siteTreeNode: SiteTreeNodePlain,
    siteTreeNodeCreate: SiteTreeNodePlainInputCreate,
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .onStart(() => startSiteTrees())
  .get(
    "/:frontend",
    async ({ params, status: statusFn }) => {
      // @relation(GSSC-BLLR-468, scope=range_start, role=Implementation)
      if (!isFrontend(params.frontend)) {
        return statusFn(422, "Invalid" as const);
      }
      // @relation(GSSC-BLLR-468, scope=range_end, role=Implementation)

      await startSiteTrees();

      // @relation(GSSC-BLLR-467, GSSC-BHLR-227, GSSC-BHLR-228, scope=range_start, role=Implementation)
      const nested = await loadNestedTree(params.frontend);
      if (!nested) return statusFn(404, "Not Found" as const);
      return statusFn(200, nested);
      // @relation(GSSC-BLLR-467, GSSC-BHLR-227, GSSC-BHLR-228, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ frontend: t.String({ minLength: 1 }) }),
      response: {
        200: NestedSiteTreeSchema,
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .post(
    "/:frontend",
    async ({ params, body, cookie, status: statusFn }) => {
      if (!isFrontend(params.frontend)) {
        return statusFn(422, "Invalid" as const);
      }

      const session = await openSession(cookie);
      if ("failure" in session) return statusFn(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-470, scope=range_start, role=Implementation)
      if (!session.user.isAdmin) return statusFn(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-470, scope=range_end, role=Implementation)

      await startSiteTrees();
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const tree = await prisma.siteTree.findUnique({
        where: { frontend: params.frontend },
        include: { nodes: true },
      });
      if (!tree) return statusFn(404, "Not Found" as const);
      const root = tree.nodes.find((node) => node.parentId === null);
      if (!root) return statusFn(404, "Not Found" as const);

      const parentId = await resolveParentId(
        tree.id,
        body.parentId,
        root.id,
      );
      if (parentId === "missing") return statusFn(422, "Invalid" as const);

      // @relation(GSSC-BLLR-469, GSSC-BHLR-229, scope=range_start, role=Implementation)
      const created = await prisma.siteTreeNode.create({
        data: {
          treeId: tree.id,
          parentId,
          label: body.label,
          path: body.path,
          sortOrder: body.sortOrder,
          sectionTag: body.sectionTag ?? null,
        },
      });
      return statusFn(201, toEntry(created));
      // @relation(GSSC-BLLR-469, GSSC-BHLR-229, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ frontend: t.String({ minLength: 1 }) }),
      body: CreateNodeBody,
      cookie: loginTokenCookie,
      response: {
        201: SiteTreeNodeEntry,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .patch(
    "/:frontend/nodes/:nodeId",
    async ({ params, body, cookie, status: statusFn }) => {
      if (!isFrontend(params.frontend)) {
        return statusFn(422, "Invalid" as const);
      }

      const session = await openSession(cookie);
      if ("failure" in session) return statusFn(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-472, scope=range_start, role=Implementation)
      if (!session.user.isAdmin) return statusFn(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-472, scope=range_end, role=Implementation)

      await startSiteTrees();
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const tree = await prisma.siteTree.findUnique({
        where: { frontend: params.frontend },
        include: { nodes: true },
      });
      if (!tree) return statusFn(404, "Not Found" as const);
      const node = tree.nodes.find((row) => row.id === params.nodeId);
      if (!node) return statusFn(404, "Not Found" as const);
      const root = tree.nodes.find((row) => row.parentId === null);
      if (!root) return statusFn(404, "Not Found" as const);

      const patch: {
        label?: string;
        path?: string;
        sortOrder?: number;
        parentId?: string | null;
        sectionTag?: string | null;
      } = {};

      if (body.label !== undefined) patch.label = body.label;
      if (body.path !== undefined) patch.path = body.path;
      if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
      if (body.sectionTag !== undefined) patch.sectionTag = body.sectionTag;

      if (body.parentId !== undefined) {
        if (node.id === root.id) {
          // Root stays parentless.
          if (body.parentId !== null && body.parentId !== "") {
            return statusFn(422, "Invalid" as const);
          }
        } else {
          const nextParent = await resolveParentId(
            tree.id,
            body.parentId,
            root.id,
          );
          if (nextParent === "missing") return statusFn(422, "Invalid" as const);
          if (await wouldCreateCycle(tree.id, node.id, nextParent)) {
            return statusFn(422, "Invalid" as const);
          }
          patch.parentId = nextParent;
        }
      }

      if (Object.keys(patch).length === 0) {
        return statusFn(422, "Invalid" as const);
      }

      // @relation(GSSC-BLLR-471, scope=range_start, role=Implementation)
      const updated = await prisma.siteTreeNode.update({
        where: { id: node.id },
        data: patch,
      });
      return statusFn(200, toEntry(updated));
      // @relation(GSSC-BLLR-471, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        frontend: t.String({ minLength: 1 }),
        nodeId: t.String({ minLength: 1 }),
      }),
      body: UpdateNodeBody,
      cookie: loginTokenCookie,
      response: {
        200: SiteTreeNodeEntry,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .delete(
    "/:frontend/nodes/:nodeId",
    async ({ params, cookie, status: statusFn }) => {
      if (!isFrontend(params.frontend)) {
        return statusFn(422, "Invalid" as const);
      }

      const session = await openSession(cookie);
      if ("failure" in session) return statusFn(403, "Forbidden" as const);

      // @relation(GSSC-BLLR-474, scope=range_start, role=Implementation)
      if (!session.user.isAdmin) return statusFn(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-474, scope=range_end, role=Implementation)

      await startSiteTrees();
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const tree = await prisma.siteTree.findUnique({
        where: { frontend: params.frontend },
        include: { nodes: true },
      });
      if (!tree) return statusFn(404, "Not Found" as const);
      const node = tree.nodes.find((row) => row.id === params.nodeId);
      if (!node) return statusFn(404, "Not Found" as const);
      if (node.parentId === null) {
        // Keep a single root; refuse deleting the tree root.
        return statusFn(422, "Invalid" as const);
      }

      // @relation(GSSC-BLLR-473, scope=range_start, role=Implementation)
      // Cascade on parentId removes descendants.
      await prisma.siteTreeNode.delete({ where: { id: node.id } });
      return statusFn(204, undefined);
      // @relation(GSSC-BLLR-473, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({
        frontend: t.String({ minLength: 1 }),
        nodeId: t.String({ minLength: 1 }),
      }),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  );
