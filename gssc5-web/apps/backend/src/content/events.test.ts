import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import { PERM_USER_MOD } from "./helpers";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let memberTok = "";
let userModTok = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);

  const modHash = await Bun.password.hash("usermod-event-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "event-usermod",
      primaryEmail: "event.usermod@example.com",
      passwordHash: modHash,
      isAdmin: false,
      isUserMod: true,
      firstName: "Event",
      lastName: "Mod",
      primaryPhone: "2095550401",
      preferredContactMethod: "Email",
      homeLine1: "1 Event",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Event",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-event-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-event",
      primaryEmail: "plain.event@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550402",
      preferredContactMethod: "Email",
      homeLine1: "2 Plain",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Plain",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  adminTok =
    (await establishedLogin(backend, {
      username: memberUsername,
      password: memberPassword,
    })) ?? "";
  expect(adminTok.length).toBeGreaterThan(0);

  memberTok =
    (await establishedLogin(backend, {
      username: "plain-member-event",
      password: "plain-event-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  userModTok =
    (await establishedLogin(backend, {
      username: "event-usermod",
      password: "usermod-event-secret",
    })) ?? "";
  expect(userModTok.length).toBeGreaterThan(0);
});

async function getJson(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(new Request(`http://127.0.0.1${path}`, { headers }));
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: response.status, body };
}

async function sendJson(
  method: string,
  path: string,
  body: unknown,
  token?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.cookie = cookieHeaderForToken(token);
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      method,
      headers,
      body: JSON.stringify(body),
    }),
  );
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: response.status, body: parsed };
}

function sampleEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "Spring Cleanup",
    month: 4,
    day: 12,
    year: 2027,
    announcementStartMonth: 3,
    announcementStartDay: 1,
    announcementStartYear: 2027,
    time: "09:00",
    duration: "3 hours",
    location: "Main Gate",
    isPublic: true,
    body: "Bring gloves.",
    ...overrides,
  };
}

// @relation(GSSC-BLLR-412, GSSC-BLLR-414, role=Test)
test("GSSC-BLLR-412/414 public event list returns only public entries with fields", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const publicDetails = await prisma.pageDataEntry.create({
    data: {
      datatype: "event",
      header: "Public",
      body: "pub",
      isPublic: true,
      startMonth: 5,
      startDay: 1,
      startYear: 2027,
      endMonth: 5,
      endDay: 1,
      endYear: 2027,
    },
  });
  const privateDetails = await prisma.pageDataEntry.create({
    data: {
      datatype: "event",
      header: "Private",
      body: "priv",
      isPublic: false,
      startMonth: 6,
      startDay: 1,
      startYear: 2027,
      endMonth: 6,
      endDay: 1,
      endYear: 2027,
    },
  });
  await prisma.event.create({
    data: {
      name: "Public Tour",
      month: 5,
      day: 1,
      year: 2027,
      announcementStartMonth: 4,
      announcementStartDay: 1,
      announcementStartYear: 2027,
      time: "10:00",
      duration: "1 hour",
      location: "Office",
      isPublic: true,
      createPerm: PERM_USER_MOD,
      modifyPerm: PERM_USER_MOD,
      deletePerm: PERM_USER_MOD,
      pageDataId: publicDetails.id,
    },
  });
  await prisma.event.create({
    data: {
      name: "Members Meeting",
      month: 6,
      day: 1,
      year: 2027,
      announcementStartMonth: 5,
      announcementStartDay: 1,
      announcementStartYear: 2027,
      time: "19:00",
      duration: "2 hours",
      location: "Hall",
      isPublic: false,
      createPerm: PERM_USER_MOD,
      modifyPerm: PERM_USER_MOD,
      deletePerm: PERM_USER_MOD,
      pageDataId: privateDetails.id,
    },
  });

  const { status, body } = await getJson("/events");
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  const names = (body as { name: string; isPublic: boolean }[]).map((e) => e.name);
  expect(names).toContain("Public Tour");
  expect(names).not.toContain("Members Meeting");
  const entry = (body as Record<string, unknown>[]).find((e) => e.name === "Public Tour")!;
  expect(entry).toMatchObject({
    month: 5,
    day: 1,
    year: 2027,
    announcementStartMonth: 4,
    announcementStartDay: 1,
    announcementStartYear: 2027,
    time: "10:00",
    duration: "1 hour",
    location: "Office",
    isPublic: true,
  });
  expect(typeof entry.cuid).toBe("string");
  expect(typeof entry.pageDataCuid).toBe("string");
});

// @relation(GSSC-BLLR-413, role=Test)
test("GSSC-BLLR-413 authenticated event list includes members-only", async () => {
  const { status, body } = await getJson("/events", memberTok);
  expect(status).toBe(200);
  const names = (body as { name: string }[]).map((e) => e.name);
  expect(names).toContain("Public Tour");
  expect(names).toContain("Members Meeting");
});

// @relation(GSSC-BLLR-415, GSSC-BLLR-416, role=Test)
test("GSSC-BLLR-415/416 public get allows public and rejects private", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const pub = await prisma.event.findFirst({ where: { name: "Public Tour" } });
  const priv = await prisma.event.findFirst({ where: { name: "Members Meeting" } });
  expect(pub).toBeTruthy();
  expect(priv).toBeTruthy();

  const ok = await getJson(`/events/${pub!.id}`);
  expect(ok.status).toBe(200);
  expect((ok.body as { name: string }).name).toBe("Public Tour");

  const denied = await getJson(`/events/${priv!.id}`);
  expect(denied.status).toBe(403);
});

// @relation(GSSC-BLLR-417, role=Test)
test("GSSC-BLLR-417 authenticated get returns members-only event", async () => {
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const priv = await prisma.event.findFirst({ where: { name: "Members Meeting" } });
  const { status, body } = await getJson(`/events/${priv!.id}`, memberTok);
  expect(status).toBe(200);
  expect((body as { name: string }).name).toBe("Members Meeting");
});

// @relation(GSSC-BLLR-418, GSSC-BLLR-402, GSSC-BLLR-403, GSSC-BLLR-404, GSSC-BLLR-405, GSSC-BLLR-406, GSSC-BLLR-407, GSSC-BLLR-408, GSSC-BLLR-409, GSSC-BLLR-410, role=Test)
test("GSSC-BLLR-418/402–410 create event with details and maps date onto page_data start/end", async () => {
  const created = await sendJson("POST", "/events", sampleEvent(), userModTok);
  expect(created.status).toBe(201);
  const entry = created.body as {
    cuid: string;
    pageDataCuid: string;
    name: string;
    month: number;
    day: number;
    year: number;
    announcementStartMonth: number;
  };
  expect(entry.name).toBe("Spring Cleanup");
  expect(entry.month).toBe(4);
  expect(entry.announcementStartMonth).toBe(3);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const details = await prisma.pageDataEntry.findUnique({
    where: { id: entry.pageDataCuid },
  });
  expect(details).toBeTruthy();
  expect(details!.datatype).toBe("event");
  expect(details!.startMonth).toBe(4);
  expect(details!.startDay).toBe(12);
  expect(details!.startYear).toBe(2027);
  expect(details!.endMonth).toBe(4);
  expect(details!.endDay).toBe(12);
  expect(details!.endYear).toBe(2027);
  expect(details!.isPublic).toBe(true);

  const row = await prisma.event.findUnique({ where: { id: entry.cuid } });
  expect(row!.announcementStartDay).toBe(1);
  expect(row!.time).toBe("09:00");
  expect(row!.duration).toBe("3 hours");
  expect(row!.location).toBe("Main Gate");
});

// @relation(GSSC-BLLR-419, role=Test)
test("GSSC-BLLR-419 create forbidden for plain member without create permission", async () => {
  const { status } = await sendJson("POST", "/events", sampleEvent({ name: "Denied" }), memberTok);
  expect(status).toBe(403);
});

// @relation(GSSC-BLLR-420, role=Test)
test("GSSC-BLLR-420 modify updates event and remaps page_data dates", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Patch Me", day: 15 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const pageDataCuid = (created.body as { pageDataCuid: string }).pageDataCuid;

  const patched = await sendJson(
    "PATCH",
    `/events/${cuid}`,
    { month: 7, day: 20, year: 2028, location: "North Lawn", body: "Updated details" },
    userModTok,
  );
  expect(patched.status).toBe(200);
  expect((patched.body as { location: string; month: number }).location).toBe("North Lawn");
  expect((patched.body as { month: number }).month).toBe(7);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const details = await prisma.pageDataEntry.findUnique({ where: { id: pageDataCuid } });
  expect(details!.startMonth).toBe(7);
  expect(details!.startDay).toBe(20);
  expect(details!.startYear).toBe(2028);
  expect(details!.endMonth).toBe(7);
  expect(details!.endDay).toBe(20);
  expect(details!.endYear).toBe(2028);
  expect(details!.body).toBe("Updated details");
});

// @relation(GSSC-BLLR-421, GSSC-BLLR-422, role=Test)
test("GSSC-BLLR-421/422 delete removes event and details; forbidden without permission", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Delete Me", day: 22 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const pageDataCuid = (created.body as { pageDataCuid: string }).pageDataCuid;

  const denied = await sendJson("DELETE", `/events/${cuid}`, {}, memberTok);
  expect(denied.status).toBe(403);

  const deleted = await sendJson("DELETE", `/events/${cuid}`, {}, userModTok);
  expect(deleted.status).toBe(204);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  expect(await prisma.event.findUnique({ where: { id: cuid } })).toBeNull();
  expect(await prisma.pageDataEntry.findUnique({ where: { id: pageDataCuid } })).toBeNull();
});
