import { openapi } from "@elysia/openapi";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { announcement } from "./content/announcement";
import { events } from "./content/events";
import { newsletters } from "./content/newsletters";
import { publications } from "./content/publications";
import { researchTools } from "./content/research-tools";
import { section } from "./content/section";
import { template } from "./content/template";
import { files } from "./files/files";
import { kvs } from "./kvs";
import { accountPhotos } from "./user/account-photos";
import { accounts } from "./user/accounts";
import { leadership } from "./user/leadership";
import { passwords } from "./user/passwords";
import { users } from "./user/users";

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
      // Browser frontends send the Login Token cookie with credentialed requests.
      credentials: true,
    }),
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: "GSSC5 Backend",
          version: "5.0.0",
        },
      },
    }),
  )
  .use(accounts)
  .use(passwords)
  .use(users)
  .use(accountPhotos)
  .use(leadership)
  .use(kvs)
  .use(section)
  .use(announcement)
  .use(template)
  .use(events)
  .use(researchTools)
  .use(publications)
  .use(newsletters)
  .use(files)
  .get("/", () => ({
    status: "ok" as const,
    name: "GSSC5 Backend",
    version: "5.0.0",
    api: {
      auth: "cookie" as const,
      softDelete: {
        users: "DELETE /users/{cuid}",
        files: "DELETE /files/{cuid}",
      },
    },
    capabilities: {
      collections: [
        "users",
        "sections",
        "announcements",
        "templates",
        "events",
        "research-tools",
        "publications",
        "newsletters",
        "files",
        "kvs",
        "leadership",
        "account-photos",
        "password",
      ],
      listFilters: true,
      openapi: "/openapi",
    },
  }));

export type App = typeof app;
