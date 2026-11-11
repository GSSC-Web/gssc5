-- AlterTable
ALTER TABLE "users" ADD COLUMN "isToolEditor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "research_tools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "referenceLink" TEXT NOT NULL
);
