-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passwordHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_recovery_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryEmail" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    CONSTRAINT "password_recovery_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "password_history_userId_createdAt_idx" ON "password_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_recovery_tokens_tokenHash_key" ON "password_recovery_tokens"("tokenHash");
