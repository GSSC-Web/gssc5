# GSSC Website v5.0

This project is meant as an upgrade to the existing site for the Genealogical
Society of Stanislaus County.

This project uses, but does not require, [mise](https://mise.jdx.dev) for
development purposes. mise installs Bun and Node. Install dependencies from
this directory:

```bash
bun install
```

## Workspaces

| Workspace | Package | Dev server | Tests |
| --- | --- | --- | --- |
| `apps/backend` | `@gssc/backend` | http://localhost:3000 | Bun |
| `apps/public` | `@gssc/public` | http://localhost:4200 | Vitest |
| `apps/members` | `@gssc/members` | http://localhost:4201 | Vitest |

The public and member frontends are Angular applications. The backend is Elysia
on Bun. Each frontend calls the backend through Eden Treaty.

From this directory, `mise serve`, `mise build`, and `mise test` run every
workspace. Inside one workspace, the same command runs only that workspace.

## Development server

```bash
mise serve
```

## Tests

```bash
mise test
```

The backend task generates the Prisma client and the TypeScript declarations,
then runs `bun test`. Each frontend runs Vitest once through `ng test
--watch=false`. The public app uses the shared harness at
`apps/public/src/test-harness.ts` (`mise run //public:test`); see
`apps/public/README.md` for the GSSC5-38 feature-test pattern.

## Production build

```bash
mise build
```

Build output is written under `dist/` at the root of this repository:
`dist/backend`, `dist/public`, and `dist/members`. The backend build generates
the Prisma client and the TypeScript declarations before bundling.

## Backend configuration

The backend reads `apps/backend/.env`. Copy the example before the first run:

```bash
cp apps/backend/.env.example apps/backend/.env
```

A missing file still starts. A variable already set in the shell wins. Invalid
values stop the process before it listens.

| Variable | Default |
| --- | --- |
| `PORT` | `3000` |
| `NODE_ENV` | `development` |
| `DATABASE_URL` | `file:./data/dev.db` |
| `LOGIN_TOKEN_LIFETIME_DAYS` | `7` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `1234` |
| `ADMIN_EMAIL` | empty |
| `ADMIN_ENABLED` | `false` |
| `PASSWORD_HISTORY_COUNT` | `3` |
| `PASSWORD_MIN_LENGTH` | `8` |
| `PASSWORD_RECOVERY_LIFETIME_DAYS` | `1` |
| `SMTP_HOST` | empty |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | empty |
| `SMTP_PASSWORD` | empty |
| `SMTP_FROM` | empty |

`NODE_ENV` must be `development`, `test`, or `production`. `PORT` must be an
integer from 1 to 65535. `LOGIN_TOKEN_LIFETIME_DAYS` must be a number greater
than zero. `ADMIN_USERNAME` must not be empty. `ADMIN_EMAIL` defaults to empty.
An empty admin email leaves the Primary Email unset. A provided value is stored
as the Primary Email and is not checked as an email address. `ADMIN_ENABLED` is
true or false. When it is true, startup creates the permanent admin user, or
replaces that user's password hash when the username already exists. An existing
user keeps both email values. `PASSWORD_HISTORY_COUNT` is an integer greater
than or equal to zero. `PASSWORD_MIN_LENGTH` is an integer greater than zero.
`PASSWORD_RECOVERY_LIFETIME_DAYS` is a number greater than zero. Empty
`SMTP_HOST` leaves recovery mail unable to send; the recovery-request response
still succeeds.

## Database

Prisma uses SQLite through the libSQL adapter. The database file is
`apps/backend/data/dev.db`. The schema is `apps/backend/prisma/schema.prisma`.
The users table stores a username, primary email, secondary email, and current
password hash. Login tokens are stored in `login_tokens`. `prisma generate`
writes the Prisma client to `apps/backend/src/generated/prisma` and the
Prismabox models to `apps/backend/src/generated/prismabox`. The frontend
`App` type is written to `apps/backend/src/generated/types`. None of these
are committed. `mise test`, `mise build`, and `mise serve` generate them.
From `apps/backend`, `mise db-generate` generates the Prisma client and
`mise types` generates the declarations.
