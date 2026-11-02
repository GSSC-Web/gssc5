import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { accounts } from "./user/accounts";

// A login is a union of two objects. Exact-mirror stripping would drop the
// second identifier and accept the first object, so unknown fields stay put.
export const app = new Elysia({ normalize: false })
  .use(
    cors({
      origin: [
        "http://localhost:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:4201",
      ],
    }),
  )
  .use(accounts)
  .get("/", () => "Hello Elysia");

export type App = typeof app;
