-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volume" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]'
);
