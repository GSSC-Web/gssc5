---
id: weekly-defect-analysis
name: Weekly defect analysis
description: >-
  Scan for defects vs requirements, orphaned SW, security, or consistency holes;
  file or refine Kaneo Defect tasks (no auto-fixes; no duplicate tickets).
enabled: true
intervalMinutes: 10080
runOnStartup: false
---

# Weekly defect analysis

## Purpose

Scan for defects: missing/wrong/extra behavior vs requirements, away-from-requirements (orphaned SW), security issues, or reasoning/consistency holes.

## Rules

- Use Kaneo MCP; create only via `.agents/skills/kaneo-create-task/SKILL.md` with **Issue Type = Defect**, and only after the dedupe check below.
- One Defect per distinct issue; link related PLLR/BHLR/BLLR UIDs when known.
- Labels Backend/Frontend/Public/Member as fits.
- Do **not** mark DoR Satisfied; do **not** auto-implement fixes in this run.
- Prefer `requirements` / `software` / `test` profiles to classify findings only.
- **Cross-scanner:** If `weekly-third-party-optimize` already has (or would have) the same issue, share one ticket — refine it; do not file twice.

## Dedupe before create

Use the GSSC5 Kaneo project via MCP (list/discover projects; do not embed opaque project ids in repo docs).

1. Before creating, search Kaneo for **open** Defects/optimization tickets matching the same locus / symptom / optimization (title keywords, description paths, UIDs).
2. **Match** = same primary code path, same requirement UID gap, or clearly the same optimization opportunity — **not** merely the same label.
3. **If match:** refine that task (description, Implementation note, locus/scope); add a comment with week date + what changed. Leave status unless owner policy says otherwise. Do **not** create a new number.
4. **If no match:** create via `kaneo-create-task` (Issue Type Defect, DoR Satisfied false, Fix Version Future, no auto-fix).
5. **If match and nothing material changed:** leave the task unchanged; count as unchanged-skipped.

## Steps

1. Sample StrictDoc vs recent SW/tests for mismatches and orphans.
2. Note security/consistency holes without exploiting them; describe locus and expected behavior.
3. For each distinct finding, run **Dedupe before create**; create or refine accordingly.
4. Report counts: **created** vs **refined** vs **unchanged-skipped** (or none).
