---
id: e2e-arch
title: Playwright integration/e2e harness
importance: medium
tags: [frontend, e2e, playwright, public, members]
---

# Playwright e2e (`@gssc/e2e`)

- Package: `gssc5-web/test` (workspace `@gssc/e2e`) — **sister of `apps/`**, not under `apps/*`. Kaneo **GSSC5-110** / GitHub **#183**.
- Playwright chosen (owner-locked): TS-native runner, multi-project + `webServer` for backend/public/members, lean Chromium CI. Rejected for this monorepo: Cypress (heavier dual-app setup), Puppeteer (no runner), Selenium (driver/grid overhead), Protractor (deprecated), Vitest/jsdom (unit harness — not real browser/cookie/routing smoke). Detail: `gssc5-web/test/README.md`.
- Playwright config + Chromium smokes for Public (`http://127.0.0.1:4200`) and Members (`http://127.0.0.1:4201`). `webServer` runs `scripts/start-stack.sh` (sequenced backend → public → members) when ports are not already up.
- Run: `mise run //e2e:test` (browsers: `mise run //e2e:install:browsers`). CI job `e2e` in `.github/workflows/test.yml`.
- Does **not** replace Vitest/bun unit harnesses. No product HLR/LLR for the harness itself (STD + SW package/CI wiring). SoftDev/TestDev: treat as e2e harness, not Angular unit `ng test` or LangGraph Python.
- Initial smokes: public home loads; members logged-out home → `/login` gate. Expand as nav/search leaves land.
