---
id: backend-arch
title: Backend Elysia architecture
importance: high
tags: [backend, elysia, prisma, cookies, kvs]
---

# Backend

- App: `gssc5-web/apps/backend` (Elysia + Bun + Prisma).
- Auth session: durable `login_tokens` rows; hash via `hashLoginToken`; cookie name `gssc_login_token`.
- Cookie I/O through Elysia cookies (`loginTokenCookie`, `setLoginTokenCookie`, `clearLoginTokenCookie` in `src/user/login-session.ts`) — httpOnly, secure, sameSite lax, path `/`.
- KVS: `src/kvs.ts` for key/value storage used by frontends.
- Page data: `src/page-data.ts` (`/sections`, `/templates`); Prisma `page_data` + `page_templates`. Datatype `section` | `announcement` | `event`; shared `index`/tags. Perm bits: member `0o1`, user-mod `0o2`; admin always allowed.
- User/account/password modules under `src/user/`. Prefer `status()` patterns from project prefs; Prismabox for generated models; Argon2id for password hashes.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //backend:test`.
- Dist: `gssc5-web/dist/backend`.
