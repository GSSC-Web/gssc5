---
id: backend-arch
title: Backend Elysia architecture
importance: high
tags: [backend, elysia, prisma, cookies, kvs, content]
---

# Backend

- App: `gssc5-web/apps/backend` (Elysia + Bun + Prisma).
- Auth session: durable `login_tokens` rows; hash via `hashLoginToken`; cookie name `gssc_login_token`.
- Cookie I/O through Elysia cookies (`loginTokenCookie`, `setLoginTokenCookie`, `clearLoginTokenCookie` in `src/user/login-session.ts`) — httpOnly, secure, sameSite lax, path `/`.
- Authenticated user resolve (cookie → hash → `loginToken.findUnique` → classify → user payload) goes through shared `resolveLoginSessionUser` in `src/user/login-session.ts`; pass a Prisma user `select` (or omit for full `User`). Do not reimplement beside route modules.
- KVS: `src/kvs.ts` for key/value storage used by frontends.
- Content (webpage generic content): `src/content/section.ts` (`/sections`), `src/content/template.ts` (`/templates`), `src/content/research-tools.ts` (`/research-tools`), `src/content/publications.ts` (`/publications`), `src/content/newsletters.ts` (`GET|POST /newsletters`, `GET|PATCH|DELETE /newsletter/:cuid`), shared `src/content/helpers.ts`. App wires `.use(section).use(template).use(researchTools).use(publications).use(newsletters).use(files)`.
  - Mutation bodies (GSSC5-64): section/template/research-tools/publications declare Elysia `t.Object` schemas composing Prismabox scalar fields (`.model` + `additionalProperties: true` like KVS). Wire keeps `cuid` and string[] tags/resources — do not drop in raw `*Plain` (those expose `id` and JSON-string tags). Newsletters still use helper `bodyRecord` ladders.
  - Prisma: `page_data` (datatype `section` | `announcement` | `event`; shared `index`/tags/perms), `ContentTemplate` mapped to `page_templates`, `ResearchTool` mapped to `research_tools` (cuid, title, referenceLink), `Publication` mapped to `publications` (cuid, title, referenceLink, optional description), `Newsletter` mapped to `newsletters` (cuid, volume, number, month, year, filePath StoredFileEntry cuid, keywords JSON string array; GSSC5-20), and `StoredFileEntry` mapped to `stored_file_entries` (file/folder tree + DB ACLs; GSSC5-71).
  - Perm integers (page data): bit 0 (`0o1`) regular member, bit 1 (`0o2`) user moderator; admin always allowed (BLLR-332/342).
  - Research tools mutations require `isToolEditor` or admin (GSSC5-18). Publications mutations require `isPublicationEditor` or admin (GSSC5-19). Newsletters mutations require `isNewsletterEditor` or admin (GSSC5-20) — separate from publication editor.
  - Files (`src/files/`): local FS under `FILE_STORAGE_ROOT` (default `./data/files`); DB ACL `isPublic` + `readRoles`/`writeRoles` JSON role tokens (`member`, `userMod`, `toolEditor`, `publicationEditor`); inherit parent ACL; reject looser child; soft-delete only. Routes: `GET/POST /files`, `POST /files/upload`, `GET/DELETE /files/:cuid`.
  - LLR shape: Service Transactions → Webpage Content → Generic Content → Sections|Templates → URI → HTTP method (collection GET/POST; item GET/PATCH/DELETE); Research Tools, Publications, Newsletters, and Files parallel under Webpage Content.
  - Data Storage LLR children: Users, Password History, Key-Value, Generic Content, Research Tools, Publications, Newsletters, File Storage.
- User/account/password modules under `src/user/`. Site privileges include `isAdmin`, `isUserMod`, `isToolEditor`, `isPublicationEditor`, and `isNewsletterEditor`. Prefer `status()` patterns from project prefs; Prismabox for generated models; Argon2id for password hashes.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //backend:test`.
- Dist: `gssc5-web/dist/backend`.
