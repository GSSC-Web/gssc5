# gssc5-web Instructions

Project guidelines (ALM, skills, profiles): [`.agents/agents.md`](../.agents/agents.md). Stack memories: [`.agents/memories/public-arch.md`](../.agents/memories/public-arch.md), [members-arch.md](../.agents/memories/members-arch.md), [backend-arch.md](../.agents/memories/backend-arch.md).

## Tech Stack

- Language/Runtime: Documentation via StrictDoc. Software and Testing via Typescript/HTML/CSS with Bun
- Frameworks: Angular and Elysia
- Key libraries: Eden Treaty, Prismabox, and TailwindCSS
- Package manager: Mise and Bun

## Commands

- Dev server: `mise dev`
- Build: `mise build`
- Test: `mise test`

Prefer running single test files when iterating (faster feedback).

## Code Style & Conventions

- Naming: Prefer descriptive types to descriptive names. Names should increase in descriptiveness with greater scope.
- Prefer named exports over default exports
- Import style: `import {} from "";`
- Error handling pattern: Fail-fast; check valid-invalid early, and avoid unnecessary nesting and exceptions.
- Public FE theme tokens live on `:root` in `apps/public/src/styles.css` (`--gssc-*`); prefer them over hard-coded colors. Outermost shell background is white; default typeface is sans-serif unless a requirement says otherwise.
- Prefer optimal use of adopted third parties (Tailwind utilities, Eden Treaty, Prismabox, framework APIs) over bespoke reinventing. Example: responsive show/hide via `sm:` / `hidden` / `block` rather than custom `@media` CSS when Tailwind covers it.

## Do

- Follow existing patterns in the codebase, or else conform to framework documentation recommendations. (see example files below)
- Run relevant tests after making changes
- Keep changes focused and minimal
- Tests are permanent files, and each LLR should have a dedicated unit test. Backend: shared harness at `apps/backend/src/test-harness.ts` with `*.test.ts` beside sources. Public frontend: shared harness at `apps/public/src/test-harness.ts` with `*.test.ts` beside sources; run via `mise run //public:test`.

## Don't

- Introduce new dependencies without a clear reason
- Create large god files or components
- Bypass existing utility functions / helpers
- Create a new stack for new implementation; the existing backend and frontends should be modified in place.

## Reference Examples

- Backend: `apps/backend/src/user/accounts.ts` and `apps/backend/src/user/accounts.test.ts`
- Public frontend harness: `apps/public/src/test-harness.ts`, smoke `apps/public/src/app/app.test.ts`
