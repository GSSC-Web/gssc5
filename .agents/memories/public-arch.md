---
id: public-arch
title: Public Angular app architecture
importance: high
tags: [frontend, public, angular, theme]
---

# Public app

- App: `gssc5-web/apps/public` (Angular + Tailwind + Eden Treaty).
- Layout under `src/app/`: `modules/`, `pages/`, `services/`; multi-file classes get a folder. Bootstrap stays in `src/app/`.
- Modules include `header`, `footer`, `announcements-bar`, `error` (Error Container: bottom-right Page Outlet panel; light/dark-red chrome matching Prompt field fail; admin collapsibles; Report/Dismiss chrome; Esc-when-focused + focus restore), `section` (Section Container places Contents: white chrome, 1.5× header, black body; equal Resource Buttons in a left-aligned horizontal strip; looping prev/next carousel only when the strip overflows Section width), `section-from-cuid` (takes a backend section cuid, fetches via Eden Treaty `GET /sections/{cuid}`, maps resources string→name/href, and renders through the Section Container), `prompt-overlay` (Prompt Overlay shell + child field modules: `text-field`, `select-field`, `options-field`, `button-field`, `file-field`, `options-list-field`, `prompt-form`).
- Home page demo (`pages/home/`) mounts a sample Section (Lorem Ipsum + google.com resource) under GSSC5-25; full home composition remains wave 4 / GSSC5-14. Page assemblies that load live sections use `gssc-section-from-cuid` (GSSC5-50).
- Services include `backend` (credentialed `fetch`), `member-session`, `public-error` (current Application/HTTP Error Contents; clear on dismiss/report), `urgent-announcements`, `prompt-overlay` (queued prompt forms), `contact-overlay` (Header/Footer open hook; enqueues the Contact Overlay form on the prompt queue), contact/KV helpers.
- Prompt Overlay: service queue of form configs; overlay chrome (gray/25% backdrop, fullscreen below `sm`, ≤¾ viewport at `sm+`); dismiss via top-right control or Escape only (no backdrop dismiss).
- Contact Overlay (GSSC5-31): Header/Footer Contact open the service; form title Contact with Name, Email, Contact reason, Message, and Submit via Prompt Overlay field modules; Contact reason defaults to General Inquiry (title-case options including Website Issue); Name/Email autofill from MemberSession when signed in; submit completes the draft with no send/mail API. Phone/email/postal stay on Footer; contact page section stays empty by design.
- MemberSession also holds optional `emailAddress` (local UI signal, same pattern as `displayName`) for Contact Overlay autofill; Login Token remains HttpOnly-cookie only.
- Theme tokens on `:root` in `src/styles.css`: `--gssc-light-green` `#C5CAB6`, `--gssc-dark-green` `#61684D`, `--gssc-cream` `#FFFFCC`, `--gssc-light-brown` `#D8BA98`, `--gssc-dark-brown` `#92745D`, `--gssc-gray` `#D4D4D4`, white/black, plus `--gssc-light-red` / `--gssc-dark-red` (Prompt field fail family for Error Container). Outermost shell background white; default typeface sans-serif.
- Login Token is HttpOnly cookie `gssc_login_token`; public FE consumes session via credentialed requests — it does not store the raw token.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //public:test`.
