-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "secondaryEmail" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "preferredContactMethod" TEXT,
    "secondaryEmailDisplay" BOOLEAN NOT NULL DEFAULT false,
    "secondaryPhoneDisplay" BOOLEAN NOT NULL DEFAULT false,
    "homeLine1" TEXT,
    "homeLine2" TEXT,
    "homeLine3" TEXT,
    "homeCity" TEXT,
    "homeState" TEXT,
    "homeZip" TEXT,
    "homeZipExtension" TEXT,
    "homeAddressDisplay" TEXT,
    "mailingLine1" TEXT,
    "mailingLine2" TEXT,
    "mailingLine3" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "mailingZipExtension" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isUserMod" BOOLEAN NOT NULL DEFAULT false,
    "membershipStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "id", "passwordHash", "primaryEmail", "secondaryEmail", "updatedAt", "username") SELECT "createdAt", "id", "passwordHash", "primaryEmail", "secondaryEmail", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_primaryEmail_key" ON "users"("primaryEmail");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
