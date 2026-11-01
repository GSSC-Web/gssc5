import { app } from "./app";
import { loadConfig } from "./config";
import { getPrisma } from "./db";

const config = loadConfig();
const prisma = getPrisma(config.DATABASE_URL);

await prisma.$queryRawUnsafe("SELECT 1");

app.listen(config.PORT);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
