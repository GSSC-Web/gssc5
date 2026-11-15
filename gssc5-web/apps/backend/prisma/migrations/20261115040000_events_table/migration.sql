-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "announcementStartMonth" INTEGER NOT NULL,
    "announcementStartDay" INTEGER NOT NULL,
    "announcementStartYear" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "createPerm" INTEGER NOT NULL DEFAULT 0,
    "modifyPerm" INTEGER NOT NULL DEFAULT 0,
    "deletePerm" INTEGER NOT NULL DEFAULT 0,
    "pageDataId" TEXT NOT NULL,
    CONSTRAINT "events_pageDataId_fkey" FOREIGN KEY ("pageDataId") REFERENCES "page_data" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "events_pageDataId_key" ON "events"("pageDataId");

-- CreateIndex
CREATE INDEX "events_year_month_day_idx" ON "events"("year", "month", "day");
