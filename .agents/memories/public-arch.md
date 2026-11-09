---
id: public-arch
title: Public Angular app architecture
importance: high
tags: [frontend, public, angular, theme]
---

# Public app

- App: `gssc5-web/apps/public` (Angular + Tailwind + Eden Treaty).
- Layout under `src/app/`: `modules/`, `pages/`, `services/`; multi-file classes get a folder. Bootstrap stays in `src/app/`.
- Modules include `header`, `footer`, `announcements-bar`, `section` (Section Container places Contents: white chrome, 2.5× header, black body; equal Resource Buttons in a left-aligned horizontal strip; looping prev/next carousel only when the strip overflows Section width), `prompt-overlay` (Prompt Overlay shell + child field modules: `text-field`, `select-field`, `options-field`, `button-field`, `file-field`, `options-list-field`, `prompt-form`).
- Home page demo (`pages/home/`) mounts a sample Section (Lorem Ipsum + google.com resource) under GSSC5-25; full home composition remains wave 4 / GSSC5-14.
- Services include `backend` (credentialed `fetch`), `member-session`, `urgent-announcements`, `prompt-overlay` (queued prompt forms), `contact-overlay` (Header/Footer open hook; currently enqueues a SW-only contact PoC on the prompt queue), contact/KV helpers.
- Prompt Overlay: service queue of form configs; overlay chrome (gray/25% backdrop, fullscreen below `sm`, ≤¾ viewport at `sm+`); dismiss via top-right control or Escape only (no backdrop dismiss). Temporary contact form PoC is SW-only under GSSC5-27 (no PoC LLRs/tests); real Contact Overlay remains GSSC5-31.
- Theme tokens on `:root` in `src/styles.css`: `--gssc-light-green` `#C5CAB6`, `--gssc-dark-green` `#61684D`, `--gssc-cream` `#FFFFCC`, `--gssc-light-brown` `#D8BA98`, `--gssc-dark-brown` `#92745D`, `--gssc-gray` `#D4D4D4`, white/black. Outermost shell background white; default typeface sans-serif.
- Login Token is HttpOnly cookie `gssc_login_token`; public FE consumes session via credentialed requests — it does not store the raw token.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //public:test`.
