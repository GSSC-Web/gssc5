# Public frontend

Angular application `@gssc/public`. It listens on port 4200.

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/public`.
- `mise test` runs Vitest once.
- `mise test:watch` re-runs Vitest when files change.

From the repository root, `mise serve`, `mise build`, and `mise test` include this app.

## Source layout

Under `src/app/`:

| Path | Role |
| --- | --- |
| `src/app/` | App root bootstrap (shell host, routes, config) |
| `src/app/modules/` | Feature modules; a multi-file class gets its own folder (e.g. `announcements-bar/`) |
| `src/app/pages/` | Public page components (stubs until page tickets land) |
| `src/app/services/` | Shared services, including `backend` (Eden Treaty) and `urgent-announcements` |

Keep the App Root files beside these folders (not inside `modules/`). Put new feature UI under `modules/`, pages under `pages/`, and injectable services under `services/`.

## Global styles

`src/styles.css` imports Tailwind theme, **preflight**, and utilities as separate layers. Rely on preflight for browser defaults; do not restate those resets in component CSS.

Symbols Nerd Font (for later UI symbols) is loaded there via `@font-face` from jsDelivr (`ryanoasis/nerd-fonts` Symbols-only) and exposed as `--font-nerd-symbols`.

## Testing harness (GSSC5-39)

Shared setup lives beside the app source:

| File | Role |
| --- | --- |
| `src/test-harness.ts` | Shared TestBed helpers (`setupPublicComponent`, DOM text helpers) |
| `src/test-providers.ts` | Global Angular providers for every unit test (wired in `angular.json`) |
| `src/*.test.ts` | One Vitest file beside each source module; LLR tests use `@relation` |

Run public tests the same way GSSC5-38 and later feature tickets should:

```bash
# from repository root
mise run //public:test
mise run //public:test:watch

# or from this directory
mise test
mise test:watch
```

Root `mise test` also runs this app after backend types are generated.

### Pattern for GSSC5-38 and feature LLR tests

Put `feature.test.ts` next to `feature.ts`. Import the harness. Keep one `test()`
per LLR, with `@relation` markers immediately outside each test:

```ts
import { MyComponent } from "./my-component";
import { nativeElement, setupPublicComponent, textContent } from "../test-harness";

// @relation(GSSC-PLLR-N, scope=range_start, role=Test)
test("GSSC-PLLR-N Title", async () => {
  const fixture = await setupPublicComponent(MyComponent);
  expect(textContent(nativeElement(fixture), "h1")).toContain("…");
});
// @relation(GSSC-PLLR-N, scope=range_end, role=Test)
```

`src/app/app.test.ts` follows that pattern for App Root LLRs. Feature tickets own
their requirement tests; do not park them in the harness file. Do not add tests of
the harness itself.
