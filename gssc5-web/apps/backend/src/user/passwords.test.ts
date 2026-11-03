// Password service checks. Each assertion is limited to that requirement's statement.
import { createHash } from "node:crypto";

import { afterEach, beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { setMailTransporter, type MailMessage } from "../mail";
import {
  DAY_MS,
  bootInProcess,
  establishedLogin,
  memberEmail,
  memberPassword,
  memberUsername,
  postJsonResponse,
  setEnv,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import { passwordMeetsRules } from "./passwords";

const STRONG = "Abcdef1!";
const STRONG_NEXT = "Abcdef2!";
const STRONG_THIRD = "Abcdef3!";
const STRONG_FOURTH = "Abcdef4!";

let app: InProcessApp;
let backend: BackendFetch;
let memberId = "";
const sent: MailMessage[] = [];

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const created = await prisma().user.create({
    data: {
      username: "regular-member",
      primaryEmail: "regular@example.com",
      passwordHash: await Bun.password.hash(STRONG, "argon2id"),
      firstName: "Reg",
      lastName: "Member",
      primaryPhone: "5551112222",
      preferredContactMethod: "Email",
      homeLine1: "1 Main",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Main",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
      isAdmin: false,
      isUserMod: false,
    },
  });
  memberId = created.id;
}, 120_000);

beforeEach(async () => {
  await prisma().passwordHistory.deleteMany({ where: { userId: memberId } });
  await prisma().passwordRecoveryToken.deleteMany({ where: { userId: memberId } });
  await prisma().user.update({
    where: { id: memberId },
    data: { passwordHash: await Bun.password.hash(STRONG, "argon2id") },
  });
});

afterEach(() => {
  setMailTransporter(undefined);
  sent.length = 0;
  setEnv("PASSWORD_HISTORY_COUNT", undefined);
  setEnv("PASSWORD_MIN_LENGTH", undefined);
  setEnv("PASSWORD_RECOVERY_LIFETIME_DAYS", undefined);
  setSystemTime();
});

function mockMail(): void {
  setMailTransporter({
    async sendMail(message) {
      sent.push(message);
    },
  });
}

function prisma() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function loginRegular(password = STRONG): Promise<string> {
  const token = await establishedLogin(backend, {
    username: "regular-member",
    password,
  });
  expect(token).toEqual(expect.any(String));
  return token ?? "";
}

async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ status: number; body: string }> {
  return postJsonResponse(backend, "/password/change", {
    token,
    currentPassword,
    newPassword,
  });
}

async function requestRecovery(email: string): Promise<string> {
  mockMail();
  const before = sent.length;
  const response = await postJsonResponse(backend, "/password/recovery-request", { email });
  expect(response.status).toBe(204);
  const message = sent[before];
  return message?.text.match(/recovery-token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
}

async function currentHash(userId = memberId): Promise<string> {
  const user = await prisma().user.findUniqueOrThrow({ where: { id: userId } });
  return user.passwordHash;
}

async function historyHashes(userId = memberId): Promise<string[]> {
  const rows = await prisma().passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.passwordHash);
}

async function recoveryRows() {
  return prisma().passwordRecoveryToken.findMany({
    where: { userId: memberId },
    orderBy: { issuedAt: "desc" },
  });
}

// @relation(GSSC-BLLR-224, scope=range_start, role=Test)
test("GSSC-BLLR-224 Password Change Login", async () => {
  const forbidden = await changePassword("not-a-login-token", STRONG, STRONG_NEXT);
  expect(forbidden.status).toBe(403);
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
});
// @relation(GSSC-BLLR-224, scope=range_end, role=Test)

// @relation(GSSC-BLLR-225, scope=range_start, role=Test)
test("GSSC-BLLR-225 Password Change Inputs", async () => {
  const token = await loginRegular();
  const missingCurrent = await postJsonResponse(backend, "/password/change", {
    token,
    newPassword: STRONG_NEXT,
  });
  expect(missingCurrent.status).toBeGreaterThanOrEqual(400);
  const missingNew = await postJsonResponse(backend, "/password/change", {
    token,
    currentPassword: STRONG,
  });
  expect(missingNew.status).toBeGreaterThanOrEqual(400);
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
});
// @relation(GSSC-BLLR-225, scope=range_end, role=Test)

// @relation(GSSC-BLLR-226, scope=range_start, role=Test)
test("GSSC-BLLR-226 Password Change Current Match", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  const after = await currentHash();
  expect(after).not.toBe(before);
  expect(await Bun.password.verify(STRONG_NEXT, after, "argon2id")).toBe(true);
});
// @relation(GSSC-BLLR-226, scope=range_end, role=Test)

// @relation(GSSC-BLLR-227, scope=range_start, role=Test)
test("GSSC-BLLR-227 Password Change Current Mismatch", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  const response = await changePassword(token, "WrongPass1!", STRONG_NEXT);
  expect(response.status).toBe(403);
  expect(await currentHash()).toBe(before);
});
// @relation(GSSC-BLLR-227, scope=range_end, role=Test)

// @relation(GSSC-BLLR-228, scope=range_start, role=Test)
test("GSSC-BLLR-228 Password Change History Difference", async () => {
  setEnv("PASSWORD_HISTORY_COUNT", "3");
  let password = STRONG;
  let token = await loginRegular(password);
  for (const next of [STRONG_NEXT, STRONG_THIRD, STRONG_FOURTH]) {
    expect((await changePassword(token, password, next)).status).toBe(204);
    password = next;
    token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  }
  expect((await changePassword(token, password, STRONG_FOURTH)).status).toBe(422);
  expect((await changePassword(token, password, STRONG_NEXT)).status).toBe(422);
});
// @relation(GSSC-BLLR-228, scope=range_end, role=Test)

// @relation(GSSC-BLLR-229, scope=range_start, role=Test)
test("GSSC-BLLR-229 Password History Count Configuration", async () => {
  expect(loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} }).PASSWORD_HISTORY_COUNT).toBe(
    3,
  );
  setEnv("PASSWORD_HISTORY_COUNT", "2");
  expect(loadConfig({ processEnv: process.env }).PASSWORD_HISTORY_COUNT).toBe(2);
});
// @relation(GSSC-BLLR-229, scope=range_end, role=Test)

// @relation(GSSC-BLLR-230, scope=range_start, role=Test)
test("GSSC-BLLR-230 Password Minimum Length Configuration", async () => {
  expect(loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} }).PASSWORD_MIN_LENGTH).toBe(8);
  setEnv("PASSWORD_MIN_LENGTH", "10");
  expect(loadConfig({ processEnv: process.env }).PASSWORD_MIN_LENGTH).toBe(10);
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, "Abcde1!")).status).toBe(422);
});
// @relation(GSSC-BLLR-230, scope=range_end, role=Test)

// @relation(GSSC-BLLR-231, scope=range_start, role=Test)
test("GSSC-BLLR-231 Password Complexity", async () => {
  expect(passwordMeetsRules(STRONG, 8)).toBe(true);
  expect(passwordMeetsRules("short1!", 8)).toBe(false);
  expect(passwordMeetsRules("abcdefgh1!", 8)).toBe(false);
  expect(passwordMeetsRules("ABCDEFGH1!", 8)).toBe(false);
  expect(passwordMeetsRules("Abcdefgh!", 8)).toBe(false);
  expect(passwordMeetsRules("Abcdefgh1", 8)).toBe(false);
  expect(passwordMeetsRules("Abcdef1!\u00a3", 8)).toBe(false);
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, "abcdefgh1!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "ABCDEFGH1!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "Abcdefgh!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "Abcdefgh1")).status).toBe(422);
});
// @relation(GSSC-BLLR-231, scope=range_end, role=Test)

// @relation(GSSC-BLLR-232, scope=range_start, role=Test)
test("GSSC-BLLR-232 Permanent Admin Password Rule Exemption", async () => {
  const token = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect(token).toEqual(expect.any(String));
  const simple = "plain";
  expect((await changePassword(token ?? "", memberPassword, simple)).status).toBe(204);
  expect(
    (
      await changePassword(
        (await establishedLogin(backend, { username: memberUsername, password: simple })) ?? "",
        simple,
        memberPassword,
      )
    ).status,
  ).toBe(204);
});
// @relation(GSSC-BLLR-232, scope=range_end, role=Test)

// @relation(GSSC-BLLR-233, scope=range_start, role=Test)
test("GSSC-BLLR-233 Existing Password Login Validity", async () => {
  expect(passwordMeetsRules(memberPassword, 8)).toBe(false);
  const token = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect(token).toEqual(expect.any(String));
});
// @relation(GSSC-BLLR-233, scope=range_end, role=Test)

// @relation(GSSC-BLLR-234, scope=range_start, role=Test)
test("GSSC-BLLR-234 Password Change Storage", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect(await Bun.password.verify(STRONG_NEXT, await currentHash(), "argon2id")).toBe(true);
  expect(await historyHashes()).toEqual([before]);
});
// @relation(GSSC-BLLR-234, scope=range_end, role=Test)

// @relation(GSSC-BLLR-235, scope=range_start, role=Test)
test("GSSC-BLLR-235 Password Recovery Request Input", async () => {
  const response = await postJsonResponse(backend, "/password/recovery-request", {
    email: "nobody@example.com",
  });
  expect(response.status).toBe(204);
});
// @relation(GSSC-BLLR-235, scope=range_end, role=Test)

// @relation(GSSC-BLLR-236, scope=range_start, role=Test)
test("GSSC-BLLR-236 Password Recovery Message Sent", async () => {
  mockMail();
  await postJsonResponse(backend, "/password/recovery-request", {
    email: "regular@example.com",
  });
  expect(sent.length).toBe(1);
  expect(sent[0]?.to).toBe("regular@example.com");
  expect(sent[0]?.text.includes("recovery-token=")).toBe(true);
});
// @relation(GSSC-BLLR-236, scope=range_end, role=Test)

// @relation(GSSC-BLLR-237, scope=range_start, role=Test)
test("GSSC-BLLR-237 Password Recovery Request Success Response", async () => {
  mockMail();
  const unknown = await postJsonResponse(backend, "/password/recovery-request", {
    email: "nobody@example.com",
  });
  expect(unknown.status).toBe(204);
  expect(sent.length).toBe(0);

  setMailTransporter({
    async sendMail() {
      throw new Error("smtp down");
    },
  });
  const failedSend = await postJsonResponse(backend, "/password/recovery-request", {
    email: "regular@example.com",
  });
  expect(failedSend.status).toBe(204);
});
// @relation(GSSC-BLLR-237, scope=range_end, role=Test)

// @relation(GSSC-BLLR-238, scope=range_start, role=Test)
test("GSSC-BLLR-238 Password Recovery Token Hash Stored", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect(recoveryToken.length).toBeGreaterThan(0);
  const rows = await recoveryRows();
  expect(rows.length).toBe(1);
  expect(rows[0]?.tokenHash).toBe(createHash("sha256").update(recoveryToken).digest("hex"));
  expect(rows[0]?.tokenHash).not.toBe(recoveryToken);
});
// @relation(GSSC-BLLR-238, scope=range_end, role=Test)

// @relation(GSSC-BLLR-239, scope=range_start, role=Test)
test("GSSC-BLLR-239 Password Recovery Token Lifetime Configuration", async () => {
  expect(
    loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} }).PASSWORD_RECOVERY_LIFETIME_DAYS,
  ).toBe(1);
  setEnv("PASSWORD_RECOVERY_LIFETIME_DAYS", "2");
  expect(loadConfig({ processEnv: process.env }).PASSWORD_RECOVERY_LIFETIME_DAYS).toBe(2);
});
// @relation(GSSC-BLLR-239, scope=range_end, role=Test)

// @relation(GSSC-BLLR-240, scope=range_start, role=Test)
test("GSSC-BLLR-240 Password Recovery Inputs", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  const missingEmail = await postJsonResponse(backend, "/password/recover", {
    recoveryToken,
    newPassword: STRONG_NEXT,
  });
  expect(missingEmail.status).toBeGreaterThanOrEqual(400);
  const ok = await postJsonResponse(backend, "/password/recover", {
    recoveryToken,
    primaryEmail: "regular@example.com",
    newPassword: STRONG_NEXT,
  });
  expect(ok.status).toBe(204);
});
// @relation(GSSC-BLLR-240, scope=range_end, role=Test)

// @relation(GSSC-BLLR-241, scope=range_start, role=Test)
test("GSSC-BLLR-241 Password Recovery Token Validity", async () => {
  const start = new Date("2026-07-01T00:00:00.000Z");
  setSystemTime(start);
  setEnv("PASSWORD_RECOVERY_LIFETIME_DAYS", "1");
  const recoveryToken = await requestRecovery("regular@example.com");

  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken: "unknown-token",
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(403);

  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: memberEmail,
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(403);

  setSystemTime(new Date(start.getTime() + DAY_MS));
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(403);

  setSystemTime(start);
  const freshToken = await requestRecovery("regular@example.com");
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken: freshToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(204);
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken: freshToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_THIRD,
      })
    ).status,
  ).toBe(403);
});
// @relation(GSSC-BLLR-241, scope=range_end, role=Test)

// @relation(GSSC-BLLR-242, scope=range_start, role=Test)
test("GSSC-BLLR-242 Password Recovery New Password Rules", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: "weak",
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG,
      })
    ).status,
  ).toBe(422);
});
// @relation(GSSC-BLLR-242, scope=range_end, role=Test)

// @relation(GSSC-BLLR-243, scope=range_start, role=Test)
test("GSSC-BLLR-243 Password Recovery Storage", async () => {
  const before = await currentHash();
  const recoveryToken = await requestRecovery("regular@example.com");
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(204);
  expect(await Bun.password.verify(STRONG_NEXT, await currentHash(), "argon2id")).toBe(true);
  expect(await historyHashes()).toContain(before);
  const rows = await recoveryRows();
  expect(rows[0]?.usedAt).not.toBeNull();
});
// @relation(GSSC-BLLR-243, scope=range_end, role=Test)

// @relation(GSSC-BLLR-244, scope=range_start, role=Test)
test("GSSC-BLLR-244 Past Password Hash Rows", async () => {
  setEnv("PASSWORD_HISTORY_COUNT", "2");
  let password = STRONG;
  let token = await loginRegular(password);
  const firstHash = await currentHash();
  expect((await changePassword(token, password, STRONG_NEXT)).status).toBe(204);
  password = STRONG_NEXT;
  token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  expect(await historyHashes()).toEqual([firstHash]);
  const secondHash = await currentHash();
  expect((await changePassword(token, password, STRONG_THIRD)).status).toBe(204);
  password = STRONG_THIRD;
  token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  expect((await historyHashes()).length).toBe(2);
  expect(await historyHashes()).toContain(secondHash);
  expect((await changePassword(token, password, STRONG_FOURTH)).status).toBe(204);
  expect((await historyHashes()).length).toBe(2);
});
// @relation(GSSC-BLLR-244, scope=range_end, role=Test)

// @relation(GSSC-BLLR-245, scope=range_start, role=Test)
test("GSSC-BLLR-245 Password Recovery Token Rows", async () => {
  const rows = await app.sql.query(`PRAGMA table_info("password_recovery_tokens")`);
  const names = new Set(rows.map((row) => String(row.name)));
  for (const column of ["tokenHash", "userId", "primaryEmail", "issuedAt", "expiresAt", "usedAt"]) {
    expect(names.has(column)).toBe(true);
  }
});
// @relation(GSSC-BLLR-245, scope=range_end, role=Test)
