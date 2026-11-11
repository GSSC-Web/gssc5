---
id: kaneo-create-task
name: kaneo-create-task
description: >-
  Create a Kaneo GSSC5 task with Issue Type Defect, Enhancement, or Planned
  (Must Have when needed); set priority, labels, custom fields; DoR Satisfied
  false unless promoting ready. Weekly tasks use Issue Type Defect and must
  dedupe/refine open equivalents before create.
enabled: true
---

# Kaneo create task

**When:** Need a new Kaneo leaf (gap from grooming, weekly scan Defect, owner ask). Prefer expanding existing tickets first.

**Result:** Created task with correct Issue Type and fields; DoR Satisfied false unless immediately promoting via `kaneo-task-ready`. For weekly scanners: created **or** refined an existing open Defect — never a duplicate of the same issue.

## Dedupe / refine (required for weekly scanners; prefer for all Defects)

Use the GSSC5 Kaneo project via MCP (list/discover projects; do not embed opaque project ids in repo docs).

1. **Before create:** search Kaneo for open Defects (and optimization tickets) matching the same locus / symptom / optimization — title keywords, description paths, requirement UIDs.
2. **Match criteria:** same primary code path, same requirement UID gap, or clearly the same optimization opportunity. Same label alone is **not** a match.
3. **If match:** update that task (description, Implementation note, locus/scope as needed); add a comment with week date (when from a weekly scan) + what changed. Leave status unless owner policy says otherwise. Do **not** create a new ticket number.
4. **If match and nothing material changed:** skip create; report as unchanged-skipped.
5. **If no match:** proceed with create steps below.
6. **Cross-scanner:** a third-party optimize finding and a defect-analysis finding that are the same issue share one ticket; refine rather than file twice.
7. Callers (weekly tasks) report counts: **created** vs **refined** vs **unchanged-skipped**.

## Steps (create)

1. Choose Issue Type: **Defect**, **Enhancement**, or **Planned** (Must Have when needed). Weekly scanners → **Defect**.
2. Set title, description (scope; no GitHub `<sub>Task` line on Kaneo), priority, labels (Backend / Frontend / Public / Member as fits — new row per task id).
3. Custom fields: Work Type as known; DoR/DoD terse; DoR Satisfied `false`; DoD Satisfied `false`; Fix Version **Future**.
4. Add `blocks` / parent relations instead of prose-only deps when known.
5. Column: Planned backlog or Not Ready as appropriate; do not auto-mark ready.
6. Do **not** implement fixes in the same weekly pass that filed or refined the Defect.
