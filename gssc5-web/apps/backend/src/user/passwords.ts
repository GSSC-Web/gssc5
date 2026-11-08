import { createHash, randomBytes } from "node:crypto";

import { Elysia, t } from "elysia";

import { loadConfig, type Config } from "../config";
import { getPrisma } from "../db";
import type { PrismaClient, User } from "../generated/prisma/client";
import { getMailTransporter } from "../mail";
import {
  classifyLoginTokenRow,
  hashLoginToken,
  loginTokenFromCookie,
  type CookieJar,
} from "./login-session";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const SPECIALS = "`~!@#$%^&*()_+-={}|[]\\:\";'<>?,./";
const ALLOWED = new Set([
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  ...SPECIALS,
]);

const emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

// @relation(GSSC-BLLR-225, scope=range_start, role=Implementation)
const ChangeBody = t.Object({
  currentPassword: t.String(),
  newPassword: t.String(),
});
// @relation(GSSC-BLLR-225, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-235, scope=range_start, role=Implementation)
const RecoveryRequestBody = t.Object({
  email: t.String({ minLength: 1, pattern: emailPattern }),
});
// @relation(GSSC-BLLR-235, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-240, scope=range_start, role=Implementation)
const RecoverBody = t.Object({
  recoveryToken: t.String(),
  primaryEmail: t.String({ minLength: 1, pattern: emailPattern }),
  newPassword: t.String(),
});
// @relation(GSSC-BLLR-240, scope=range_end, role=Implementation)

export const passwords = new Elysia({
  name: "passwords",
  prefix: "/password",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .post(
    "/change",
    async ({ body, cookie, status }) => {
      const { prisma, config } = runtime();
      // @relation(GSSC-BLLR-247, scope=range_start, role=Implementation)
      const session = await openLoginFromCookie(prisma, cookie);
      if (!session) return status(403, "Forbidden");
      // @relation(GSSC-BLLR-247, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-226, GSSC-BLLR-227, scope=range_start, role=Implementation)
      const currentMatches = await Bun.password.verify(
        body.currentPassword,
        session.passwordHash,
        "argon2id",
      );
      if (!currentMatches) return status(403, "Forbidden");
      // @relation(GSSC-BLLR-226, GSSC-BLLR-227, scope=range_end, role=Implementation)

      const accepted = await acceptNewPassword(prisma, config, session, body.newPassword);
      if (accepted === "invalid") return status(422, "Invalid");

      // @relation(GSSC-BLLR-224, GSSC-BLLR-226, GSSC-BLLR-234, GSSC-BLLR-252, scope=range_start, role=Implementation)
      await replacePassword(prisma, config, session, accepted);
      return status(204, undefined);
      // @relation(GSSC-BLLR-224, GSSC-BLLR-226, GSSC-BLLR-234, GSSC-BLLR-252, scope=range_end, role=Implementation)
    },
    {
      body: ChangeBody,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .post(
    "/recovery-request",
    async ({ body, status }) => {
      const { prisma, config } = runtime();

      // @relation(GSSC-BLLR-237, scope=range_start, role=Implementation)
      const user = await prisma.user.findUnique({ where: { primaryEmail: body.email } });
      if (!user || user.primaryEmail === null || user.primaryEmail === "") {
        return status(204, undefined);
      }
      // @relation(GSSC-BLLR-237, scope=range_end, role=Implementation)

      const issuedAt = new Date();
      const expiresAt = new Date(
        issuedAt.getTime() + config.PASSWORD_RECOVERY_LIFETIME_DAYS * MILLISECONDS_PER_DAY,
      );
      const recoveryToken = randomBytes(32).toString("base64url");

      // @relation(GSSC-BLLR-236, GSSC-BLLR-274, scope=range_start, role=Implementation)
      try {
        await getMailTransporter(config).sendMail({
          to: user.primaryEmail,
          from: config.SMTP_FROM,
          subject: "Password recovery",
          text: `recovery-token=${recoveryToken}`,
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error("SMTP send failed");
      }
      // @relation(GSSC-BLLR-236, GSSC-BLLR-274, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-238, GSSC-BLLR-239, GSSC-BLLR-245, GSSC-BLLR-253, scope=range_start, role=Implementation)
      await prisma.passwordRecoveryToken.create({
        data: {
          tokenHash: hashToken(recoveryToken),
          userId: user.id,
          primaryEmail: user.primaryEmail,
          issuedAt,
          expiresAt,
        },
      });
      // @relation(GSSC-BLLR-238, GSSC-BLLR-239, GSSC-BLLR-245, GSSC-BLLR-253, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-273, scope=range_start, role=Implementation)
      return status(204, undefined);
      // @relation(GSSC-BLLR-273, scope=range_end, role=Implementation)
    },
    {
      body: RecoveryRequestBody,
      response: { 204: t.Void() },
    },
  )
  .post(
    "/recover",
    async ({ body, status }) => {
      const { prisma, config } = runtime();

      // @relation(GSSC-BLLR-254, GSSC-BLLR-255, GSSC-BLLR-256, GSSC-BLLR-257, scope=range_start, role=Implementation)
      const row = await prisma.passwordRecoveryToken.findUnique({
        where: { tokenHash: hashToken(body.recoveryToken) },
        include: { user: true },
      });
      if (!row) return status(403, "Forbidden");
      if (row.usedAt) return status(403, "Forbidden");
      if (row.expiresAt.getTime() <= Date.now()) return status(403, "Forbidden");
      if (row.primaryEmail !== body.primaryEmail) return status(403, "Forbidden");
      // @relation(GSSC-BLLR-254, GSSC-BLLR-255, GSSC-BLLR-256, GSSC-BLLR-257, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-268, GSSC-BLLR-269, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_start, role=Implementation)
      const accepted = await acceptNewPassword(prisma, config, row.user, body.newPassword);
      if (accepted === "invalid") return status(422, "Invalid");
      // @relation(GSSC-BLLR-268, GSSC-BLLR-269, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-258, GSSC-BLLR-259, GSSC-BLLR-260, scope=range_start, role=Implementation)
      await replacePassword(prisma, config, row.user, accepted);
      await prisma.passwordRecoveryToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      return status(204, undefined);
      // @relation(GSSC-BLLR-258, GSSC-BLLR-259, GSSC-BLLR-260, scope=range_end, role=Implementation)
    },
    {
      body: RecoverBody,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  );

async function openLoginFromCookie(
  prisma: PrismaClient,
  cookie: CookieJar,
): Promise<User | null> {
  const token = loginTokenFromCookie(cookie);
  if (!token) return null;
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashLoginToken(token) },
    include: { user: true },
  });
  if (classifyLoginTokenRow(row) !== "ok" || !row) return null;
  return row.user;
}

async function acceptNewPassword(
  prisma: PrismaClient,
  config: Config,
  user: User,
  newPassword: string,
): Promise<string | "invalid"> {
  const permanentAdmin = user.username === config.ADMIN_USERNAME;

  // @relation(GSSC-BLLR-232, scope=range_start, role=Implementation)
  if (!permanentAdmin) {
    // @relation(GSSC-BLLR-249, GSSC-BLLR-250, GSSC-BLLR-251, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_start, role=Implementation)
    if (!passwordMeetsRules(newPassword, config.PASSWORD_MIN_LENGTH)) return "invalid";
    // @relation(GSSC-BLLR-249, GSSC-BLLR-250, GSSC-BLLR-251, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_end, role=Implementation)
  }
  // @relation(GSSC-BLLR-232, scope=range_end, role=Implementation)

  // @relation(GSSC-BLLR-228, GSSC-BLLR-248, GSSC-BLLR-268, GSSC-BLLR-269, scope=range_start, role=Implementation)
  if (!permanentAdmin) {
    if (await Bun.password.verify(newPassword, user.passwordHash, "argon2id")) {
      return "invalid";
    }
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: config.PASSWORD_HISTORY_COUNT,
    });
    for (const row of history) {
      if (await Bun.password.verify(newPassword, row.passwordHash, "argon2id")) {
        return "invalid";
      }
    }
  }
  // @relation(GSSC-BLLR-228, GSSC-BLLR-248, GSSC-BLLR-268, GSSC-BLLR-269, scope=range_end, role=Implementation)

  return Bun.password.hash(newPassword, "argon2id");
}

async function replacePassword(
  prisma: PrismaClient,
  config: Config,
  user: User,
  newHash: string,
): Promise<void> {
  // @relation(GSSC-BLLR-234, GSSC-BLLR-244, GSSC-BLLR-252, GSSC-BLLR-258, GSSC-BLLR-259, GSSC-BLLR-261, GSSC-BLLR-262, scope=range_start, role=Implementation)
  await prisma.$transaction(async (tx) => {
    await tx.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash: user.passwordHash,
        createdAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
    const retained = await tx.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const excess = retained.slice(config.PASSWORD_HISTORY_COUNT);
    if (excess.length > 0) {
      await tx.passwordHistory.deleteMany({
        where: { id: { in: excess.map((row) => row.id) } },
      });
    }
  });
  // @relation(GSSC-BLLR-234, GSSC-BLLR-244, GSSC-BLLR-252, GSSC-BLLR-258, GSSC-BLLR-259, GSSC-BLLR-261, GSSC-BLLR-262, scope=range_end, role=Implementation)
}

// @relation(GSSC-BLLR-249, GSSC-BLLR-250, GSSC-BLLR-251, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_start, role=Implementation)
export function passwordMeetsRules(password: string, minimumLength: number): boolean {
  if (password.length < minimumLength) return false;
  let upper = false;
  let lower = false;
  let digit = false;
  let special = false;
  for (const character of password) {
    if (!ALLOWED.has(character)) return false;
    if (character >= "A" && character <= "Z") upper = true;
    else if (character >= "a" && character <= "z") lower = true;
    else if (character >= "0" && character <= "9") digit = true;
    else special = true;
  }
  return upper && lower && digit && special;
}
// @relation(GSSC-BLLR-249, GSSC-BLLR-250, GSSC-BLLR-251, GSSC-BLLR-270, GSSC-BLLR-271, GSSC-BLLR-272, scope=range_end, role=Implementation)

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
