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
- Fix a failing test when the test is wrong. If software or requirements are the cause, ask before changing them.
- Prefer optimal use of adopted third parties (Elysia, Angular, Tailwind, Eden Treaty, Bun/mise, Prismabox) over custom reinvention.
- Never commit secrets. Keep skills out of app build artifacts.
- Protocol’s `skill.md` maps to Cursor’s `SKILL.md` here.

## Kaneo board (project GSSC5)

- Open PR → status **Ready for Review** (`in-review`).
- **Done** only on merge to **master** with Fix Version **v5.0.0** (use **Future** until then).
- DoR Satisfied only when Definition of Ready is met; DoD Satisfied only when Done.
- Integration-only land ≠ Done.
- Wire MCP via `.agents/mcp.json` (placeholders only).

## Skills

Read `.agents/skills/<name>/SKILL.md` when relevant:

| Skill | When |
| --- | --- |
| `requirements-closeout-review` | Approve/reject in-scope HLR+LLR before merge |
| `software-closeout-review` | SW vs requirements + Implementation `@relation` |
| `test-closeout-review` | Tests vs requirements + Test `@relation` |
| `backlog-grooming` | ALM refinement / wave prep |
| `kaneo-unblock-reeval` | After Done: promote unblock-eligible targets |
| `kaneo-task-closeout` | Master merge closeout fields + unblock |
| `kaneo-task-ready` | Promote Not Ready → Ready to Start |
| `kaneo-create-task` | Create Defect / Enhancement / Planned tasks |

Full requirement closeout = three review skills, then `kaneo-task-closeout` when audits PASS and PR merges to master.

## Agent profiles

Load when acting in that role (short loop; do not restate skill bodies):

- `.agents/agents/requirements/agent.md`
- `.agents/agents/software/agent.md`
- `.agents/agents/test/agent.md`

## Architecture memories

Durable stack facts (not wave status):

- `.agents/memories/public-arch.md`
- `.agents/memories/members-arch.md`
- `.agents/memories/backend-arch.md`

## Weekly tasks

Repeat every 7 days; file Kaneo **Defect** tasks only — no auto-fixes:

- `.agents/tasks/weekly-third-party-optimize/task.md`
- `.agents/tasks/weekly-defect-analysis/task.md`

## Host prompt

Reusable host system prompt: `.agents/system-prompt.md`.
