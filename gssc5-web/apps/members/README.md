# Member frontend

Angular application `@gssc/members`. It listens on port 4201 (member subdomain entry).

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/members`.
- `mise test` runs unit tests once (`**/*.test.ts`).

App Root hosts (Header / Page Outlet / Footer) and the root route live under `src/app/`
(GSSC5-79). Header/footer chrome and feature pages land in later tickets.

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

`src/app/app.test.ts` holds the harness baseline smoke plus App Root / Router LLR tests
(GSSC5-79). Later feature tickets own their own `*.test.ts` files. Do not add tests of
the harness itself. There are no testing-framework MLLRs (same owner rule as public GSSC5-39).
