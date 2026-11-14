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
- Backend client uses credentialed `fetch` so the HttpOnly Login Token cookie is sent (`gssc_login_token` issued by backend).
- Auth consumption only — members FE does not mint or persist raw login tokens; session comes from cookie + backend challenge.
- Build/test via mise under the members app (`mise` tasks in `gssc5-web` / app `mise.toml`).
