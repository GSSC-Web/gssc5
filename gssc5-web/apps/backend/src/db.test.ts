import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";

import { createPrisma } from "./db";

const dir = await mkdtemp(path.join(tmpdir(), "gssc-db-"));
const prisma = createPrisma(`file:${path.join(dir, "test.db")}`);

afterAll(async () => {
  await prisma.$disconnect();
  await rm(dir, { recursive: true, force: true });
});

test("SELECT 1", async () => {
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: number | bigint }>>("SELECT 1 AS ok");
  expect(rows).toHaveLength(1);
  expect(Number(rows[0]?.ok)).toBe(1);
});
