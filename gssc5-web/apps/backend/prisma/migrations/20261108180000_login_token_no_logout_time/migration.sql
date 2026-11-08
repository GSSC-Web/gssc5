-- Drop logout time; ended sessions remove the Login Token row instead.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_login_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "login_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_login_tokens" ("id", "tokenHash", "userId", "issuedAt", "expiresAt") SELECT "id", "tokenHash", "userId", "issuedAt", "expiresAt" FROM "login_tokens";
DROP TABLE "login_tokens";
ALTER TABLE "new_login_tokens" RENAME TO "login_tokens";
CREATE UNIQUE INDEX "login_tokens_tokenHash_key" ON "login_tokens"("tokenHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
