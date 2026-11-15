# Member frontend

Angular application `@gssc/members`. It listens on port 4201.

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/members`.
- `mise test` runs Vitest once.

`src/app/services/backend.ts` calls the backend through Eden Treaty. From the repository
root, `mise serve`, `mise build`, and `mise test` include this app.

## Testing harness (GSSC5-80)

Shared setup lives beside the app source (mirrors public GSSC5-39):

| File | Role |
| --- | --- |
| `src/test-harness.ts` | Shared TestBed helpers (`setupMembersComponent`, DOM text helpers) |
| `src/test-providers.ts` | Global Angular providers for every unit test (wired in `angular.json`) |
| `src/**/*.test.ts` | One Vitest file beside each source module; LLR tests use `@relation` |

```bash
# from repository root
mise run //members:test
mise run //members:test:watch

# or from this directory
mise test
mise test:watch
```

Root `mise test` also runs this app after backend types are generated.

### Pattern for feature LLR tests

Put `feature.test.ts` next to `feature.ts`. Import the harness. Keep one `test()`
per LLR, with `@relation` markers immediately outside each test:

```ts
import { MyComponent } from "./my-component";
import { nativeElement, setupMembersComponent, textContent } from "../test-harness";

// @relation(GSSC-MLLR-N, scope=range_start, role=Test)
test("GSSC-MLLR-N Title", async () => {
  const fixture = await setupMembersComponent(MyComponent);
  expect(textContent(nativeElement(fixture), "h1")).toContain("…");
});
// @relation(GSSC-MLLR-N, scope=range_end, role=Test)
```

`src/app/app.test.ts` is a baseline STD smoke for the harness. Feature tickets own
their requirement tests; do not park them in the harness file. Do not add tests of
the harness itself. There are no testing-framework MLLRs (same owner rule as public GSSC5-39).
