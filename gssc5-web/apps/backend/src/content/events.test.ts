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

async function seedListedEvents() {
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
  const pub = await prisma.event.create({
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
  const priv = await prisma.event.create({
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
  return { pub, priv };
}

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  await seedListedEvents();
  seeded = true;
}

// @relation(GSSC-BLLR-402, scope=range_start, role=Test)
test("GSSC-BLLR-402 event table stores required columns", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Table Shape", day: 2 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.event.findUnique({ where: { id: cuid } });
  expect(row).toMatchObject({
    name: "Table Shape",
    month: 4,
    day: 2,
    year: 2027,
    announcementStartMonth: 3,
    announcementStartDay: 1,
    announcementStartYear: 2027,
    time: "09:00",
    duration: "3 hours",
    location: "Main Gate",
    isPublic: true,
  });
  expect(row!.pageDataId.length).toBeGreaterThan(0);
  expect(typeof row!.createPerm).toBe("number");
  expect(typeof row!.modifyPerm).toBe("number");
  expect(typeof row!.deletePerm).toBe("number");
});
// @relation(GSSC-BLLR-402, scope=range_end, role=Test)

// @relation(GSSC-BLLR-403, scope=range_start, role=Test)
test("GSSC-BLLR-403 event name is stored", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Named Event", day: 3 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  expect((created.body as { name: string }).name).toBe("Named Event");
});
// @relation(GSSC-BLLR-403, scope=range_end, role=Test)

// @relation(GSSC-BLLR-404, scope=range_start, role=Test)
test("GSSC-BLLR-404 event date maps onto page_data start and end", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Date Map", month: 8, day: 9, year: 2028 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const entry = created.body as {
    month: number;
    day: number;
    year: number;
    pageDataCuid: string;
  };
  expect(entry).toMatchObject({ month: 8, day: 9, year: 2028 });
  const details = await getPrisma(loadConfig().DATABASE_URL).pageDataEntry.findUnique({
    where: { id: entry.pageDataCuid },
  });
  expect(details).toMatchObject({
    startMonth: 8,
    startDay: 9,
    startYear: 2028,
    endMonth: 8,
    endDay: 9,
    endYear: 2028,
  });
});
// @relation(GSSC-BLLR-404, scope=range_end, role=Test)

// @relation(GSSC-BLLR-405, scope=range_start, role=Test)
test("GSSC-BLLR-405 announcement start is stored on the event row", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({
      name: "Announce Start",
      day: 4,
      announcementStartMonth: 1,
      announcementStartDay: 15,
      announcementStartYear: 2026,
    }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const body = created.body as {
    announcementStartMonth: number;
    announcementStartDay: number;
    announcementStartYear: number;
    pageDataCuid: string;
  };
  expect(body).toMatchObject({
    announcementStartMonth: 1,
    announcementStartDay: 15,
    announcementStartYear: 2026,
  });
  const details = await getPrisma(loadConfig().DATABASE_URL).pageDataEntry.findUnique({
    where: { id: body.pageDataCuid },
  });
  expect(details!.startMonth).toBe(4);
  expect(details!.startDay).toBe(4);
});
// @relation(GSSC-BLLR-405, scope=range_end, role=Test)

// @relation(GSSC-BLLR-406, scope=range_start, role=Test)
test("GSSC-BLLR-406 event time is stored", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Timed", day: 5, time: "14:30" }),
    adminTok,
  );
  expect(created.status).toBe(201);
  expect((created.body as { time: string }).time).toBe("14:30");
});
// @relation(GSSC-BLLR-406, scope=range_end, role=Test)

// @relation(GSSC-BLLR-407, scope=range_start, role=Test)
test("GSSC-BLLR-407 event duration is stored", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Duration", day: 6, duration: "90 minutes" }),
    adminTok,
  );
  expect(created.status).toBe(201);
  expect((created.body as { duration: string }).duration).toBe("90 minutes");
});
// @relation(GSSC-BLLR-407, scope=range_end, role=Test)

// @relation(GSSC-BLLR-408, scope=range_start, role=Test)
test("GSSC-BLLR-408 event location is stored", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Located", day: 7, location: "Chapel" }),
    adminTok,
  );
  expect(created.status).toBe(201);
  expect((created.body as { location: string }).location).toBe("Chapel");
});
// @relation(GSSC-BLLR-408, scope=range_end, role=Test)

// @relation(GSSC-BLLR-409, scope=range_start, role=Test)
test("GSSC-BLLR-409 event references event-details page_data", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Details Ref", day: 8 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const pageDataCuid = (created.body as { pageDataCuid: string }).pageDataCuid;
  const details = await getPrisma(loadConfig().DATABASE_URL).pageDataEntry.findUnique({
    where: { id: pageDataCuid },
  });
  expect(details!.datatype).toBe("event");
});
// @relation(GSSC-BLLR-409, scope=range_end, role=Test)

// @relation(GSSC-BLLR-410, scope=range_start, role=Test)
test("GSSC-BLLR-410 event audience isPublic is stored", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Private Audience", day: 9, isPublic: false }),
    adminTok,
  );
  expect(created.status).toBe(201);
  expect((created.body as { isPublic: boolean }).isPublic).toBe(false);
});
// @relation(GSSC-BLLR-410, scope=range_end, role=Test)

// @relation(GSSC-BLLR-412, scope=range_start, role=Test)
test("GSSC-BLLR-412 public event list returns only public events", async () => {
  await ensureSeeded();
  const { status, body } = await getJson("/events");
  expect(status).toBe(200);
  const names = (body as { name: string }[]).map((e) => e.name);
  expect(names).toContain("Public Tour");
  expect(names).not.toContain("Members Meeting");
});
// @relation(GSSC-BLLR-412, scope=range_end, role=Test)

// @relation(GSSC-BLLR-413, scope=range_start, role=Test)
test("GSSC-BLLR-413 authenticated event list includes members-only", async () => {
  await ensureSeeded();
  const { status, body } = await getJson("/events", memberTok);
  expect(status).toBe(200);
  const names = (body as { name: string }[]).map((e) => e.name);
  expect(names).toContain("Public Tour");
  expect(names).toContain("Members Meeting");
});
// @relation(GSSC-BLLR-413, scope=range_end, role=Test)

// @relation(GSSC-BLLR-414, scope=range_start, role=Test)
test("GSSC-BLLR-414 event list entry fields and date order", async () => {
  await ensureSeeded();
  const { status, body } = await getJson("/events", adminTok);
  expect(status).toBe(200);
  const entries = body as Record<string, unknown>[];
  const entry = entries.find((e) => e.name === "Public Tour")!;
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
    header: "Public",
    body: "pub",
    startMonth: 5,
    startDay: 1,
    startYear: 2027,
    endMonth: 5,
    endDay: 1,
    endYear: 2027,
  });
  expect(typeof entry.cuid).toBe("string");
  expect(typeof entry.pageDataCuid).toBe("string");
  expect(Array.isArray(entry.resources)).toBe(true);
  expect("imageFile" in entry).toBe(true);
  expect("imagePosition" in entry).toBe(true);
  const years = entries.map((e) => e.year as number);
  expect([...years].sort((a, b) => a - b)).toEqual(years);
});
// @relation(GSSC-BLLR-414, scope=range_end, role=Test)

// @relation(GSSC-BLLR-415, scope=range_start, role=Test)
test("GSSC-BLLR-415 public get returns a public event", async () => {
  await ensureSeeded();
  const pub = await getPrisma(loadConfig().DATABASE_URL).event.findFirst({
    where: { name: "Public Tour" },
  });
  const { status, body } = await getJson(`/events/${pub!.id}`);
  expect(status).toBe(200);
  const entry = body as {
    name: string;
    header: string;
    body: string;
    resources: unknown;
    startMonth: number;
    imageFile: string | null;
  };
  expect(entry.name).toBe("Public Tour");
  expect(entry.header).toBe("Public");
  expect(entry.body).toBe("pub");
  expect(Array.isArray(entry.resources)).toBe(true);
  expect(entry.startMonth).toBe(5);
  expect("imageFile" in entry).toBe(true);
});
// @relation(GSSC-BLLR-415, scope=range_end, role=Test)

// @relation(GSSC-BLLR-416, scope=range_start, role=Test)
test("GSSC-BLLR-416 public get rejects members-only event", async () => {
  await ensureSeeded();
  const priv = await getPrisma(loadConfig().DATABASE_URL).event.findFirst({
    where: { name: "Members Meeting" },
  });
  const { status } = await getJson(`/events/${priv!.id}`);
  expect(status).toBe(403);
});
// @relation(GSSC-BLLR-416, scope=range_end, role=Test)

// @relation(GSSC-BLLR-417, scope=range_start, role=Test)
test("GSSC-BLLR-417 authenticated get returns members-only event", async () => {
  await ensureSeeded();
  const priv = await getPrisma(loadConfig().DATABASE_URL).event.findFirst({
    where: { name: "Members Meeting" },
  });
  const { status, body } = await getJson(`/events/${priv!.id}`, memberTok);
  expect(status).toBe(200);
  const entry = body as { name: string; header: string; body: string };
  expect(entry.name).toBe("Members Meeting");
  expect(entry.header).toBe("Private");
  expect(entry.body).toBe("priv");
});
// @relation(GSSC-BLLR-417, scope=range_end, role=Test)

// @relation(GSSC-BLLR-418, scope=range_start, role=Test)
test("GSSC-BLLR-418 create event and details for permitted caller", async () => {
  const created = await sendJson("POST", "/events", sampleEvent({ name: "Created", day: 10 }), userModTok);
  expect(created.status).toBe(201);
  const entry = created.body as { cuid: string; pageDataCuid: string; name: string };
  expect(entry.name).toBe("Created");
  expect(entry.cuid.length).toBeGreaterThan(0);
  expect(entry.pageDataCuid.length).toBeGreaterThan(0);
});
// @relation(GSSC-BLLR-418, scope=range_end, role=Test)

// @relation(GSSC-BLLR-419, scope=range_start, role=Test)
test("GSSC-BLLR-419 create forbidden without create permission", async () => {
  const { status } = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Denied", day: 11 }),
    memberTok,
  );
  expect(status).toBe(403);
});
// @relation(GSSC-BLLR-419, scope=range_end, role=Test)

// @relation(GSSC-BLLR-420, scope=range_start, role=Test)
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

  const details = await getPrisma(loadConfig().DATABASE_URL).pageDataEntry.findUnique({
    where: { id: pageDataCuid },
  });
  expect(details).toMatchObject({
    startMonth: 7,
    startDay: 20,
    startYear: 2028,
    endMonth: 7,
    endDay: 20,
    endYear: 2028,
    body: "Updated details",
  });
});
// @relation(GSSC-BLLR-420, scope=range_end, role=Test)

// @relation(GSSC-BLLR-421, scope=range_start, role=Test)
test("GSSC-BLLR-421 delete removes event and details", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Delete Me", day: 22 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const pageDataCuid = (created.body as { pageDataCuid: string }).pageDataCuid;

  const deleted = await sendJson("DELETE", `/events/${cuid}`, {}, userModTok);
  expect(deleted.status).toBe(204);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  expect(await prisma.event.findUnique({ where: { id: cuid } })).toBeNull();
  expect(await prisma.pageDataEntry.findUnique({ where: { id: pageDataCuid } })).toBeNull();
});
// @relation(GSSC-BLLR-421, scope=range_end, role=Test)

// @relation(GSSC-BLLR-422, scope=range_start, role=Test)
test("GSSC-BLLR-422 delete forbidden without delete permission", async () => {
  const created = await sendJson(
    "POST",
    "/events",
    sampleEvent({ name: "Keep Me", day: 23 }),
    adminTok,
  );
  expect(created.status).toBe(201);
  const cuid = (created.body as { cuid: string }).cuid;
  const denied = await sendJson("DELETE", `/events/${cuid}`, {}, memberTok);
  expect(denied.status).toBe(403);
});
// @relation(GSSC-BLLR-422, scope=range_end, role=Test)
