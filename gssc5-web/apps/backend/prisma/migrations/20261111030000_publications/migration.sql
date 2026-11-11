-- AlterTable
ALTER TABLE "users" ADD COLUMN "isPublicationEditor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "referenceLink" TEXT NOT NULL,
    "description" TEXT
);
