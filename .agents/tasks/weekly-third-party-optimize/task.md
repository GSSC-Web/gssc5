---
id: weekly-third-party-optimize
name: Weekly third-party optimization scan
description: >-
  Scan the workspace for suboptimal or reinvented use of the adopted stack and
  file or refine Kaneo Defect tasks (no auto-fixes; no duplicate tickets).
enabled: true
intervalMinutes: 10080
runOnStartup: false
---

# Weekly third-party optimization

## Purpose

Compare workspace code to adopted-stack practice (Elysia, Angular, Tailwind, Eden Treaty, Bun/mise, Prismabox, etc.) and find suboptimal or reinvented usage.

## Rules

- Use Kaneo MCP; create only via `.agents/skills/kaneo-create-task/SKILL.md` with **Issue Type = Defect**, and only after the dedupe check below.
- One Defect per distinct opportunity (or one grouped Defect with a checklist if findings are tiny).
- Cite docs/URL + code locus; labels Backend/Frontend/Public/Member as fits.
- Do **not** mark DoR Satisfied; do **not** auto-implement fixes in this run.
- Prefer `software` / `requirements` / `test` profiles only to judge findings — not to ship fixes here.
- **Cross-scanner:** If `weekly-defect-analysis` already has (or would have) the same issue, share one ticket — refine it; do not file twice.

## Dedupe before create

Use the GSSC5 Kaneo project via MCP (list/discover projects; do not embed opaque project ids in repo docs).

1. Before creating, search Kaneo for **open** Defects/optimization tickets matching the same locus / symptom / optimization (title keywords, description paths, UIDs).
2. **Match** = same primary code path, same requirement UID gap, or clearly the same optimization opportunity — **not** merely the same label.
3. **If match:** refine that task (description, Implementation note, locus/scope); add a comment with week date + what changed. Leave status unless owner policy says otherwise. Do **not** create a new number.
4. **If no match:** create via `kaneo-create-task` (Issue Type Defect, DoR Satisfied false, Fix Version Future, no auto-fix).
5. **If match and nothing material changed:** leave the task unchanged; count as unchanged-skipped.

## Steps

1. Skim recent changes and known hotspots vs `gssc5-web/AGENTS.md` and architecture memories.
2. Flag reinvented CSS/media queries Tailwind covers, custom HTTP clients where Eden Treaty fits, hand-rolled cookie/session vs Elysia cookies, etc.
3. For each distinct finding, run **Dedupe before create**; create or refine accordingly.
4. Report counts: **created** vs **refined** vs **unchanged-skipped** (or none).
