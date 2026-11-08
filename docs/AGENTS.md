# Documentation Instructions

Project guidelines (ALM, skills, profiles, memories): [`.agents/agents.md`](../.agents/agents.md). Architecture memories: [`.agents/memories/`](../.agents/memories/).

## Tech Stack

- Language/Runtime: Python
- Frameworks: StrictDoc
- Package manager: Mise

## Commands

- Export Docs: `mise export` / `mise run //:export`
- Dev server: `mise server`

## Requirements Style & Conventions

- Prefer parent requirement links over derived requirements.
- Every requirement should be limited to a single feature (PIR), functionality (HLR), or implementation detail (LLR). A parent link does not count as coverage when the statement does not require that behavior.
- LLRs stay implementation-agnostic (describe required behavior and presentation, not libraries or APIs such as Tailwind class names or breakpoints). Software may use adopted third parties to satisfy them.
- When requirements are changed, the CHANGE_DRIVER field should be appended with the driving ALM task ID, the REVIEW_STATUS should be set to Changed.
- When requirements are reviewed at the end of a task, and no more issues are identified, after confirmation from a human operator, the REVIEW_STATUS should be set to Approved.

## Frontend displayed-element LLRs

For every frontend element shown to the user, add a **subsection named for that element** with **three** low-level requirements. Titles (not UID suffixes) are:

1. **Semantic** — MHI/HMI function: what the element contains, where it gets data, what input it accepts, where outputs go.
2. **Syntactic** — Placement, form factor, interaction with other elements, resize behavior with the element and page.
3. **Lexical** — Font, text size, weight/style, colors, backgrounds (use theme tokens where applicable).

UIDs stay normal sequential IDs (no `-SEMANTIC` / `-SYNTACTIC` / `-LEXICAL` suffixes). Distinguish the triad via the subsection and those titles.

## Do

- Follow existing patterns in the documentation
- Keep changes focused and minimal

## Don't

- Introduce new dependencies without a clear reason
- Bypass existing utility checks / helpers
