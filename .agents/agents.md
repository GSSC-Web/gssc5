# GSSC5 agent guidelines

Layout follows the [Dot Agents Protocol](https://dotagentsprotocol.com). This file is the project source of truth (not a duplicate root `AGENTS.md`).

## Overview

GSSC 5.0 is a from-scratch rebuild of the Genealogical Society of Stanislaus County site: requirements-driven (StrictDoc) plus a Bun monorepo with a shared backend and two Angular frontends.

| Path | Role |
| --- | --- |
| `docs/` | StrictDoc requirements and docs tooling |
| `gssc5-web/` | Bun apps: backend (Elysia), public + members (Angular) |
| `.agents/` | Agent guidelines, skills, profiles, tasks, memories |

Scoped routers (domain detail only): `docs/AGENTS.md`, `gssc5-web/AGENTS.md`.

## Commands

- Install tools: `mise install`
- Install deps: `mise run install`
- Prefer focused mise tasks under `gssc5-web/` (e.g. `mise run //public:test`, `//backend:test`, `//:export`)

## Core rules

- Kaneo ALM owns task scope, board columns, and Fix Version.
- Software and tests flow from requirements. Tests must not conform to software; software must not conform to tests.
- Requirements: exactly one `SHALL` per statement (see `docs/AGENTS.md`, requirements profile).
- Fix a failing test when the test is wrong. If software or requirements are the cause, ask before changing them.
- Prefer optimal use of adopted third parties (Elysia, Angular, Tailwind, Eden Treaty, Bun/mise, Prismabox) over custom reinvention.
- Never commit secrets. Keep skills out of app build artifacts.
- Protocol’s `skill.md` maps to Cursor’s `SKILL.md` here.

## Kaneo board (project GSSC5)

- Open PR → status **Ready for Review** (`in-review`).
- **Done** only on merge to **master** with Fix Version **v5.0.0** (use **Future** until then).
- DoR Satisfied only when Definition of Ready is met; DoD Satisfied only when Done.
- Integration-only land ≠ Done.
- Wire MCP via `.agents/mcp.json` (placeholders only): Kaneo + **GSSC-LangGraph**.

## Short-lived ticket bots (GSSC-LangGraph)

Default for one-shot implement / test / closeout workers on matching Kaneo tickets:

**SoftDev → implement → TestDev → Closeout** via MCP namespace `GSSC-LangGraph` (`GSSC_Software_Dev`, `GSSC_Test_Development`, `GSSC_Closeout_Review`; plus `GSSC_Health` / `GSSC_Conversation` as needed).

- Skill: `.agents/skills/gssc-langgraph-ticket/SKILL.md`
- Call graphs **from the worker** (no JSON-relay subagent).
- Closeout needs real `changeSet.files` (path/status) and unified `diff --git` — not prose; keep payloads lean.
- Owner closeout ask ⇒ Approve in-scope requirements on PASS (`REVIEW_STATUS: Approved`).
- Steer SoftDev/TestDev with FE/BE paths + arch memories (not LangGraph Python packaging).
- Tool friction → Kaneo project **GSSC LangGraph**.

## Skills

Read `.agents/skills/<name>/SKILL.md` when relevant:

| Skill | When |
| --- | --- |
| `gssc-langgraph-ticket` | Short-lived SoftDev → implement → TestDev → Closeout via GSSC-LangGraph |
| `requirements-closeout-review` | Approve/reject in-scope HLR+LLR before merge |
| `software-closeout-review` | SW vs requirements + Implementation `@relation` |
| `test-closeout-review` | Tests vs requirements + Test `@relation` |
| `backlog-grooming` | ALM refinement / wave prep |
| `kaneo-unblock-reeval` | After Done: promote unblock-eligible targets |
| `kaneo-task-closeout` | Master merge closeout fields + unblock |
| `kaneo-task-ready` | Promote Not Ready → Ready to Start |
| `kaneo-create-task` | Create Defect / Enhancement / Planned tasks |

Full requirement closeout = three review skills (short-lived bots: run `GSSC_Closeout_Review` first per `gssc-langgraph-ticket`), then `kaneo-task-closeout` when audits PASS and PR merges to master.

## Agent profiles

Load when acting in that role (short loop; do not restate skill bodies):

- `.agents/agents/requirements/agent.md`
- `.agents/agents/software/agent.md`
- `.agents/agents/test/agent.md`

## Architecture memories

Durable stack facts (not wave status). Load the matching memory so SoftDev/TestDev stay on gssc5 FE/BE — not the LangGraph Python service:

| Memory | Domain |
| --- | --- |
| `.agents/memories/public-arch.md` | Public Angular + Tailwind (`gssc5-web/apps/public`) |
| `.agents/memories/members-arch.md` | Members Angular + Tailwind (`gssc5-web/apps/members`) |
| `.agents/memories/backend-arch.md` | Backend Elysia + Bun + Prisma (`gssc5-web/apps/backend`) |

## Weekly tasks

Repeat every 7 days; Kaneo **Defect** tasks only — no auto-fixes. Create only when no equivalent open Defect/optimization ticket exists; otherwise refine that ticket. Cross-scanner findings that are the same issue share one ticket. New Defects always go to **Planned backlog** (`planned`), regardless of priority. Refines leave column alone unless owner policy demotes a below-High Defect still on Not Ready. See `kaneo-create-task`.

- `.agents/tasks/weekly-third-party-optimize/task.md`
- `.agents/tasks/weekly-defect-analysis/task.md`

## Host prompt

Reusable host system prompt: `.agents/system-prompt.md`.
