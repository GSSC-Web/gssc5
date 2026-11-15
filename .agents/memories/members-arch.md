---
id: members-arch
title: Members Angular app architecture
importance: high
tags: [frontend, members, angular, auth]
---

# Members app

- **Domain:** gssc5 members FE (Angular/Tailwind) — SoftDev/TestDev plans use members focused `ng test` / mise tasks, not LangGraph Python packaging.
- App: `gssc5-web/apps/members` (Angular + Tailwind + Eden Treaty).
- Shell uses Tailwind utilities + shared `gssc-*` theme tokens in `src/styles.css` (aligned with public); no Angular CLI welcome scaffold or custom `@media` CSS.
- Layout under `src/app/`: `pages/`, `services/` (and `modules/` when shared UI exists). Eden Treaty client: `services/backend.ts`.
- App Root + Router (GSSC5-79 / GSSC-MLLR-1..13): `app.html` hosts Header/Footer mounts + Page Outlet; root path mounts the home placeholder (`pages/home/`). Header chrome is GSSC5-81; Footer chrome is GSSC5-82 (`modules/footer/`); auth and feature pages are later waves.
- StrictDoc UID blocks in `docs/members/Members_LLR.sdoc`: GSSC5-80 claims no MLLRs; GSSC5-79 owns **GSSC-MLLR-1..13**; GSSC5-81 Header reserves **GSSC-MLLR-14+** for Header chrome; GSSC5-82 Footer owns **GSSC-MLLR-40..48** (do not overlap).
- Backend client uses credentialed `fetch` so the HttpOnly Login Token cookie is sent (`gssc_login_token` issued by backend).
- Auth consumption only — members FE does not mint or persist raw login tokens; session comes from cookie + backend challenge.
- Build/test via mise under the members app (`mise` tasks in `gssc5-web` / app `mise.toml`).
- **Testing harness (GSSC5-80, mirrors public GSSC5-39):** `src/test-harness.ts` (`setupMembersComponent`, DOM helpers), `src/test-providers.ts` (wired via `angular.json` `providersFile`), `**/*.test.ts` beside sources. Run with `mise run //members:test`. No testing-framework MLLRs; do not unit-test the harness. SoftDev/TestDev must use members `ng test` / mise — not LangGraph Python packaging.
