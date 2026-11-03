# Documentation Instructions

## Tech Stack
- Language/Runtime: Python
- Frameworks: StrictDoc
- Package manager: Mise

## Project Structure
- `docs/` — project documentation
- `gssc5-web/` — main application code and unit tests

## Commands
- Export Docs: `mise export`
- Dev server: `mise server`

## Requirements Style & Conventions
- Prefer parent requirement links over derived requirements.
- Every requirement should be limited to a single feature (PIR), functionality (HLR), or implementation detail (LLR). A parent link does not count as coverage when the statement does not require that behavior.
- When requirements are changed, the CHANGE_DRIVER field should be appended with the driving ALM task ID, the REVIEW_STATUS should be set to Changed.
- When requirements are reviewed at the end of a task, and no more issues are identified, after confirmation from a human operator, the REVIEW_STATUS should be set to Approved.

## Do
- Follow existing patterns in the documentation
- Keep changes focused and minimal

## Don't
- Introduce new dependencies without a clear reason
- Bypass existing utility checks / helpers
