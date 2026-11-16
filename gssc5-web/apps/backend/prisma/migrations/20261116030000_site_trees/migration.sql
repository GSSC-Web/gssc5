-- Site trees per frontend (GSSC5-40).
CREATE TABLE "site_trees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frontend" TEXT NOT NULL
);

CREATE UNIQUE INDEX "site_trees_frontend_key" ON "site_trees"("frontend");

CREATE TABLE "site_tree_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "sectionTag" TEXT,
    CONSTRAINT "site_tree_nodes_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "site_trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "site_tree_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "site_tree_nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "site_tree_nodes_treeId_parentId_sortOrder_idx" ON "site_tree_nodes"("treeId", "parentId", "sortOrder");
