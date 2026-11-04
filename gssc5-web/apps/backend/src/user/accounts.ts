import { createHash, randomBytes } from "node:crypto";

import { Elysia, t } from "elysia";

import { loadConfig, type Config } from "../config";
import { getPrisma } from "../db";
import type { PrismaClient } from "../generated/prisma/client";
import { UserPlain } from "../generated/prismabox/User";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

// @relation(GSSC-BLLR-1, GSSC-BLLR-2, GSSC-BLLR-3, scope=range_start, role=Implementation)
const LoginBody = t.Union(
  [
    t.Object({
      password: t.String(),
      username: t.String({ minLength: 1 }),
    }),
    t.Object({
      password: t.String(),
      primaryEmail: t.String({ minLength: 1, pattern: emailPattern }),
    }),
  ],
  { error: "A login accepts a username or a primary email." },
);
// @relation(GSSC-BLLR-1, GSSC-BLLR-2, GSSC-BLLR-3, scope=range_end, role=Implementation)

const TokenBody = t.Object({
  token: t.String(),
});

const LoginOk = t.Object({
  status: t.Literal("ok"),
  token: t.String(),
});

const ChallengeResult = t.Union([t.Literal("valid"), t.Literal("invalid")]);

// Used when the identifier matches nobody, so that failure still runs one Argon2id verify.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=2,p=1$YFzwhlyfxDgseUTPa/I+8QAXvyeUhX1ZCpEpoR04rfw$4TT+znZxCH06iuLiec5YBcbxiZBiY7slsxlESEIBuMQ";

export const accounts = new Elysia({
  name: "accounts",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({ user: UserPlain })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .post(
    "/login",
    async ({ body, status }) => {
      const { prisma, config } = runtime();

      const password = body.password;

      // @relation(GSSC-BLLR-4, GSSC-BLLR-5, scope=range_start, role=Implementation)
      const user =
        "username" in body
          ? await prisma.user.findUnique({ where: { username: body.username } })
          : await prisma.user.findUnique({ where: { primaryEmail: body.primaryEmail } });
      if (!user) {
        await Bun.password.verify(password, DUMMY_PASSWORD_HASH, "argon2id");
        return status(403, "Forbidden");
      }
      // @relation(GSSC-BLLR-4, GSSC-BLLR-5, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-6, GSSC-BLLR-233, scope=range_start, role=Implementation)
      const passwordMatches = await Bun.password.verify(password, user.passwordHash, "argon2id");
      if (!passwordMatches) return status(403, "Forbidden");
      // @relation(GSSC-BLLR-6, GSSC-BLLR-233, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-7, GSSC-BLLR-8, GSSC-BLLR-11, scope=range_start, role=Implementation)
      const issuedAt = new Date();
      const expiresAt = new Date(
        issuedAt.getTime() + config.LOGIN_TOKEN_LIFETIME_DAYS * MILLISECONDS_PER_DAY,
      );
      const token = randomBytes(32).toString("base64url");
      await prisma.loginToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          issuedAt,
          expiresAt,
        },
      });
      return status(200, { status: "ok" as const, token });
      // @relation(GSSC-BLLR-7, GSSC-BLLR-8, GSSC-BLLR-11, scope=range_end, role=Implementation)
    },
    {
      body: LoginBody,
      response: {
        200: LoginOk,
        403: t.Literal("Forbidden"),
      },
    },
  )
  .guard({ body: TokenBody }, (app) =>
    app
      .post(
        "/logout",
        async ({ body, status }) => {
          const { prisma } = runtime();

          // @relation(GSSC-BLLR-10, scope=range_start, role=Implementation)
          const row = await prisma.loginToken.findUnique({
            where: { tokenHash: hashToken(body.token) },
          });
          if (row && !row.loggedOutAt) {
            await prisma.loginToken.update({
              where: { id: row.id },
              data: { loggedOutAt: new Date() },
            });
          }
          return status(204, undefined);
          // @relation(GSSC-BLLR-10, scope=range_end, role=Implementation)
        },
        { response: { 204: t.Void() } },
      )
      .post(
        "/challenge",
        async ({ body }) => {
          const { prisma } = runtime();

          // @relation(GSSC-BLLR-9, GSSC-BLLR-12, scope=range_start, role=Implementation)
          const row = await prisma.loginToken.findUnique({
            where: { tokenHash: hashToken(body.token) },
          });
          if (!row || row.loggedOutAt || row.expiresAt.getTime() <= Date.now()) return "invalid";
          return "valid";
          // @relation(GSSC-BLLR-9, GSSC-BLLR-12, scope=range_end, role=Implementation)
        },
        { response: { 200: ChallengeResult } },
      ),
  )
  .onStart(() => startPermanentAdmin());

let adminReady: Promise<void> | undefined;

function startPermanentAdmin(): Promise<void> {
  adminReady ??= ensurePermanentAdmin().catch((error: unknown) => {
    adminReady = undefined;
    throw error;
  });
  return adminReady;
}

async function ensurePermanentAdmin(): Promise<void> {
  const { prisma, config } = runtime();

  // @relation(GSSC-BLLR-24, scope=range_start, role=Implementation)
  if (!config.ADMIN_ENABLED) return;
  // @relation(GSSC-BLLR-24, scope=range_end, role=Implementation)

  // @relation(GSSC-BLLR-23, scope=range_start, role=Implementation)
  const username = config.ADMIN_USERNAME.trim();
  const primaryEmail = config.ADMIN_EMAIL.trim();
  if (username === "") throw new Error("permanent admin username is empty");
  const passwordHash = await Bun.password.hash(config.ADMIN_PASSWORD, "argon2id");
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        // @relation(GSSC-BLLR-40, scope=range_start, role=Implementation)
        isAdmin: true,
        // @relation(GSSC-BLLR-40, scope=range_end, role=Implementation)
      },
    });
    return;
  }
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      ...(primaryEmail === "" ? {} : { primaryEmail }),
      // @relation(GSSC-BLLR-39, GSSC-BLLR-40, scope=range_start, role=Implementation)
      isAdmin: true,
      isUserMod: false,
      // @relation(GSSC-BLLR-39, GSSC-BLLR-40, scope=range_end, role=Implementation)
    },
  });
  // @relation(GSSC-BLLR-23, scope=range_end, role=Implementation)
}

function runtime(): { prisma: PrismaClient; config: Config } {
  const config = loadConfig();
  return { config, prisma: getPrisma(config.DATABASE_URL) };
}

function trimStrings(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "string") (value as Record<string, unknown>)[key] = item.trim();
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
