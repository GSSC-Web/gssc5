import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import {
  includesInsensitive,
  parseKnownQuery,
} from "./content/helpers";
import {
  siteTreeNodesFor,
  type SiteTreeFrontend,
} from "./content/site-tree-stub";
import { getPrisma } from "./db";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
} from "./user/login-session";

/** Result kinds accepted by the kind filter (BLLR-476 / BHLR-236). */
export const SEARCH_KINDS = [
  "site-tree",
  "section",
  "announcement",
  "event",
  "publication",
  "research-tool",
  "newsletter",
  "directory",
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchResult = {
  title: string;
  snippet: string;
  href: string;
  kind: SearchKind;
};

const SEARCH_QUERY_KEYS = new Set(["q", "frontend", "limit", "kind"]);

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const SearchResultEntry = t.Object({
  title: t.String(),
  snippet: t.String(),
  href: t.String(),
  // Explicit tuple — `.map(t.Literal)` widens to `never` under tsc.
  kind: t.Union([
    t.Literal("site-tree"),
    t.Literal("section"),
    t.Literal("announcement"),
    t.Literal("event"),
    t.Literal("publication"),
    t.Literal("research-tool"),
    t.Literal("newsletter"),
    t.Literal("directory"),
  ]),
});

type Session =
  | { failure: "missing" | "unknown" | "logged-out" | "expired" }
  | { user: { id: string; isAdmin: boolean } };

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(getPrisma(loadConfig().DATABASE_URL), cookie, {
    id: true,
    isAdmin: true,
  });
}

function isFrontend(value: string): value is SiteTreeFrontend {
  return value === "public" || value === "members";
}

function isSearchKind(value: string): value is SearchKind {
  return (SEARCH_KINDS as readonly string[]).includes(value);
}

function parseLimit(raw: string | undefined): number | "invalid" {
  if (raw === undefined || raw.trim() === "") return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw.trim())) return "invalid";
  const value = Number.parseInt(raw.trim(), 10);
  if (value < 1) return "invalid";
  return Math.min(value, MAX_LIMIT);
}

function snippetFrom(text: string, query: string, maxLen = 160): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return "";
  const lower = trimmed.toLowerCase();
  const needle = query.toLowerCase();
  const at = lower.indexOf(needle);
  if (at < 0) {
    return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen - 1)}…`;
  }
  const pad = Math.floor((maxLen - needle.length) / 2);
  const start = Math.max(0, at - pad);
  const end = Math.min(trimmed.length, start + maxLen);
  const slice = trimmed.slice(start, end);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < trimmed.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

function displayName(
  firstName: string | null,
  middleName: string | null,
  lastName: string | null,
): string {
  return [firstName, middleName, lastName]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

function pushIfMatch(
  out: SearchResult[],
  query: string,
  kind: SearchKind,
  title: string,
  searchable: string,
  href: string,
): void {
  if (!includesInsensitive(title, query) && !includesInsensitive(searchable, query)) {
    return;
  }
  const snippetSource = includesInsensitive(searchable, query) ? searchable : title;
  out.push({
    title,
    snippet: snippetFrom(snippetSource, query),
    href,
    kind,
  });
}

async function collectPublicCorpus(query: string): Promise<SearchResult[]> {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const out: SearchResult[] = [];

  // @relation(GSSC-BLLR-481, scope=range_start, role=Implementation)
  for (const node of siteTreeNodesFor("public")) {
    pushIfMatch(out, query, "site-tree", node.label, node.path, node.path);
  }

  const pageRows = await prisma.pageDataEntry.findMany({
    where: {
      isPublic: true,
      datatype: { in: ["section", "announcement"] },
    },
  });
  for (const row of pageRows) {
    const kind: SearchKind = row.datatype === "announcement" ? "announcement" : "section";
    const title = (row.header ?? "").trim() || kind;
    pushIfMatch(out, query, kind, title, `${row.header ?? ""}\n${row.body}`, "/");
  }

  const events = await prisma.event.findMany({
    where: { isPublic: true },
    include: { pageData: true },
  });
  for (const row of events) {
    const searchable = [
      row.name,
      row.location,
      row.time,
      row.pageData.header ?? "",
      row.pageData.body,
    ].join("\n");
    pushIfMatch(out, query, "event", row.name, searchable, "/calendar");
  }

  const publications = await prisma.publication.findMany();
  for (const row of publications) {
    pushIfMatch(
      out,
      query,
      "publication",
      row.title,
      `${row.title}\n${row.description ?? ""}\n${row.referenceLink}`,
      "/publications",
    );
  }

  const tools = await prisma.researchTool.findMany();
  for (const row of tools) {
    pushIfMatch(
      out,
      query,
      "research-tool",
      row.title,
      `${row.title}\n${row.referenceLink}`,
      "/research-tools",
    );
  }

  const newsletters = await prisma.newsletter.findMany();
  for (const row of newsletters) {
    const keywords = (() => {
      try {
        const parsed: unknown = JSON.parse(row.keywords);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string").join(" ")
          : "";
      } catch {
        return "";
      }
    })();
    const title = `Volume ${row.volume} Number ${row.number}`;
    pushIfMatch(
      out,
      query,
      "newsletter",
      title,
      `${title}\n${keywords}\n${row.month} ${row.year}`,
      "/newsletters",
    );
  }
  // @relation(GSSC-BLLR-481, scope=range_end, role=Implementation)

  return out;
}

async function collectMembersCorpus(
  query: string,
  session: { user: { id: string; isAdmin: boolean } },
): Promise<SearchResult[]> {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const out: SearchResult[] = [];

  // @relation(GSSC-BLLR-482, scope=range_start, role=Implementation)
  for (const node of siteTreeNodesFor("members")) {
    pushIfMatch(out, query, "site-tree", node.label, node.path, node.path);
  }

  const pageRows = await prisma.pageDataEntry.findMany({
    where: { datatype: { in: ["section", "announcement"] } },
  });
  for (const row of pageRows) {
    const kind: SearchKind = row.datatype === "announcement" ? "announcement" : "section";
    const title = (row.header ?? "").trim() || kind;
    const href = kind === "announcement" ? "/announcements" : "/page-sections";
    pushIfMatch(out, query, kind, title, `${row.header ?? ""}\n${row.body}`, href);
  }

  const events = await prisma.event.findMany({ include: { pageData: true } });
  for (const row of events) {
    const searchable = [
      row.name,
      row.location,
      row.time,
      row.pageData.header ?? "",
      row.pageData.body,
    ].join("\n");
    pushIfMatch(out, query, "event", row.name, searchable, "/events");
  }

  const publications = await prisma.publication.findMany();
  for (const row of publications) {
    pushIfMatch(
      out,
      query,
      "publication",
      row.title,
      `${row.title}\n${row.description ?? ""}\n${row.referenceLink}`,
      "/publications",
    );
  }

  const tools = await prisma.researchTool.findMany();
  for (const row of tools) {
    pushIfMatch(
      out,
      query,
      "research-tool",
      row.title,
      `${row.title}\n${row.referenceLink}`,
      "/research-tools",
    );
  }

  const newsletters = await prisma.newsletter.findMany();
  for (const row of newsletters) {
    const keywords = (() => {
      try {
        const parsed: unknown = JSON.parse(row.keywords);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string").join(" ")
          : "";
      } catch {
        return "";
      }
    })();
    const title = `Volume ${row.volume} Number ${row.number}`;
    pushIfMatch(
      out,
      query,
      "newsletter",
      title,
      `${title}\n${keywords}\n${row.month} ${row.year}`,
      "/newsletters",
    );
  }

  const users = await prisma.user.findMany({
    where: session.user.isAdmin ? {} : { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  });
  for (const user of users) {
    const name = displayName(user.firstName, user.middleName, user.lastName);
    if (name.length === 0) continue;
    pushIfMatch(out, query, "directory", name, name, `/accounts/${user.id}`);
  }
  // @relation(GSSC-BLLR-482, scope=range_end, role=Implementation)

  return out;
}

/** Site search listing (GSSC5-106). */
export const search = new Elysia({
  name: "site-search",
  prefix: "/search",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .get(
    "/",
    async ({ query, cookie, status }) => {
      // @relation(GSSC-BLLR-476, scope=range_start, role=Implementation)
      const filters = parseKnownQuery(query, SEARCH_QUERY_KEYS);
      if (filters === "invalid") return status(422, "Invalid" as const);

      const frontendRaw = filters.frontend?.trim() ?? "";
      if (!isFrontend(frontendRaw)) return status(422, "Invalid" as const);

      const limit = parseLimit(filters.limit);
      if (limit === "invalid") return status(422, "Invalid" as const);

      const kindRaw = filters.kind?.trim();
      if (kindRaw !== undefined && kindRaw.length > 0 && !isSearchKind(kindRaw)) {
        return status(422, "Invalid" as const);
      }
      const kindFilter = kindRaw && kindRaw.length > 0 ? (kindRaw as SearchKind) : undefined;
      // @relation(GSSC-BLLR-476, scope=range_end, role=Implementation)

      let membersSession: { user: { id: string; isAdmin: boolean } } | undefined;
      if (frontendRaw === "members") {
        const session = await openSession(cookie);
        // @relation(GSSC-BLLR-478, scope=range_start, role=Implementation)
        if ("failure" in session) return status(403, "Forbidden" as const);
        // @relation(GSSC-BLLR-478, scope=range_end, role=Implementation)
        membersSession = session;
      }

      const q = (filters.q ?? "").trim();

      // @relation(GSSC-BLLR-480, scope=range_start, role=Implementation)
      if (q.length === 0) {
        return status(200, [] as SearchResult[]);
      }
      // @relation(GSSC-BLLR-480, scope=range_end, role=Implementation)

      let results: SearchResult[];

      if (frontendRaw === "public") {
        // @relation(GSSC-BLLR-477, scope=range_start, role=Implementation)
        results = await collectPublicCorpus(q);
        // @relation(GSSC-BLLR-477, scope=range_end, role=Implementation)
      } else {
        results = await collectMembersCorpus(q, membersSession!);
      }

      if (kindFilter !== undefined) {
        results = results.filter((entry) => entry.kind === kindFilter);
      }

      // @relation(GSSC-BLLR-479, scope=range_start, role=Implementation)
      const projected = results.slice(0, limit).map((entry) => ({
        title: entry.title,
        snippet: entry.snippet,
        href: entry.href,
        kind: entry.kind,
      }));
      return status(200, projected);
      // @relation(GSSC-BLLR-479, scope=range_end, role=Implementation)
    },
    {
      query: t.Record(t.String(), t.String()),
      cookie: loginTokenCookie,
      response: {
        200: t.Array(SearchResultEntry),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  );
