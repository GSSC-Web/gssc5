---
id: software-closeout-review
name: software-closeout-review
description: >-
  Closeout review that each in-scope UID has one Implementation @relation,
  SW matches requirements, logic/errors are sound, and adopted third parties
  are used optimally. Use before merge / software closeout.
enabled: true
---

# Software closeout review

**When:** End of a Kaneo/GSSC task before merge, or owner asks for software closeout.

**Result:** **PASS** or **FAIL** with `UID` + proposed fix. No silent requirement rewrites to match SW.

## Steps

1. **Scope** — Same in-scope UIDs as the requirements closeout for this PR tip.
2. **Trace** — Exactly one Implementation `@relation(..., scope=range_start, role=Implementation)` per UID (template or class method as appropriate).
3. **Match** — Software realizes the SHALL; status/behavior from the verb.
4. **Quality** — Logic and error paths sound; fail-fast; no god files / bypassed helpers.
5. **Third parties** — Optimal use of Elysia, Angular, Tailwind, Eden Treaty, Prismabox, Bun/mise; flag reinvented stack coverage.
6. **Verdict** — PASS / FAIL. Allowed without waiting: missing/duplicate `@relation`, trivial. Not silent: requirement intent changes.

## Orchestration

Peer with `requirements-closeout-review` and `test-closeout-review`; then `kaneo-task-closeout` on master merge.
