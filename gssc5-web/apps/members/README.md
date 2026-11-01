# Member frontend

Angular application `@gssc/members`. It listens on port 4201.

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/members`.
- `mise test` runs Vitest once.

`src/app/backend.ts` calls the backend through Eden Treaty. From the repository
root, `mise serve`, `mise build`, and `mise test` include this app.
