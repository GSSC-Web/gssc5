# `@gssc/e2e` — Playwright integration suite

Monorepo integration / e2e harness (Kaneo **GSSC5-110**, GitHub **#183**). Covers Public and Members smokes. Does **not** replace Vitest (`//public:test`, `//members:test`) or Bun (`//backend:test`).

## Prerequisites

From the repo root (or `gssc5-web`):

```bash
mise run web:install
mise run //e2e:install:browsers
```

`mise run //e2e:test` runs `//backend:types` + `//backend:db:prepare` first. Playwright then boots the stack with `scripts/start-stack.sh` (backend → public → members) when those ports are not already up (`reuseExistingServer` locally).

## Run

```bash
# From repo root
mise run //e2e:test

# Or from this package (after types/seed)
bun run test
```

CI sets `CI=true` (no server reuse, GitHub reporter, single worker). The workflow job `e2e` installs Chromium with OS deps, then runs `mise run //e2e:test`.

## Layout

| Path | Role |
| --- | --- |
| `playwright.config.ts` | Projects `public` / `members`; Chromium; `webServer` → start-stack |
| `scripts/start-stack.sh` | Sequenced backend/public/members boot (avoids prisma generate races) |
| `tests/public/` | Public smokes (home loads) |
| `tests/members/` | Members smokes (login gate) |

Expand smokes as GSSC5-45 / 47 / 107 / 109 land.
