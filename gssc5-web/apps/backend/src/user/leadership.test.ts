// Leadership list checks. Each assertion is limited to that requirement's statement.
import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";

let app: InProcessApp;
let backend: BackendFetch;
let plainMemberId = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = db();
  const passwordHash = await Bun.password.hash("leadership-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "leader-email",
      primaryEmail: "leader.email@example.com",
      passwordHash,
      firstName: "Email",
      lastName: "Leader",
      primaryPhone: "2095559001",
      preferredContactMethod: "Email",
      position: "President",
      homeLine1: "1 Leader",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Leader",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  await prisma.user.create({
    data: {
      username: "leader-phone",
      primaryEmail: "leader.phone@example.com",
      passwordHash,
      firstName: "Phone",
      lastName: "Leader",
      primaryPhone: "2095559002",
      preferredContactMethod: "Phone",
      position: "Vice President",
      homeLine1: "2 Leader",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Leader",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  await prisma.user.create({
    data: {
      username: "leader-photo",
      primaryEmail: "leader.photo@example.com",
      passwordHash,
      firstName: "Photo",
      lastName: "Leader",
      primaryPhone: "2095559003",
      preferredContactMethod: "None",
      position: "Treasurer",
      accountPhoto: "photo://treasurer",
      homeLine1: "3 Leader",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "3 Leader",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plain = await prisma.user.create({
    data: {
      username: "leader-plain",
      primaryEmail: "leader.plain@example.com",
      passwordHash,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095559004",
      preferredContactMethod: "Email",
      position: null,
      homeLine1: "4 Leader",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "4 Leader",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });
  plainMemberId = plain.id;
}, 120_000);

function db() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function leadershipList(): Promise<{ status: number; body: string; entries: Array<Record<string, unknown>> }> {
  const response = await backend(new Request("http://127.0.0.1/leadership"));
  const body = await response.text();
  let entries: Array<Record<string, unknown>> = [];
  try {
    const parsed: unknown = JSON.parse(body);
    if (Array.isArray(parsed)) {
      entries = parsed.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }
  } catch {
    entries = [];
  }
  return { status: response.status, body, entries };
}

function byPosition(entries: Array<Record<string, unknown>>, position: string): Record<string, unknown> | undefined {
  return entries.find((entry) => entry.position === position);
}

// @relation(GSSC-BLLR-283, scope=range_start, role=Test)
test("GSSC-BLLR-283 Leadership List", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(Array.isArray(result.entries)).toBe(true);
});
// @relation(GSSC-BLLR-283, scope=range_end, role=Test)

// @relation(GSSC-BLLR-284, scope=range_start, role=Test)
test("GSSC-BLLR-284 Leadership List Populated Position", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  const positions = result.entries.map((entry) => entry.position);
  expect(positions).toContain("President");
  expect(positions).toContain("Vice President");
  expect(positions).toContain("Treasurer");
  expect(positions).not.toContain(null);
  expect(positions).not.toContain("");
  expect(result.body.includes("Plain")).toBe(false);
  expect(result.body.includes(plainMemberId)).toBe(false);
});
// @relation(GSSC-BLLR-284, scope=range_end, role=Test)

// @relation(GSSC-BLLR-285, scope=range_start, role=Test)
test("GSSC-BLLR-285 Leadership Entry Position", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  for (const entry of result.entries) {
    expect(typeof entry.position).toBe("string");
    expect(entry.position).not.toBe("");
  }
  expect(byPosition(result.entries, "President")?.position).toBe("President");
});
// @relation(GSSC-BLLR-285, scope=range_end, role=Test)

// @relation(GSSC-BLLR-286, scope=range_start, role=Test)
test("GSSC-BLLR-286 Leadership Entry First Name", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "President")?.firstName).toBe("Email");
  expect(byPosition(result.entries, "Vice President")?.firstName).toBe("Phone");
});
// @relation(GSSC-BLLR-286, scope=range_end, role=Test)

// @relation(GSSC-BLLR-287, scope=range_start, role=Test)
test("GSSC-BLLR-287 Leadership Entry Last Name", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "President")?.lastName).toBe("Leader");
  expect(byPosition(result.entries, "Treasurer")?.lastName).toBe("Leader");
});
// @relation(GSSC-BLLR-287, scope=range_end, role=Test)

// @relation(GSSC-BLLR-288, scope=range_start, role=Test)
test("GSSC-BLLR-288 Leadership Entry Account Photo", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "Treasurer")?.accountPhoto).toBe("photo://treasurer");
  expect(byPosition(result.entries, "President")?.accountPhoto).toBeUndefined();
  expect(byPosition(result.entries, "Vice President")?.accountPhoto).toBeUndefined();
});
// @relation(GSSC-BLLR-288, scope=range_end, role=Test)

// @relation(GSSC-BLLR-289, scope=range_start, role=Test)
test("GSSC-BLLR-289 Leadership Entry Primary Email", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "President")?.primaryEmail).toBe("leader.email@example.com");
  expect(byPosition(result.entries, "Vice President")?.primaryEmail).toBeUndefined();
  expect(byPosition(result.entries, "Treasurer")?.primaryEmail).toBeUndefined();
});
// @relation(GSSC-BLLR-289, scope=range_end, role=Test)

// @relation(GSSC-BLLR-290, scope=range_start, role=Test)
test("GSSC-BLLR-290 Leadership Entry Primary Phone Number", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "Vice President")?.primaryPhone).toBe("2095559002");
  expect(byPosition(result.entries, "President")?.primaryPhone).toBeUndefined();
  expect(byPosition(result.entries, "Treasurer")?.primaryPhone).toBeUndefined();
});
// @relation(GSSC-BLLR-290, scope=range_end, role=Test)

// @relation(GSSC-BLLR-291, scope=range_start, role=Test)
test("GSSC-BLLR-291 Leadership Entry Preferred Contact Method", async () => {
  const result = await leadershipList();
  expect(result.status).toBe(200);
  expect(byPosition(result.entries, "President")?.preferredContactMethod).toBe("Email");
  expect(byPosition(result.entries, "Vice President")?.preferredContactMethod).toBe("Phone");
  expect(byPosition(result.entries, "Treasurer")?.preferredContactMethod).toBe("None");
});
// @relation(GSSC-BLLR-291, scope=range_end, role=Test)
