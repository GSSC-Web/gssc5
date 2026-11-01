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

The backend task generates the Prisma client, then runs `bun test`. Each
frontend runs Vitest once through `ng test --watch=false`.

## Production build

```bash
mise build
```

Build output is written under `dist/` at the root of this repository:
`dist/backend`, `dist/public`, and `dist/members`. The backend build generates
the Prisma client before bundling.

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

`NODE_ENV` must be `development`, `test`, or `production`. `PORT` must be an
integer from 1 to 65535.

## Database

Prisma uses SQLite through the libSQL adapter. The database file is
`apps/backend/data/dev.db`. The schema is `apps/backend/prisma/schema.prisma`.
There are no models yet. The generated client is
`apps/backend/src/generated/prisma` and is not committed. `mise test` and
`mise build` generate it. From `apps/backend`, `mise db-generate` generates it
alone.
