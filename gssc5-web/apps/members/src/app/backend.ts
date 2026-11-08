import { treaty } from "@elysiajs/eden";
import type { App } from "@gssc/backend";

export const backend = treaty<App>("http://localhost:3000", {
  // Include the Login Token cookie on credentialed browser requests.
  fetch: { credentials: "include" },
});
