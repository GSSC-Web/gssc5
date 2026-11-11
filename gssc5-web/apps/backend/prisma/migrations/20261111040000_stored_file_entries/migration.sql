-- CreateTable
CREATE TABLE "stored_file_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "parentId" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "readRoles" TEXT NOT NULL DEFAULT '[]',
    "writeRoles" TEXT NOT NULL DEFAULT '[]',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stored_file_entries_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "stored_file_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stored_file_entries_parentId_deletedAt_idx" ON "stored_file_entries"("parentId", "deletedAt");
