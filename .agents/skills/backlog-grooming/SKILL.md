---
id: backlog-grooming
name: backlog-grooming
description: >-
  Kaneo/GSSC backlog grooming and ALM refinement: capture owner answers,
  task matrix (scope/DoR/DoD/deps/modify|create), Kaneo fields and block
  relations, board columns from DoR, optional cluster fan-out, parent Work
  Type unions. Use for ALM refinement, wave planning, or pre-code prep.
enabled: true
---

# Backlog grooming

**When:** Owner asks for backlog grooming, ALM refinement, wave planning, or preparing Kaneo tickets before implementation.

**Result:** Written matrix; Kaneo leaves/parents consistent; columns match DoR; short Ready / Not Ready / Planned / deferred report.

## Principles

- Requirements-driven; ask when segment/order/DoR templates are open.
- No code in a grooming-only pass.
- Backend only when FE cannot ship without it.
- Parallelism OK without functional deps; name deps in DoR and Kaneo `blocks`.

## Steps

1. **Capture answers** — segment/order; scope per cluster; DoR/DoD templates; labels; ALM hygiene (branch names, GitHub issue, Fix Version Future→v5.0.0, PR→Ready for Review, Done on master only).
2. **Matrix** — task → modify|create, wave, column, DoR Satisfied, depends, one-line scope.
3. **Kaneo prep** — description, Issue Type, Work Type (parent = union of children), DoR/DoD + Satisfied flags, Fix Version Future, Implementation empty until PR, labels per task id; prefer `blocks` relations.
4. **Fan-out (optional)** — lead owns parents/graph; cluster writers expand leaves only.
5. **Verify** — re-read touched tickets; fix Work Type unions, column vs DoR, inverted `blocks`, duplicate ownership.

## Related skills

- After Done on master: `kaneo-unblock-reeval`
- Promote ready: `kaneo-task-ready`
- Create gaps: `kaneo-create-task`
- PR-end reviews: `requirements-closeout-review`, `software-closeout-review`, `test-closeout-review`
