import { treaty } from "@elysiajs/eden";
import type { App } from "@gssc/backend";

export const backend = treaty<App>("http://localhost:3000");
