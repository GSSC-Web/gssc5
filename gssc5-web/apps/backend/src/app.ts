import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

export const app = new Elysia()
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
  .get("/", () => "Hello Elysia");

export type App = typeof app;
