import { randomBytes } from "node:crypto";

import { Elysia, t } from "elysia";

import { loadConfig, type Config } from "../config";
import { getPrisma } from "../db";
import type { PrismaClient } from "../generated/prisma/client";
import { UserPlain } from "../generated/prismabox/User";
import {
  classifyLoginTokenRow,
  clearLoginTokenCookie,
  hashLoginToken,
  loginTokenCookie,
  loginTokenFromCookie,
  setLoginTokenCookie,
} from "./login-session";

const SECONDS_PER_DAY = 24 * 60 * 60;

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

const LoginOk = t.Object({
  status: t.Literal("ok"),
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
    async ({ body, cookie, status }) => {
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

      // @relation(GSSC-BLLR-7, GSSC-BLLR-8, GSSC-BLLR-11, GSSC-BLLR-292, GSSC-BLLR-309, GSSC-BLLR-310, GSSC-BLLR-311, GSSC-BLLR-312, GSSC-BLLR-313, scope=range_start, role=Implementation)
      const issuedAt = new Date();
      const maxAgeSeconds = Math.floor(config.LOGIN_TOKEN_LIFETIME_DAYS * SECONDS_PER_DAY);
      const expiresAt = new Date(issuedAt.getTime() + maxAgeSeconds * 1000);
      const token = randomBytes(32).toString("base64url");
      await prisma.loginToken.create({
        data: {
          tokenHash: hashLoginToken(token),
          userId: user.id,
          issuedAt,
          expiresAt,
        },
      });
      setLoginTokenCookie(cookie, token, maxAgeSeconds, expiresAt);
      return status(200, { status: "ok" as const });
      // @relation(GSSC-BLLR-7, GSSC-BLLR-8, GSSC-BLLR-11, GSSC-BLLR-292, GSSC-BLLR-309, GSSC-BLLR-310, GSSC-BLLR-311, GSSC-BLLR-312, GSSC-BLLR-313, scope=range_end, role=Implementation)
    },
    {
      body: LoginBody,
      cookie: loginTokenCookie,
      response: {
        200: LoginOk,
        403: t.Literal("Forbidden"),
      },
    },
  )
  .post(
    "/logout",
    async ({ cookie, status }) => {
      const { prisma } = runtime();
      const token = loginTokenFromCookie(cookie);

      // @relation(GSSC-BLLR-10, GSSC-BLLR-314, scope=range_start, role=Implementation)
      if (token) {
        const row = await prisma.loginToken.findUnique({
          where: { tokenHash: hashLoginToken(token) },
        });
        if (row && !row.loggedOutAt) {
          await prisma.loginToken.update({
            where: { id: row.id },
            data: { loggedOutAt: new Date() },
          });
        }
      }
      clearLoginTokenCookie(cookie);
      return status(204, undefined);
      // @relation(GSSC-BLLR-10, GSSC-BLLR-314, scope=range_end, role=Implementation)
    },
    {
      cookie: loginTokenCookie,
      response: { 204: t.Void() },
    },
  )
  .post(
    "/challenge",
    async ({ cookie }) => {
      const { prisma } = runtime();
      const token = loginTokenFromCookie(cookie);

      // @relation(GSSC-BLLR-9, GSSC-BLLR-12, scope=range_start, role=Implementation)
      if (!token) return "invalid";
      const row = await prisma.loginToken.findUnique({
        where: { tokenHash: hashLoginToken(token) },
      });
      return classifyLoginTokenRow(row) === "ok" ? "valid" : "invalid";
      // @relation(GSSC-BLLR-9, GSSC-BLLR-12, scope=range_end, role=Implementation)
    },
    {
      cookie: loginTokenCookie,
      response: { 200: ChallengeResult },
    },
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
