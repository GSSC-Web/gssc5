---
id: kaneo-create-task
name: kaneo-create-task
description: >-
  Create a Kaneo GSSC5 task with Issue Type Defect, Enhancement, or Planned
  (Mustfix when needed); set priority, labels, custom fields; DoR Satisfied
  false unless promoting ready. Weekly tasks use Issue Type Defect.
enabled: true
---

# Kaneo create task

**When:** Need a new Kaneo leaf (gap from grooming, weekly scan Defect, owner ask). Prefer expanding existing tickets first.

**Result:** Created task with correct Issue Type and fields; DoR Satisfied false unless immediately promoting via `kaneo-task-ready`.

## Steps

1. Choose Issue Type: **Defect**, **Enhancement**, or **Planned** (Must Have when needed). Weekly scanners → **Defect**.
2. Set title, description (scope; no GitHub `<sub>Task` line on Kaneo), priority, labels (Backend / Frontend / Public / Member as fits — new row per task id).
3. Custom fields: Work Type as known; DoR/DoD terse; DoR Satisfied `false`; DoD Satisfied `false`; Fix Version **Future**.
4. Add `blocks` / parent relations instead of prose-only deps when known.
5. Column: Planned backlog or Not Ready as appropriate; do not auto-mark ready.
6. Do **not** implement fixes in the same weekly pass that filed the Defect.
