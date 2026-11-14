---
id: test-closeout-review
name: test-closeout-review
description: >-
  Closeout review that each in-scope LLR has one Test @relation and one test
  validating the requirement (not SW), with sound asserts and lean timing.
  Use before merge / test closeout.
enabled: true
---

# Test closeout review

**When:** End of a Kaneo/GSSC task before merge, or owner asks for test closeout.

**Result:** **PASS** or **FAIL** with `UID` + proposed fix.

## Steps

1. **Scope** — Same in-scope LLRs as peer closeout skills for this PR tip.
2. **Trace** — Exactly one Test `@relation(..., scope=range_start, role=Test)` per UID; one `test()` per LLR; markers immediately outside each `test()`; `role` after `scope`.
3. **Target** — Test validates the requirement, not the harness and not “whatever SW does.”
4. **Asserts** — Status from the verb; body/contents only when named. Public FE Lexical: prefer theme/utility **classes** over `getComputedStyle` (jsdom/`@layer` limits).
5. **Timing** — Prefer focused/fast harness runs; avoid redundant suite weight.
6. **Verdict** — PASS / FAIL. Fix wrong tests; ask if SW/requirements conflict.

## Orchestration

Short-lived bots: call `GSSC_Closeout_Review` first (lean real `changeSet`; see `gssc-langgraph-ticket`), then this skill. Peer with requirements + software closeout; then `kaneo-task-closeout` on master merge.
