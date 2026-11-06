# Public frontend

Angular application `@gssc/public`. It listens on port 4200.

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/public`.
- `mise test` runs Vitest once.
- `mise test:watch` re-runs Vitest when files change.

`src/app/backend.ts` calls the backend through Eden Treaty. From the repository
root, `mise serve`, `mise build`, and `mise test` include this app.

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

`src/app/app.test.ts` is the smoke sample of that pattern. Feature tickets own
their requirement tests; do not park them in the harness file.
