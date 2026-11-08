---
id: weekly-defect-analysis
name: Weekly defect analysis
description: >-
  Scan for defects vs requirements, orphaned SW, security, or consistency holes;
  file Kaneo Defect tasks (no auto-fixes).
enabled: true
intervalMinutes: 10080
runOnStartup: false
---

# Weekly defect analysis

## Purpose

Scan for defects: missing/wrong/extra behavior vs requirements, away-from-requirements (orphaned SW), security issues, or reasoning/consistency holes.

## Rules

- Use Kaneo MCP; create tasks via `.agents/skills/kaneo-create-task/SKILL.md` with **Issue Type = Defect**.
- One Defect per distinct issue; link related PLLR/BHLR/BLLR UIDs when known.
- Labels Backend/Frontend/Public/Member as fits.
- Do **not** mark DoR Satisfied; do **not** auto-implement fixes in this run.
- Prefer `requirements` / `software` / `test` profiles to classify findings only.

## Steps

1. Sample StrictDoc vs recent SW/tests for mismatches and orphans.
2. Note security/consistency holes without exploiting them; describe locus and expected behavior.
3. File Defect(s); leave Not Ready / Planned as appropriate.
4. Report count of Defects filed (or none).
