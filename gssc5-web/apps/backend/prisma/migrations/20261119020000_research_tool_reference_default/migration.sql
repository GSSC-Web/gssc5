-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_research_tools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "referenceLink" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_research_tools" ("id", "title", "referenceLink") SELECT "id", "title", "referenceLink" FROM "research_tools";
DROP TABLE "research_tools";
ALTER TABLE "new_research_tools" RENAME TO "research_tools";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
