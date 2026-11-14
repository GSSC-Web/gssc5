---
id: requirements-closeout-review
name: requirements-closeout-review
description: >-
  Closeout review of in-scope HLR and LLR: parent rules, CHANGE_DRIVER,
  REVIEW_STATUS, implementation-agnostic wording, appearance triad; PASS
  Approves or FAIL with UID + fix. Use before merge / when owner asks
  requirements closeout.
enabled: true
---

# Requirements closeout review

**When:** End of a Kaneo/GSSC task before merge, or owner asks for requirements closeout / former “LLR Closeout Audit” requirements half.

**Implicit approval:** If the owner asks for closeout (requirements closeout, LLR closeout audit, or the full closeout suite), treat that as approval of the in-scope requirements. Do **not** wait for a separate Approve confirmation.

**Result:** **PASS** → set in-scope HLR+LLR `REVIEW_STATUS: Approved`. **FAIL** → list `UID` + proposed fix; do not Approve.

## Steps

1. **Scope** — Include HLR/LLR with this task’s `CHANGE_DRIVER` (and owned service reqs this PR needs). Exclude drive-bys and deferred backlog unless owner named them.
2. **Parents** — LLRs parent only HLRs; HLRs parent only PIRs, **or** `DERIVED: True` with rationale and no parent. Prefer parents over derived.
3. **CHANGE_DRIVER / REVIEW_STATUS** — History complete; legal statuses Changed / Approved / Baselined; no silent non-trivial rewrites.
4. **Wording** — LLRs implementation-agnostic (behavior, not Tailwind/API names). Appearance triad (Semantic / Syntactic / Lexical) where a FE element is displayed (`docs/AGENTS.md`).
5. **Approve** — On PASS, set every in-scope HLR+LLR to `REVIEW_STATUS: Approved` in the same closeout commit/push. Owner closeout request is sufficient authority; do not leave `Changed` pending a second confirmation.
6. **Verdict** — PASS: Approve in-scope HLR+LLR (step 5). FAIL: do not Approve; wait on owner for non-trivial text changes.

## Orchestration

Short-lived bots: call `GSSC_Closeout_Review` first (real `changeSet` + `diff --git`; see `gssc-langgraph-ticket`), then this skill — owner closeout ask still means Approve on PASS.

After this and peer SW/test closeout skills PASS and PR merges to master → `kaneo-task-closeout`.
