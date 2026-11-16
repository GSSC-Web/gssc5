# `@gssc/e2e` — Playwright integration suite

Monorepo integration / e2e harness (Kaneo **GSSC5-110**, GitHub **#183**). Lives at `gssc5-web/test/` — a **sister of `apps/`**, not a product app workspace under `apps/*`. Covers Public and Members smokes. Does **not** replace Vitest (`//public:test`, `//members:test`) or Bun (`//backend:test`).

## Why Playwright

Owner-locked for the v5.0.2 wave. Fit for this monorepo (Bun workspaces + Angular public/members + Elysia backend):

- First-class TypeScript config and assertions in the same language as the apps
- Built-in `webServer` / multi-project setup matches our need to boot backend + two Angular ports
- Chromium-only smokes stay lean in CI (`playwright install chromium`)
- Auto-waiting locators reduce brittle sleep-based Angular navigation checks (login gate redirect)

### Alternatives considered

| Tool | Why not (here) |
| --- | --- |
| **Cypress** | Strong DX, but a heavier separate runner/config stack; less natural multi-baseURL projects for public (4200) + members (4201) + API (3000) without extra ceremony |
| **Puppeteer** | Browser control only — we would reinvent test runner, fixtures, reporters, and CI wiring Playwright already provides |
| **Selenium / WebDriver** | Extra driver/grid surface; slower feedback for a small Chromium smoke suite in GitHub Actions |
| **Angular Protractor** | Deprecated / removed from the Angular CLI path; do not adopt a dead stack |
| **Vitest browser / jsdom-only “integration”** | Already the unit harness (`ng test` / Vitest). jsdom does not exercise real routing, cookie challenge, or cross-origin Eden Treaty the way a browser smoke must. Browser-mode Vitest would duplicate Playwright’s job without its e2e-oriented server orchestration |

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
