---
id: weekly-third-party-optimize
name: Weekly third-party optimization scan
description: >-
  Scan the workspace for suboptimal or reinvented use of the adopted stack and
  file Kaneo Defect tasks (no auto-fixes).
enabled: true
intervalMinutes: 10080
runOnStartup: false
---

# Weekly third-party optimization

## Purpose

Compare workspace code to adopted-stack practice (Elysia, Angular, Tailwind, Eden Treaty, Bun/mise, Prismabox, etc.) and find suboptimal or reinvented usage.

## Rules

- Use Kaneo MCP; create tasks via `.agents/skills/kaneo-create-task/SKILL.md` with **Issue Type = Defect**.
- One Defect per distinct opportunity (or one grouped Defect with a checklist if findings are tiny).
- Cite docs/URL + code locus; labels Backend/Frontend/Public/Member as fits.
- Do **not** mark DoR Satisfied; do **not** auto-implement fixes in this run.
- Prefer `software` / `requirements` / `test` profiles only to judge findings — not to ship fixes here.

## Steps

1. Skim recent changes and known hotspots vs `gssc5-web/AGENTS.md` and architecture memories.
2. Flag reinvented CSS/media queries Tailwind covers, custom HTTP clients where Eden Treaty fits, hand-rolled cookie/session vs Elysia cookies, etc.
3. File Defect(s); leave Not Ready / Planned as appropriate.
4. Report count of Defects filed (or none).
