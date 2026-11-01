# Backend

Elysia application `@gssc/backend` on Bun. It listens on port 3000.

From this directory:

- `mise serve` starts the development server.
- `mise build` generates the Prisma client and writes `../../dist/backend`.
- `mise test` generates the Prisma client and runs the Bun tests.
- `mise db-generate` generates the Prisma client.

Copy `.env.example` to `.env` for local configuration. The repository README
lists the variables and their defaults. A missing `.env` still starts.

SQLite is stored at `data/dev.db`. The Prisma schema is `prisma/schema.prisma`.
The generated client is `src/generated/prisma` and is not committed. The schema
has no models yet.

The HTTP application is `src/app.ts`. `src/index.ts` loads configuration, checks
the database, and listens. Frontends import the `App` type from this package
for Eden Treaty.
