# Project Instructions

## Overview
GSSC 5.0 is a from-scratch rebuild of the Genealogical Society of Stanislaus County site: requirements-driven (StrictDoc) plus a Bun monorepo with a shared backend and two Angular frontends.

## Project Structure
- `docs/` — project documentation
- `gssc5-web/` — main application code and unit tests

## Commands
- Install: `mise run install`

## Additional Context
Refer to Kaneo ALM for task details. Software and tests flow from requirements. 
Tests should not conform to software, and software should not conform to tests. Fix a failing test when the test is wrong. If the software is the cause, ask before changing the software or the requirements.
Prefer optimal use of adopted third parties (e.g. Tailwind utilities) over custom reinventing; see `gssc5-web/AGENTS.md`.

## Agent skills
Project skills live under `.agents/skills/` (read `SKILL.md` when relevant):
- `llr-closeout-audit` — LLR Closeout Audit before merge
- `backlog-grooming` — Kaneo/ALM backlog refinement and wave prep
