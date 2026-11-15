---
id: backend-arch
title: Backend Elysia architecture
importance: high
tags: [backend, elysia, prisma, cookies, kvs, content]
---

# Backend

- **Domain:** gssc5 backend (Elysia/Bun/Prisma) — SoftDev/TestDev plans use `bun test` / `mise run //backend:test`, not Angular/`ng test` and not LangGraph Python packaging.
- App: `gssc5-web/apps/backend` (Elysia + Bun + Prisma).
- Auth session: durable `login_tokens` rows; hash via `hashLoginToken` (`Bun.CryptoHasher` sha256); cookie name `gssc_login_token`. Login/recovery opaque tokens from Web Crypto `crypto.getRandomValues`; `/challenge` returns via Elysia `status(200, …)`.
- Cookie I/O through Elysia cookies (`loginTokenCookie`, `setLoginTokenCookie`, `clearLoginTokenCookie` in `src/user/login-session.ts`) — httpOnly, secure, sameSite lax, path `/`.
- Authenticated user resolve (cookie → hash → `loginToken.findUnique` → classify → user payload) goes through shared `resolveLoginSessionUser` in `src/user/login-session.ts`; pass a Prisma user `select` (or omit for full `User`). Do not reimplement beside route modules.
- KVS: `src/kvs.ts` for key/value storage used by frontends.
- Content (webpage generic content): `src/content/section.ts` (`/sections`), `src/content/announcement.ts` (`/announcements`; list merges in-window events per BHLR-147/148), `src/content/template.ts` (`/templates`), `src/content/events.ts` (`/events`), `src/content/research-tools.ts` (`/research-tools`), `src/content/publications.ts` (`/publications`), `src/content/newsletters.ts` (`GET|POST /newsletters`, `GET|PATCH|DELETE /newsletter/:cuid`), shared `src/content/helpers.ts`. App wires `.use(section).use(announcement).use(template).use(events).use(researchTools).use(publications).use(newsletters).use(files)`.
  - Mutation bodies (GSSC5-64): section/template/research-tools/publications/events declare Elysia `t.Object` schemas composing Prismabox scalar fields (`.model` + `additionalProperties: true` like KVS). Wire keeps `cuid` and string[] tags/resources — do not drop in raw `*Plain` (those expose `id` and JSON-string tags). Newsletters still use helper `bodyRecord` ladders.
  - Prisma: `page_data` (datatype `section` | `announcement` | `event`; shared `index`/tags/perms; optional inclusive `startMonth`/`startDay`/`startYear` and `endMonth`/`endDay`/`endYear` for display windows on announcements/sections and event spans — single-day events use equal start and end; GSSC5-67 / BLLR-400–401; optional `imageFile` StoredFileEntry cuid + `imagePosition` `none`|`left`|`right` GSSC5-74), `Event` mapped to `events` (name, event date Y/M/D, announcement-window start Y/M/D, time, duration, location, isPublic, perms, `pageDataId` → event-details row; GSSC5-69), `ContentTemplate` mapped to `page_templates`, `ResearchTool` mapped to `research_tools` (cuid, title, referenceLink), `Publication` mapped to `publications` (cuid, title, referenceLink, optional description), `Newsletter` mapped to `newsletters` (cuid, volume, number, month, year, filePath StoredFileEntry cuid, keywords JSON string array; GSSC5-20), and `StoredFileEntry` mapped to `stored_file_entries` (file/folder tree + DB ACLs; GSSC5-71).
  - Event date mapping (GSSC5-69): event `month/day/year` mirrors onto linked `page_data` `start*`/`end*` (equal for single-day). Announcement-window start stays on `events` only — not parallel columns on `page_data`.
  - Perm integers (page data / events): bit 0 (`0o1`) regular member, bit 1 (`0o2`) user moderator; admin always allowed (BLLR-332/342). Event create without template defaults create/modify/delete to user-moderator bit.
  - Research tools mutations require `isToolEditor` or admin (GSSC5-18). Publications mutations require `isPublicationEditor` or admin (GSSC5-19). Newsletters mutations require `isNewsletterEditor` or admin (GSSC5-20) — separate from publication editor.
  - Files (`src/files/`): local FS under `FILE_STORAGE_ROOT` (default `./data/files`); DB ACL `isPublic` + `readRoles`/`writeRoles` JSON role tokens (`member`, `userMod`, `toolEditor`, `publicationEditor`); inherit parent ACL; reject looser child; soft-delete only. Routes: `GET/POST /files`, `POST /files/upload`, `GET/DELETE /files/:cuid`.
  - LLR shape: Service Transactions → Webpage Content → Generic Content → Sections|Announcements|Templates → URI → HTTP method (collection GET/POST; item GET/PATCH/DELETE); Events, Research Tools, Publications, Newsletters, and Files parallel under Webpage Content.
  - Data Storage LLR children: Users, Password History, Key-Value, Generic Content, Events, Research Tools, Publications, Newsletters, File Storage.
- User/account/password modules under `src/user/`. Site privileges include `isAdmin`, `isUserMod`, `isToolEditor`, `isPublicationEditor`, and `isNewsletterEditor`. Prefer `status()` patterns from project prefs; Prismabox for generated models; Argon2id for password hashes. Login and password-recovery bodies (`accounts.ts` LoginBody.primaryEmail; `passwords.ts` RecoveryRequestBody.email / RecoverBody.primaryEmail) use Elysia `t.String({ format: 'email' })` — do not reintroduce a duplicated `emailPattern`; keep the login union error text.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //backend:test`.
- Dist: `gssc5-web/dist/backend`.
