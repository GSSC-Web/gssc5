-- CreateTable
CREATE TABLE "page_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createPerm" INTEGER NOT NULL DEFAULT 0,
    "modifyPerm" INTEGER NOT NULL DEFAULT 0,
    "deletePerm" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "page_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datatype" TEXT NOT NULL,
    "header" TEXT,
    "body" TEXT NOT NULL,
    "resources" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "index" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL,
    "createPerm" INTEGER NOT NULL DEFAULT 0,
    "modifyPerm" INTEGER NOT NULL DEFAULT 0,
    "deletePerm" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    CONSTRAINT "page_data_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "page_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "page_data_datatype_index_idx" ON "page_data"("datatype", "index");
