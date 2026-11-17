/**
 * Minimal site-tree label/path corpus for site search (GSSC5-106) until
 * GSSC5-40 SiteTree / SiteTreeNode models land. Paths are FE route hints only.
 */

export type SiteTreeFrontend = "public" | "members";

export type SiteTreeStubNode = {
  frontend: SiteTreeFrontend;
  label: string;
  path: string;
};

/** Locked-shape stubs mirroring current Public + Members destinations. */
export const SITE_TREE_STUB_NODES: readonly SiteTreeStubNode[] = [
  { frontend: "public", label: "Home", path: "/" },
  { frontend: "public", label: "Membership", path: "/membership" },
  { frontend: "public", label: "Leadership", path: "/leadership" },
  { frontend: "public", label: "Calendar", path: "/calendar" },
  { frontend: "public", label: "Publications", path: "/publications" },
  { frontend: "public", label: "Research Tools", path: "/research-tools" },
  { frontend: "public", label: "Newsletters", path: "/newsletters" },
  { frontend: "members", label: "Dashboard", path: "/" },
  { frontend: "members", label: "Account", path: "/account" },
  { frontend: "members", label: "Directory", path: "/directory" },
  // Announcements + Events are reached via Pages / Page Data Editor (GSSC5-126).
  { frontend: "members", label: "Page Sections", path: "/page-sections" },
  { frontend: "members", label: "Newsletters", path: "/newsletters" },
  { frontend: "members", label: "Publications", path: "/publications" },
  { frontend: "members", label: "Research Tools", path: "/research-tools" },
];

export function siteTreeNodesFor(frontend: SiteTreeFrontend): SiteTreeStubNode[] {
  return SITE_TREE_STUB_NODES.filter((node) => node.frontend === frontend);
}
