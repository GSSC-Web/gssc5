---
name: backlog-grooming
description: >-
  General Kaneo/GSSC backlog grooming and ALM refinement: capture owner answers,
  build a task matrix (scope/DoR/DoD/deps/modify|create), update Kaneo fields and
  block relations, set board columns from DoR, fan out cluster writers, verify
  parent Work Type unions. Use for ALM refinement, backlog grooming, wave
  planning, or preparing tickets before a code wave.
---

# Backlog Grooming (Kaneo ALM refinement)

**When:** Owner asks for backlog grooming, ALM refinement, wave planning, or preparing Kaneo tickets before implementation. Codifies the Frontend ALM planning pass (plan + answers + lead/cluster fan-out).

**Result:** A written matrix, Kaneo leaves/parents updated consistently, board columns matching DoR, and a short report of Ready / Not Ready / Planned / deferred.

**Prefs:** `/cursor/stores/self/preferences.md`, `docs/imported-preferences.md`. Historical example: `docs/frontend-alm-plan.md`, `docs/frontend-alm-answers.md`, `artifacts/plans/frontend_alm_planning_feb98102.plan.md`.

**Related:** After a task hits **Done** on master, run [Kaneo Unblock Reevaluation](/cursor/stores/self/workflows/kaneo-unblock-reeval.md). For LLR approval at PR end, use skill `llr-closeout-audit`.

## Principles

- **Requirements-driven:** expand ALM from HLR/owner scope; do not invent features.
- **Ask before writing** when segment, wave order, in/out, or DoR/DoD templates are open.
- **Refine at will** when facts are obvious; edge cases can wait until wave start.
- **No code** in a grooming-only pass unless the owner also starts implementation.
- **Backend only when FE cannot ship without it**; pure backend stays out until needed.
- **Parallelism OK** when there is no functional dependency; name deps in DoR and Kaneo `blocks`.

## Phase 1 — Capture answers

Ask only what is still open. Cover:

1. **Segment & order** — in/out of this effort; wave sequence; member FE yes/no; board rule for prepared vs Planned.
2. **Scope per cluster** — keep / split / merge / defer / rename; create gaps only after Q&A.
3. **DoR / DoD templates** — defaults and exceptions; any DoR N/A + Satisfied true.
4. **Dependencies & labels** — hard edges; Frontend and/or Backend label rows **per task id** (never rewrite `taskId` null templates).
5. **ALM hygiene** — recommended branch names; GitHub issue on start; Fix Version **Future** until master merge → then release (e.g. **v5.0.0**); open PR → Kaneo **Ready for Review**; **Done** only on merge to landing target (**master** for final). Integration-only land ≠ Done.

Write durable answers under `/cursor/stores/self/docs/` (e.g. `*-alm-answers.md`).

## Phase 2 — Matrix

Produce a matrix (task → action modify|create, wave, column after prep, DoR Satisfied, depends, one-line scope). Store under `/cursor/stores/self/docs/` (e.g. `*-alm-plan.md`).

**Board rule (default):** after field prep for in-scope work → **Not Ready** unless **DoR Satisfied** → then **Ready to Start**. Planned/backlog stays Planned until the owner pulls it into a wave.

### DoR / DoD defaults (FE)

| | Default |
| --- | --- |
| **DoR** | Always HLR ready. Generics also need test framework Done. Pages also need test framework + required generics. Name functional deps. |
| **DoD** | Scope complete and merged to landing target; tests passing; Fix Version set. One terse DoD line on the task. |

Adjust per owner answers; do not invent stricter gates.

## Phase 3 — Kaneo field prep

For each in-scope leaf (and parents as needed):

| Field | Guidance |
| --- | --- |
| Description | Scope from HLRs/owner; no GitHub `<sub>Task` line on Kaneo. If GitHub syncs, update GitHub body first. |
| Issue Type | Planned / Enhancement / etc. as appropriate |
| Work Type | Leaf: typically LLR, SW, STD (+ BHLR only if HLR text must change). **Parent Work Type = union of children.** |
| Definition of Ready | Terse; name wave/deps |
| DoR Satisfied | `true` only when DoR text is met |
| Definition of Done | One terse line |
| DoD Satisfied | `false` until Done |
| Fix Version | **Future** until master merge |
| Implementation | Empty until PR exists; then one concise line |
| Labels | Frontend and/or Backend **new row per task id** |

**Relations:** prefer Kaneo `blocks` / subtask / related over prose-only deps. Parents own the dependency graph and Work Type unions.

**Create vs modify:** expand existing tickets first; **create** only for confirmed gaps (never duplicate roots/shells).

**Out of wave:** leave Planned (or deferred); DoR Satisfied false; do not promote Phase-2/backlog enhancements unless the owner includes them.

## Phase 4 — Fan-out (optional)

When the matrix is large:

```text
Owner answers → Coordinator matrix
  → Lead (parents + graph + Work Type unions)
    → Cluster writers (leaves only; Kaneo MCP; no code)
  → Lead verify (re-read Kaneo; column/DoR consistency)
```

- Lead serializes parent updates and block edges.
- Cluster agents expand/create leaves only; no implementation.
- Coordinator links the matrix doc; no code agents until ALM Ready **and** the owner starts a code wave.

## Phase 5 — Verify & report

Re-read Kaneo for every touched ticket. Fix:

- Parent Work Type missing a child type
- Column vs DoR Satisfied mismatches
- Missing or inverted `blocks`
- Duplicate ownership (e.g. two tickets claiming the same root)

Report: Ready to Start / Not Ready (and why) / Planned-deferred / created / renamed / cancelled.

## Out of scope for grooming-only

- Implementing SW/STD or approving LLR text (propose gaps; closeout audit approves at PR end)
- Starting the next code wave without owner go-ahead
- Member FE / deferred domains unless the owner pulls them into the segment
