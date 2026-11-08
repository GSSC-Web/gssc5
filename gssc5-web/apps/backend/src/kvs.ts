import { Elysia, t } from "elysia";

import { loadConfig } from "./config";
import { getPrisma } from "./db";

/** Public read of global website key-value data (GSSC-BHLR-119). */
export const kvs = new Elysia({
  name: "kvs",
  prefix: "/kvs",
  normalize: false,
}).get(
  "/:key",
  async ({ params, status }) => {
    const prisma = getPrisma(loadConfig().DATABASE_URL);
    const row = await prisma.keyValue.findUnique({ where: { key: params.key } });
    if (!row) return status(404, undefined);
    return status(200, { key: row.key, value: row.value });
  },
  {
    params: t.Object({
      key: t.String({ minLength: 1 }),
    }),
    response: {
      200: t.Object({
        key: t.String(),
        value: t.String(),
      }),
      404: t.Void(),
    },
  },
);
