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

**Result:** **PASS** → set in-scope HLR+LLR `REVIEW_STATUS: Approved` (after human confirmation when required). **FAIL** → list `UID` + proposed fix; do not Approve.

## Steps

1. **Scope** — Include HLR/LLR with this task’s `CHANGE_DRIVER` (and owned service reqs this PR needs). Exclude drive-bys and deferred backlog unless owner named them.
2. **Parents** — LLRs parent only HLRs; HLRs parent only PIRs, **or** `DERIVED: True` with rationale and no parent. Prefer parents over derived.
3. **CHANGE_DRIVER / REVIEW_STATUS** — History complete; legal statuses Changed / Approved / Baselined; no silent non-trivial rewrites. On edit, **append** the task id to `CHANGE_DRIVER` (multiline block or comma list with all prior drivers) — never replace. Revert `CHANGE_DRIVER` / Changed when the requirement text was not actually changed.
4. **Wording** — Exactly one `SHALL` per statement; LLRs implementation-agnostic (behavior, not Tailwind/API names). Appearance triad (Semantic / Syntactic / Lexical) where a FE element is displayed (`docs/AGENTS.md`).
5. **Verdict** — PASS: Approve in-scope HLR+LLR. FAIL: do not Approve; wait on owner for non-trivial text changes.

## Orchestration

After this and peer SW/test closeout skills PASS and PR merges to master → `kaneo-task-closeout`.
