// Password service checks. Each assertion is limited to that requirement's statement.
import { createHash } from "node:crypto";

import { afterEach, beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { setMailTransporter, type MailMessage } from "../mail";
import {
  DAY_MS,
  bootInProcess,
  cookieHeaderForToken,
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
let moderatorId = "";
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
  const moderator = await prisma().user.create({
    data: {
      username: "password-moderator",
      primaryEmail: "password-mod@example.com",
      passwordHash: await Bun.password.hash(STRONG, "argon2id"),
      firstName: "Pat",
      lastName: "Moderator",
      primaryPhone: "5551113333",
      preferredContactMethod: "Email",
      homeLine1: "2 Main",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Main",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
      isAdmin: false,
      isUserMod: true,
    },
  });
  moderatorId = moderator.id;
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
  token: string | null,
  currentPassword: string,
  newPassword: string,
): Promise<{ status: number; body: string }> {
  return postJsonResponse(
    backend,
    "/password/change",
    {
      currentPassword,
      newPassword,
    },
    token === null ? undefined : { cookie: cookieHeaderForToken(token) },
  );
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
test("GSSC-BLLR-224 Password Change", async () => {
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect(await Bun.password.verify(STRONG_NEXT, await currentHash(), "argon2id")).toBe(true);
});
// @relation(GSSC-BLLR-224, scope=range_end, role=Test)

// @relation(GSSC-BLLR-247, scope=range_start, role=Test)
test("GSSC-BLLR-247 Password Change Login Token Required", async () => {
  const before = await currentHash();
  expect((await changePassword("not-a-login-token", STRONG, STRONG_NEXT)).status).toBe(403);
  expect(await currentHash()).toBe(before);
});
// @relation(GSSC-BLLR-247, scope=range_end, role=Test)

// @relation(GSSC-BLLR-225, scope=range_start, role=Test)
test("GSSC-BLLR-225 Password Change Inputs", async () => {
  const token = await loginRegular();
  const cookie = { cookie: cookieHeaderForToken(token) };
  const missingCurrent = await postJsonResponse(
    backend,
    "/password/change",
    { newPassword: STRONG_NEXT },
    cookie,
  );
  expect(missingCurrent.status).toBeGreaterThanOrEqual(400);
  const missingNew = await postJsonResponse(
    backend,
    "/password/change",
    { currentPassword: STRONG },
    cookie,
  );
  expect(missingNew.status).toBeGreaterThanOrEqual(400);
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
});
// @relation(GSSC-BLLR-225, scope=range_end, role=Test)

// @relation(GSSC-BLLR-226, scope=range_start, role=Test)
test("GSSC-BLLR-226 Password Change Current Match", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect(await currentHash()).not.toBe(before);
  expect(await Bun.password.verify(STRONG_NEXT, await currentHash(), "argon2id")).toBe(true);
});
// @relation(GSSC-BLLR-226, scope=range_end, role=Test)

// @relation(GSSC-BLLR-227, scope=range_start, role=Test)
test("GSSC-BLLR-227 Password Change Current Mismatch", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, "WrongPass1!", STRONG_NEXT)).status).toBe(403);
  expect(await currentHash()).toBe(before);
});
// @relation(GSSC-BLLR-227, scope=range_end, role=Test)

// @relation(GSSC-BLLR-228, scope=range_start, role=Test)
test("GSSC-BLLR-228 Password Change Differs From Current", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG)).status).toBe(422);
  expect(await currentHash()).toBe(before);
});
// @relation(GSSC-BLLR-228, scope=range_end, role=Test)

// @relation(GSSC-BLLR-248, scope=range_start, role=Test)
test("GSSC-BLLR-248 Password Change Differs From History", async () => {
  setEnv("PASSWORD_HISTORY_COUNT", "3");
  let password = STRONG;
  let token = await loginRegular(password);
  for (const next of [STRONG_NEXT, STRONG_THIRD, STRONG_FOURTH]) {
    expect((await changePassword(token, password, next)).status).toBe(204);
    password = next;
    token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  }
  expect((await changePassword(token, password, STRONG_NEXT)).status).toBe(422);
});
// @relation(GSSC-BLLR-248, scope=range_end, role=Test)

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
});
// @relation(GSSC-BLLR-230, scope=range_end, role=Test)

// @relation(GSSC-BLLR-249, scope=range_start, role=Test)
test("GSSC-BLLR-249 Password Minimum Length", async () => {
  expect(passwordMeetsRules("Abcde1!", 8)).toBe(false);
  setEnv("PASSWORD_MIN_LENGTH", "10");
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, "Abcde1!")).status).toBe(422);
});
// @relation(GSSC-BLLR-249, scope=range_end, role=Test)

// @relation(GSSC-BLLR-250, scope=range_start, role=Test)
test("GSSC-BLLR-250 Password Required Character Classes", async () => {
  expect(passwordMeetsRules("abcdefgh1!", 8)).toBe(false);
  expect(passwordMeetsRules("ABCDEFGH1!", 8)).toBe(false);
  expect(passwordMeetsRules("Abcdefgh!", 8)).toBe(false);
  expect(passwordMeetsRules("Abcdefgh1", 8)).toBe(false);
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, "abcdefgh1!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "ABCDEFGH1!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "Abcdefgh!")).status).toBe(422);
  expect((await changePassword(token, STRONG, "Abcdefgh1")).status).toBe(422);
});
// @relation(GSSC-BLLR-250, scope=range_end, role=Test)

// @relation(GSSC-BLLR-251, scope=range_start, role=Test)
test("GSSC-BLLR-251 Password Allowed Characters", async () => {
  expect(passwordMeetsRules("Abcdef1!\u00a3", 8)).toBe(false);
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, "Abcdef1!\u00a3")).status).toBe(422);
});
// @relation(GSSC-BLLR-251, scope=range_end, role=Test)

// @relation(GSSC-BLLR-232, scope=range_start, role=Test)
test("GSSC-BLLR-232 Permanent Admin Password Replacement", async () => {
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
test("GSSC-BLLR-234 Password Change Stores Current Hash", async () => {
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect(await Bun.password.verify(STRONG_NEXT, await currentHash(), "argon2id")).toBe(true);
});
// @relation(GSSC-BLLR-234, scope=range_end, role=Test)

// @relation(GSSC-BLLR-252, scope=range_start, role=Test)
test("GSSC-BLLR-252 Password Change Retains History", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect(await historyHashes()).toEqual([before]);
});
// @relation(GSSC-BLLR-252, scope=range_end, role=Test)

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
test("GSSC-BLLR-237 Password Recovery Request Unknown Email Success", async () => {
  mockMail();
  const unknown = await postJsonResponse(backend, "/password/recovery-request", {
    email: "nobody@example.com",
  });
  expect(unknown.status).toBe(204);
  expect(sent.length).toBe(0);
});
// @relation(GSSC-BLLR-237, scope=range_end, role=Test)

// @relation(GSSC-BLLR-273, scope=range_start, role=Test)
test("GSSC-BLLR-273 Password Recovery Request Send Success", async () => {
  mockMail();
  const response = await postJsonResponse(backend, "/password/recovery-request", {
    email: "regular@example.com",
  });
  expect(response.status).toBe(204);
  expect(sent.length).toBe(1);
});
// @relation(GSSC-BLLR-273, scope=range_end, role=Test)

// @relation(GSSC-BLLR-274, scope=range_start, role=Test)
test("GSSC-BLLR-274 Password Recovery Request Send Server Error", async () => {
  setMailTransporter({
    async sendMail() {
      throw new Error("smtp down");
    },
  });
  const failedSend = await postJsonResponse(backend, "/password/recovery-request", {
    email: "regular@example.com",
  });
  expect(failedSend.status).toBe(500);
  expect((await recoveryRows()).length).toBe(0);
});
// @relation(GSSC-BLLR-274, scope=range_end, role=Test)

// @relation(GSSC-BLLR-238, scope=range_start, role=Test)
test("GSSC-BLLR-238 Password Recovery Token Hash Stored", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect(recoveryToken.length).toBeGreaterThan(0);
  const rows = await recoveryRows();
  expect(rows.length).toBe(1);
  expect(rows[0]?.tokenHash).toBe(createHash("sha256").update(recoveryToken).digest("hex"));
});
// @relation(GSSC-BLLR-238, scope=range_end, role=Test)

// @relation(GSSC-BLLR-253, scope=range_start, role=Test)
test("GSSC-BLLR-253 Password Recovery Token Plaintext Omitted", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  const rows = await recoveryRows();
  expect(rows[0]?.tokenHash).not.toBe(recoveryToken);
  expect(JSON.stringify(rows[0])).not.toContain(recoveryToken);
});
// @relation(GSSC-BLLR-253, scope=range_end, role=Test)

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
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(204);
});
// @relation(GSSC-BLLR-240, scope=range_end, role=Test)

// @relation(GSSC-BLLR-254, scope=range_start, role=Test)
test("GSSC-BLLR-254 Unknown Recovery Token Forbidden", async () => {
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken: "unknown-token",
        primaryEmail: "regular@example.com",
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(403);
});
// @relation(GSSC-BLLR-254, scope=range_end, role=Test)

// @relation(GSSC-BLLR-255, scope=range_start, role=Test)
test("GSSC-BLLR-255 Expired Recovery Token Forbidden", async () => {
  const start = new Date("2026-07-01T00:00:00.000Z");
  setSystemTime(start);
  setEnv("PASSWORD_RECOVERY_LIFETIME_DAYS", "1");
  const recoveryToken = await requestRecovery("regular@example.com");
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
});
// @relation(GSSC-BLLR-255, scope=range_end, role=Test)

// @relation(GSSC-BLLR-256, scope=range_start, role=Test)
test("GSSC-BLLR-256 Recovery Email Mismatch Forbidden", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: memberEmail,
        newPassword: STRONG_NEXT,
      })
    ).status,
  ).toBe(403);
});
// @relation(GSSC-BLLR-256, scope=range_end, role=Test)

// @relation(GSSC-BLLR-257, scope=range_start, role=Test)
test("GSSC-BLLR-257 Used Recovery Token Forbidden", async () => {
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
  expect(
    (
      await postJsonResponse(backend, "/password/recover", {
        recoveryToken,
        primaryEmail: "regular@example.com",
        newPassword: STRONG_THIRD,
      })
    ).status,
  ).toBe(403);
});
// @relation(GSSC-BLLR-257, scope=range_end, role=Test)

async function recoverWith(
  recoveryToken: string,
  newPassword: string,
): Promise<{ status: number; body: string }> {
  return postJsonResponse(backend, "/password/recover", {
    recoveryToken,
    primaryEmail: "regular@example.com",
    newPassword,
  });
}

// @relation(GSSC-BLLR-268, scope=range_start, role=Test)
test("GSSC-BLLR-268 Password Recovery Differs From Current", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  const before = await currentHash();
  expect((await recoverWith(recoveryToken, STRONG)).status).toBe(422);
  expect(await currentHash()).toBe(before);
});
// @relation(GSSC-BLLR-268, scope=range_end, role=Test)

// @relation(GSSC-BLLR-269, scope=range_start, role=Test)
test("GSSC-BLLR-269 Password Recovery Differs From History", async () => {
  setEnv("PASSWORD_HISTORY_COUNT", "3");
  let password = STRONG;
  let token = await loginRegular(password);
  for (const next of [STRONG_NEXT, STRONG_THIRD]) {
    expect((await changePassword(token, password, next)).status).toBe(204);
    password = next;
    token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  }
  const recoveryToken = await requestRecovery("regular@example.com");
  expect((await recoverWith(recoveryToken, STRONG_NEXT)).status).toBe(422);
});
// @relation(GSSC-BLLR-269, scope=range_end, role=Test)

// @relation(GSSC-BLLR-270, scope=range_start, role=Test)
test("GSSC-BLLR-270 Password Recovery Minimum Length", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect((await recoverWith(recoveryToken, "Abcde1!")).status).toBe(422);
});
// @relation(GSSC-BLLR-270, scope=range_end, role=Test)

// @relation(GSSC-BLLR-271, scope=range_start, role=Test)
test("GSSC-BLLR-271 Password Recovery Required Character Classes", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect((await recoverWith(recoveryToken, "abcdefgh1!")).status).toBe(422);
  expect((await recoverWith(recoveryToken, "ABCDEFGH1!")).status).toBe(422);
  expect((await recoverWith(recoveryToken, "Abcdefgh!")).status).toBe(422);
  expect((await recoverWith(recoveryToken, "Abcdefgh1")).status).toBe(422);
});
// @relation(GSSC-BLLR-271, scope=range_end, role=Test)

// @relation(GSSC-BLLR-272, scope=range_start, role=Test)
test("GSSC-BLLR-272 Password Recovery Allowed Characters", async () => {
  const recoveryToken = await requestRecovery("regular@example.com");
  expect((await recoverWith(recoveryToken, "Abcdef1!\u00a3")).status).toBe(422);
});
// @relation(GSSC-BLLR-272, scope=range_end, role=Test)

// @relation(GSSC-BLLR-258, scope=range_start, role=Test)
test("GSSC-BLLR-258 Password Recovery Stores Current Hash", async () => {
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
});
// @relation(GSSC-BLLR-258, scope=range_end, role=Test)

// @relation(GSSC-BLLR-259, scope=range_start, role=Test)
test("GSSC-BLLR-259 Password Recovery Retains History", async () => {
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
  expect(await historyHashes()).toContain(before);
});
// @relation(GSSC-BLLR-259, scope=range_end, role=Test)

// @relation(GSSC-BLLR-260, scope=range_start, role=Test)
test("GSSC-BLLR-260 Password Recovery Marks Token Used", async () => {
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
  const rows = await recoveryRows();
  expect(rows[0]?.usedAt).not.toBeNull();
});
// @relation(GSSC-BLLR-260, scope=range_end, role=Test)

// @relation(GSSC-BLLR-244, scope=range_start, role=Test)
test("GSSC-BLLR-244 Past Password Hash Rows", async () => {
  const token = await loginRegular();
  const before = await currentHash();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  const rows = await prisma().passwordHistory.findMany({ where: { userId: memberId } });
  expect(rows.length).toBe(1);
  expect(rows[0]?.passwordHash).toBe(before);
  expect(rows[0]?.userId).toBe(memberId);
});
// @relation(GSSC-BLLR-244, scope=range_end, role=Test)

// @relation(GSSC-BLLR-262, scope=range_start, role=Test)
test("GSSC-BLLR-262 Past Password Hash Creation Time", async () => {
  const token = await loginRegular();
  const beforeChange = Date.now();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  const rows = await prisma().passwordHistory.findMany({ where: { userId: memberId } });
  expect(rows.length).toBe(1);
  expect(rows[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeChange - 1000);
  expect(rows[0]?.createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
});
// @relation(GSSC-BLLR-262, scope=range_end, role=Test)

// @relation(GSSC-BLLR-261, scope=range_start, role=Test)
test("GSSC-BLLR-261 Past Password Hash Count Limit", async () => {
  setEnv("PASSWORD_HISTORY_COUNT", "2");
  let password = STRONG;
  let token = await loginRegular(password);
  const firstHash = await currentHash();
  for (const next of [STRONG_NEXT, STRONG_THIRD, STRONG_FOURTH]) {
    expect((await changePassword(token, password, next)).status).toBe(204);
    password = next;
    token = (await establishedLogin(backend, { username: "regular-member", password })) ?? "";
  }
  const hashes = await historyHashes();
  expect(hashes.length).toBe(2);
  expect(hashes).not.toContain(firstHash);
});
// @relation(GSSC-BLLR-261, scope=range_end, role=Test)

// @relation(GSSC-BLLR-245, scope=range_start, role=Test)
test("GSSC-BLLR-245 Password Recovery Token Rows", async () => {
  const rows = await app.sql.query(`PRAGMA table_info("password_recovery_tokens")`);
  const names = new Set(rows.map((row) => String(row.name)));
  for (const column of ["tokenHash", "userId", "primaryEmail", "issuedAt", "expiresAt", "usedAt"]) {
    expect(names.has(column)).toBe(true);
  }
});
// @relation(GSSC-BLLR-245, scope=range_end, role=Test)

async function clearPasswords(
  cuid: string,
  token: string,
): Promise<{ status: number; body: string }> {
  return postJsonResponse(backend, `/users/${cuid}/clear-passwords`, {}, {
    cookie: cookieHeaderForToken(token),
  });
}

async function loginModerator(): Promise<string> {
  const token = await establishedLogin(backend, {
    username: "password-moderator",
    password: STRONG,
  });
  expect(token).toEqual(expect.any(String));
  return token ?? "";
}

async function seedHistory(): Promise<string> {
  const token = await loginRegular();
  expect((await changePassword(token, STRONG, STRONG_NEXT)).status).toBe(204);
  expect((await historyHashes()).length).toBe(1);
  return await currentHash();
}

// @relation(GSSC-BLLR-263, scope=range_start, role=Test)
test("GSSC-BLLR-263 Clear Past Passwords", async () => {
  const current = await seedHistory();
  const adminToken = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect((await clearPasswords(memberId, adminToken ?? "")).status).toBe(204);
  expect(await historyHashes()).toEqual([]);
  expect(await currentHash()).toBe(current);
});
// @relation(GSSC-BLLR-263, scope=range_end, role=Test)

// @relation(GSSC-BLLR-264, scope=range_start, role=Test)
test("GSSC-BLLR-264 Clear Past Passwords Login Token Required", async () => {
  await seedHistory();
  expect((await clearPasswords(memberId, "not-a-login-token")).status).toBe(403);
  expect((await historyHashes()).length).toBe(1);
});
// @relation(GSSC-BLLR-264, scope=range_end, role=Test)

// @relation(GSSC-BLLR-265, scope=range_start, role=Test)
test("GSSC-BLLR-265 Clear Past Passwords Privilege", async () => {
  await seedHistory();
  const modToken = await loginModerator();
  expect(moderatorId).toEqual(expect.any(String));
  expect((await clearPasswords(memberId, modToken)).status).toBe(204);
  expect(await historyHashes()).toEqual([]);
});
// @relation(GSSC-BLLR-265, scope=range_end, role=Test)

// @relation(GSSC-BLLR-266, scope=range_start, role=Test)
test("GSSC-BLLR-266 Clear Past Passwords Forbidden", async () => {
  await seedHistory();
  const memberToken = await loginRegular(STRONG_NEXT);
  expect((await clearPasswords(memberId, memberToken)).status).toBe(403);
  expect((await historyHashes()).length).toBe(1);
  // Non-moderator must get the same forbid for missing cuid (no existence oracle).
  expect((await clearPasswords("missing-user-cuid", memberToken)).status).toBe(403);
});
// @relation(GSSC-BLLR-266, scope=range_end, role=Test)

// @relation(GSSC-BLLR-267, scope=range_start, role=Test)
test("GSSC-BLLR-267 Clear Past Passwords User Not Found", async () => {
  await seedHistory();
  const adminToken = await establishedLogin(backend, {
    username: memberUsername,
    password: memberPassword,
  });
  expect((await clearPasswords("missing-user-cuid", adminToken ?? "")).status).toBe(404);
  expect((await historyHashes()).length).toBe(1);
});
// @relation(GSSC-BLLR-267, scope=range_end, role=Test)
