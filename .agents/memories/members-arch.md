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
- Layout under `src/app/`: `pages/`, `services/`, and `modules/` (Header under `modules/header/`, Footer under `modules/footer/`). Eden Treaty client: `services/backend.ts`.
- App Root + Router (GSSC5-79 / GSSC-MLLR-1..13): `app.html` hosts Header/Footer mounts + Page Outlet; root path mounts the home placeholder (`pages/home/`).
- Member Header (GSSC5-81 / GSSC-MLLR-14..31): chrome with logo, member-area nav, greeting/logout when logged in, login affordance when logged out — not a public Contact/Search clone. Mounted in `data-slot="header"`. Explicit Header logout navigates to `/login` with no return-path query (GSSC-MLLR-93).
- Member Footer (GSSC5-82 / GSSC-MLLR-40..66): `modules/footer/` reads society fields via `services/kv-store/` + `services/society-contact/` (same KVS keys as public). Contact overlay open is stubbed in `services/contact-overlay/`.
- Auth Wave 2 append / PIR-32 (GSSC5-86–88, pulled forward from Wave 4): `pages/login/` (GSSC-MLLR-72..91); `services/member-session.ts` cookie challenge + `login()` + logout (GSSC-MLLR-67..71); `services/auth-guards.ts` `requireAuthGuard` / `redirectIfAuthenticatedGuard` with `returnUrl` query (GSSC-MLLR-92..95). Members FE still does not mint tokens. Wave 3 (83–85) remains separate.
- StrictDoc UID blocks in `docs/members/Members_LLR.sdoc`: GSSC5-80 claims no MLLRs; GSSC5-79 owns **GSSC-MLLR-1..13**; GSSC5-81 owns **GSSC-MLLR-14..31**; GSSC5-82 owns **GSSC-MLLR-40..66**; GSSC5-87 owns **67..71**; GSSC5-86 owns **72..91**; GSSC5-88 owns **92..95**; **32..39** free for Wave 3.
- Backend client uses credentialed `fetch` so the HttpOnly Login Token cookie is sent (`gssc_login_token` issued by backend).
- Auth consumption only — members FE does not mint or persist raw login tokens; session comes from cookie + backend challenge.
- Build/test via mise under the members app (`mise` tasks in `gssc5-web` / app `mise.toml`).
- **Testing harness (GSSC5-80, mirrors public GSSC5-39):** `src/test-harness.ts` (`setupMembersComponent`, DOM helpers), `src/test-providers.ts` (wired via `angular.json` `providersFile`), `**/*.test.ts` beside sources. Run with `mise run //members:test`. No testing-framework MLLRs; do not unit-test the harness. SoftDev/TestDev must use members `ng test` / mise — not LangGraph Python packaging.
