---
id: gssc-langgraph-ticket
name: gssc-langgraph-ticket
description: >-
  Default SoftDev → implement → TestDev → Closeout loop for short-lived
  Kaneo tickets via GSSC-LangGraph MCP. Use for one-shot implement / test /
  closeout workers when the job matches those graphs.
enabled: true
---

# GSSC-LangGraph ticket loop

**When:** Short-lived bots (typed subagents, one-shot implement / test / closeout workers) on a Kaneo GSSC5 ticket whose work matches SoftDev, TestDev, or Closeout. Prefer these graphs over inventing prompt-only loops. Long-running PR owners may still call the same graphs for plan / closeout slices.

**Result:** Plan from SoftDev, SW (+ STD) on a branch from `origin/master`, TestDev when tests change, Closeout PASS with real `changeSet`, then peer closeout skills (Approve in-scope reqs on PASS) and Kaneo Ready for Review.

## MCP

Namespace: `GSSC-LangGraph` (wire via `.agents/mcp.json`; auth with `mcp_auth` when needsAuth/error).

| Tool | Use |
| --- | --- |
| `GSSC_Software_Dev` | Plan + post-impl SW checks |
| `GSSC_Test_Development` | Test plan / checks when STD changes |
| `GSSC_Closeout_Review` | Peer closeout before Ready for Review |
| `GSSC_Health` | Connectivity smoke |
| `GSSC_Conversation` | Model-free echo / thread utility |

Call graphs **directly from the worker**. Do not spawn a subagent whose job is only to “load JSON forever” or relay MCP payloads.

## Default loop

1. **SoftDev** — `GSSC_Software_Dev` with `goal` + `requirements` from the Kaneo description; `label` = ticket id (e.g. `GSSC5-63`). Name the domain explicitly (public FE / members FE / backend).
2. **Implement** — Fresh branch from `origin/master`; follow SoftDev plan + in-scope LLRs; add Implementation `@relation` markers; prefer adopted third parties.
3. **TestDev** — When adding/updating permanent tests: `GSSC_Test_Development` with the same `label` and a lean `changeSet` of test (and related) paths. Map one `test()` per LLR + Test `@relation`.
4. **Closeout** — Worker calls `GSSC_Closeout_Review` with real change data (below), then runs the three closeout skills. Owner closeout ask ⇒ Approve in-scope HLR+LLR on PASS (`REVIEW_STATUS: Approved`).
5. **Board** — Open PR → Kaneo Ready for Review; `kaneo-task-closeout` only after master merge.

## Domain (avoid LangGraph/Python bias)

SoftDev/TestDev specialize FE vs BE vs langgraph service. For **gssc5** tickets, steer with paths + memories — never treat Angular/Elysia work as Python/`src/gssc_langgraph` packaging.

| Domain | Paths | Memory | Harness hints |
| --- | --- | --- | --- |
| Public FE | `gssc5-web/apps/public/` | `.agents/memories/public-arch.md` | `mise run //public:test` / focused `ng test` |
| Members FE | `gssc5-web/apps/members/` | `.agents/memories/members-arch.md` | members mise / focused `ng test` |
| Backend | `gssc5-web/apps/backend/` | `.agents/memories/backend-arch.md` | `mise run //backend:test` / `bun test` beside sources |

Put FE/BE labels and concrete paths in `goal` / `requirements`. On mixed BE+FE changeSets, expect dual-domain guidance; if a plan is winner-take-all wrong domain, correct from memories/paths and file friction on **GSSC LangGraph**.

## Closeout payload (required)

`GSSC_Closeout_Review` needs a populated change set — **prose/summary `diff` alone fails** (empty scope).

Pass at least:

- `changeSet`: `{ label, files: [{ path, status }] }` where `status` is `added` | `modified` | `deleted` | `unchanged`
- Unified `diff` (top-level and/or `changeSet.diff`) starting with `diff --git` headers (e.g. `git diff --stat` for files + `git diff` / `git format-patch`-style unified hunks)

Also useful: `kaneoTaskId`, `uids` when known, `label` = ticket id.

**Lean payloads:** path + status (+ unified diff). Avoid stuffing full file `content`, nested Task JSON, or huge `gssc5Context` blobs into the call — the graph loads gssc5 context itself. Prefer path-only `changeSet.files` + unified diff over embedding every file body.

## After graph Closeout

Still apply:

1. `.agents/skills/requirements-closeout-review/SKILL.md` (PASS → `REVIEW_STATUS: Approved`)
2. `.agents/skills/software-closeout-review/SKILL.md`
3. `.agents/skills/test-closeout-review/SKILL.md`

Then Ready for Review; on master merge → `kaneo-task-closeout`.

## Feedback

Tool friction, schema gaps, domain misfires → Kaneo project **GSSC LangGraph** (refine open Defect or create one). Do not silently paper over bad SoftDev/TestDev domain plans without noting friction.
