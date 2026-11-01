# Public frontend

Angular application `@gssc/public`. It listens on port 4200.

From this directory:

- `mise serve` starts the development server.
- `mise build` writes `../../dist/public`.
- `mise test` runs Vitest once.

`src/app/backend.ts` calls the backend through Eden Treaty. From the repository
root, `mise serve`, `mise build`, and `mise test` include this app.
