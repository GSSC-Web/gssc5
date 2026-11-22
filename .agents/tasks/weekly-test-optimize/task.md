---
id: weekly-test-optimize
name: Weekly test optimization
description: >-
  Analyze the test suite for under/over verification and antipatterns, run the
  full suite and diagnose failures, and adhoc-browser 10 random features;
  file or refine Kaneo backlog tasks only (no auto-fixes; no duplicate tickets).
enabled: true
intervalMinutes: 10080
runOnStartup: false
---

# Weekly test optimization

## Purpose

Analyze the test suite for under/over verification and antipatterns, run the full suite and diagnose failures, and adhoc-browser 10 random site features. File or refine Kaneo backlog tasks only — no auto-fixes.

## Rules

- Use Kaneo MCP; create only via `.agents/skills/kaneo-create-task/SKILL.md`, and only after the dedupe check below.
- **Issue Type:** **Defect** for bugs, broken quality, suite failures, under/over verification, or antipatterns; **Enhancement** only for pure UI/UX improvement ideas that are not defects (Phase C).
- One backlog task per distinct issue; link related PLLR/BHLR/BLLR UIDs when known.
- Labels Backend/Frontend/Public/Member as fits.
- Do **not** mark DoR Satisfied; do **not** auto-implement fixes in this run.
- Prefer the `test` profile + `.agents/skills/test-closeout-review/SKILL.md` criteria to judge findings — do **not** rewrite tests here.
- **No modifications** to application SW, requirements, or tests during this run — Kaneo backlog + a short weekly report doc only.
- Write a dated report under the Project store `docs/` when this Project runs it (e.g. `docs/weekly-test-optimize-YYYY-MM-DD.md`). SoftDev landing this task definition must **not** invent a fake run report.
- **Cross-scanner:** If `weekly-defect-analysis` or `weekly-third-party-optimize` already has (or would have) the same issue, share one ticket — refine it; do not file twice.

## Dedupe before create

Use the GSSC5 Kaneo project via MCP (list/discover projects; do not embed opaque project ids in repo docs).

1. Before creating, search Kaneo for **open** Defects/optimization tickets matching the same locus / symptom / optimization (title keywords, description paths, UIDs).
2. **Match** = same primary code path, same requirement UID gap, or clearly the same optimization opportunity — **not** merely the same label.
3. **If match:** refine that task (description, Implementation note, locus/scope); add a comment with week date + what changed. Do **not** create a new number. Do **not** change column unless owner policy applies (e.g. demote a medium/low/no-priority Defect still on Not Ready → `planned`).
4. **If no match:** create via `kaneo-create-task` (Issue Type Defect or Enhancement as above, DoR Satisfied false, Fix Version Future, no auto-fix). New Defects always go to **Planned backlog** (`status: planned`), regardless of priority. Enhancements: Planned backlog or Not Ready as appropriate for Issue Type.
5. **If match and nothing material changed:** leave the task unchanged; count as unchanged-skipped.

## Steps

### Phase A — Suite analysis (static / Spec↔test)

1. For in-scope StrictDoc LLRs with Test `@relation` markers: find tests that **fail to verify** their requirement (weak/missing asserts, wrong target, harness-only), or that **verify more than** their requirement (extra behavior, SW coupling, unrelated asserts).
2. Find tests implemented with **antipatterns** (examples: asserts on SW internals instead of requirement; `getComputedStyle` where theme classes are required for Public FE Lexical; redundant suite weight; missing/duplicate Test `@relation`; multiple `test()` for one LLR or one test covering many LLRs).
3. Prefer the `test` profile + `test-closeout-review` criteria to judge — do not rewrite tests here.
4. For each distinct finding, run **Dedupe before create**; create or refine accordingly.

### Phase B — Full suite run + failure diagnosis

1. Run the full test suite via mise under `gssc5-web/` (prefer monorepo tasks documented in `gssc5-web/AGENTS.md`, e.g. `mise test`, `mise run //public:test`, `mise run //members:test`, `mise run //e2e:test`, and backend unit targets beside sources).
2. On failures: diagnose root cause (test wrong vs SW vs requirements vs flake/env). Do **not** change product code, requirements, or tests in this run.
3. Once diagnosed, file/refine a Kaneo backlog task per distinct failure (include failing command, locus, diagnosis, suggested fix direction).

### Phase C — Adhoc browser QA (10 random features)

1. Start the local/dev stack as documented (backend + public and/or members as needed).
2. Manually exercise **10 randomly chosen** site features in a real browser (computer-use / browser tools). Cover a mix of Public and Members when both can run.
3. Look for quality issues, bugs, and UI/UX improvements.
4. File Kaneo backlog tasks: **Defect** for bugs / broken quality; **Enhancement** for pure UI/UX improvement ideas that are not defects. Still Planned backlog for Defects; still dedupe. Attach or cite screenshots in the Kaneo description/comment when useful (store under the agent run’s media if available; do not commit binaries to the repo).

### Report

Report counts: **created** vs **refined** vs **unchanged-skipped** (or none). Write the dated Project store `docs/` report when this Project runs the task.
