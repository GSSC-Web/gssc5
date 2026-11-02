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
`prisma generate` writes the Prisma client to `src/generated/prisma` and the
Prismabox TypeBox models to `src/generated/prismabox`. Neither is committed.
Startup runs `prisma migrate deploy` before it listens.

The HTTP application is `src/app.ts`. It mounts the accounts plugin from
`src/user/accounts.ts`, which serves `/login`, `/logout`, and `/challenge`.
A login is a password plus either a username or a primary email. Both
identifiers, neither identifier, and a primary email that fails the email
pattern are invalidated. An unknown identifier or a password that does not
match the stored hash is forbidden, and that body does not say which check
failed. A match returns a token. Logout returns 204.
A challenge returns `valid` or `invalid`.
`src/index.ts` loads configuration, applies database migrations, and listens.
The accounts plugin creates or updates the permanent admin account when the
server starts. `ADMIN_EMAIL` defaults to empty. An empty value leaves the admin
Primary Email unset, and a provided value is stored without an email check.
An existing admin keeps both email values when the password hash is replaced.
Frontends import the `App` type from this package for Eden Treaty.
