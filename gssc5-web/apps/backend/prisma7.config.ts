import { defineConfig } from "prisma/config";

// The app reads .env itself. Prisma's config loader does not. This default
// matches src/config.ts so generate and migrate work when DATABASE_URL is unset.
const databaseUrl = process.env.DATABASE_URL ?? "file:./data/dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
