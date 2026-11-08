---
id: public-arch
title: Public Angular app architecture
importance: high
tags: [frontend, public, angular, theme]
---

# Public app

- App: `gssc5-web/apps/public` (Angular + Tailwind + Eden Treaty).
- Layout under `src/app/`: `modules/`, `pages/`, `services/`; multi-file classes get a folder. Bootstrap stays in `src/app/`.
- Modules include `header`, `footer`, `announcements-bar`, `prompt-overlay` (Prompt Overlay shell).
- Services include `backend` (credentialed `fetch`), `member-session`, `urgent-announcements`, `prompt-overlay`, contact/KV helpers.
- Theme tokens on `:root` in `src/styles.css`: `--gssc-light-green` `#C5CAB6`, `--gssc-dark-green` `#61684D`, `--gssc-cream` `#FFFFCC`, `--gssc-light-brown` `#D8BA98`, `--gssc-dark-brown` `#92745D`, `--gssc-gray` `#D4D4D4`, white/black. Outermost shell background white; default typeface sans-serif.
- Login Token is HttpOnly cookie `gssc_login_token`; public FE consumes session via credentialed requests — it does not store the raw token.
- Tests: `src/test-harness.ts`; `*.test.ts` beside sources; `mise run //public:test`.
