---
id: kaneo-task-closeout
name: kaneo-task-closeout
description: >-
  After master merge: set Kaneo status Done, Fix Version v5.0.0, DoD Satisfied
  true; then run kaneo-unblock-reeval. Use when the landing PR merges to master.
enabled: true
---

# Kaneo task closeout

**When:** PR for the Kaneo task has merged to **master** (final landing). Not for integration-only land.

**Result:** Task Done with release Fix Version and DoD Satisfied; unblock reevaluation run.

## Steps

1. Confirm merge target is **master** and tip is on master.
2. Set status `done`, Fix Version `v5.0.0`, DoD Satisfied `true`. Leave Implementation as the concise PR/line already recorded.
3. Run `.agents/skills/kaneo-unblock-reeval/SKILL.md`.
4. Comment tip SHA + PR URL on the Kaneo task if not already noted.
