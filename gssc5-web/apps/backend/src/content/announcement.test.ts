// Announcement module checks. Each assertion is limited to that requirement's statement.
import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  postJsonResponse,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import { PERM_MEMBER } from "./helpers";

const MEMBER_PERM = PERM_MEMBER;

let app: InProcessApp;
let backend: BackendFetch;
let memberTok = "";
let publicTemplateId = "";
let lockedTemplateId = "";

beforeAll(async () => {
  app = await bootInProcess();
  backend = app.backend;
  const prisma = db();
  const passwordHash = await Bun.password.hash("announce-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "ann-member",
      primaryEmail: "ann.member@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550301",
      preferredContactMethod: "Email",
      homeLine1: "1 Mem",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Mem",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  // Ensure seed admin login still works (shared harness user).
  const adminTok =
    (await establishedLogin(backend, {
      username: memberUsername,
      password: memberPassword,
    })) ?? "";
  expect(adminTok.length).toBeGreaterThan(0);

  memberTok =
    (await establishedLogin(backend, {
      username: "ann-member",
      password: "announce-secret",
    })) ?? "";
  expect(memberTok.length).toBeGreaterThan(0);

  const publicTemplate = await prisma.contentTemplate.create({
    data: {
      name: "Ann Public",
      isPublic: true,
      tags: JSON.stringify(["announce"]),
      createPerm: MEMBER_PERM,
      modifyPerm: MEMBER_PERM,
      deletePerm: MEMBER_PERM,
    },
  });
  publicTemplateId = publicTemplate.id;

  const locked = await prisma.contentTemplate.create({
    data: {
      name: "Ann Admin Only Create",
      isPublic: true,
      tags: JSON.stringify(["locked"]),
      createPerm: 0,
      modifyPerm: 0,
      deletePerm: 0,
    },
  });
  lockedTemplateId = locked.id;
}, 120_000);

function db() {
  return getPrisma(loadConfig().DATABASE_URL);
}

async function getJson(
  path: string,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      headers: token ? { cookie: cookieHeaderForToken(token) } : undefined,
    }),
  );
  const text = await response.text();
  let body: unknown = text;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

function parseBody(text: string): unknown {
  if (text.length === 0) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function sendJson(
  method: string,
  path: string,
  payload: unknown,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  if (method === "POST") {
    const response = await postJsonResponse(
      backend,
      path,
      payload,
      token ? { cookie: cookieHeaderForToken(token) } : undefined,
    );
    return { status: response.status, body: parseBody(response.body) };
  }
  const response = await backend(
    new Request(`http://127.0.0.1${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: cookieHeaderForToken(token) } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );
  return { status: response.status, body: parseBody(await response.text()) };
}

async function seedAnnouncement(data: {
  header?: string | null;
  body: string;
  tags?: string[];
  index?: number;
  isPublic: boolean;
  resources?: string[];
  createPerm?: number;
  modifyPerm?: number;
  deletePerm?: number;
  templateId?: string;
  startMonth?: number | null;
  startDay?: number | null;
  startYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  endYear?: number | null;
}) {
  return db().pageDataEntry.create({
    data: {
      datatype: "announcement",
      header: data.header ?? null,
      body: data.body,
      tags: JSON.stringify(data.tags ?? []),
      resources: JSON.stringify(data.resources ?? []),
      index: data.index ?? 0,
      isPublic: data.isPublic,
      createPerm: data.createPerm ?? 0,
      modifyPerm: data.modifyPerm ?? 0,
      deletePerm: data.deletePerm ?? 0,
      templateId: data.templateId,
      startMonth: data.startMonth ?? null,
      startDay: data.startDay ?? null,
      startYear: data.startYear ?? null,
      endMonth: data.endMonth ?? null,
      endDay: data.endDay ?? null,
      endYear: data.endYear ?? null,
    },
  });
}

async function seedEvent(data: {
  name: string;
  isPublic: boolean;
  month: number;
  day: number;
  year: number;
  announcementStartMonth: number;
  announcementStartDay: number;
  announcementStartYear: number;
  time?: string;
  duration?: string;
  location?: string;
}) {
  const details = await db().pageDataEntry.create({
    data: {
      datatype: "event",
      header: data.name,
      body: data.name,
      tags: JSON.stringify([]),
      resources: JSON.stringify([]),
      index: 0,
      isPublic: data.isPublic,
      startMonth: data.month,
      startDay: data.day,
      startYear: data.year,
      endMonth: data.month,
      endDay: data.day,
      endYear: data.year,
    },
  });
  return db().event.create({
    data: {
      name: data.name,
      month: data.month,
      day: data.day,
      year: data.year,
      announcementStartMonth: data.announcementStartMonth,
      announcementStartDay: data.announcementStartDay,
      announcementStartYear: data.announcementStartYear,
      time: data.time ?? "10:00",
      duration: data.duration ?? "1h",
      location: data.location ?? "Hall",
      isPublic: data.isPublic,
      pageDataId: details.id,
    },
  });
}

function listAnnouncements(body: unknown): Array<Record<string, unknown>> {
  return (body as { announcements: Array<Record<string, unknown>> }).announcements;
}

function listEvents(body: unknown): Array<Record<string, unknown>> {
  return (body as { events: Array<Record<string, unknown>> }).events;
}

function farFuture(): { month: number; day: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, day: now.getDate(), year: now.getFullYear() + 2 };
}

function farPast(): { month: number; day: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, day: now.getDate(), year: now.getFullYear() - 2 };
}

// @relation(GSSC-BLLR-438, scope=range_start, role=Test)
test("GSSC-BLLR-438 Public Announcement List", async () => {
  await seedAnnouncement({ body: "public ann", isPublic: true, header: "Pub", index: 1 });
  await seedAnnouncement({ body: "private ann", isPublic: false, header: "Priv", index: 2 });

  const { status, body } = await getJson("/announcements");
  expect(status).toBe(200);
  const list = listAnnouncements(body);
  expect(list.some((entry) => entry.body === "public ann")).toBe(true);
  expect(list.some((entry) => entry.body === "private ann")).toBe(false);
});
// @relation(GSSC-BLLR-438, scope=range_end, role=Test)

// @relation(GSSC-BLLR-439, scope=range_start, role=Test)
test("GSSC-BLLR-439 Authenticated Announcement List", async () => {
  await seedAnnouncement({ body: "auth-public-ann", isPublic: true, index: 10 });
  await seedAnnouncement({ body: "auth-private-ann", isPublic: false, index: 11 });

  const { status, body } = await getJson("/announcements", memberTok);
  expect(status).toBe(200);
  const list = listAnnouncements(body);
  expect(list.some((entry) => entry.body === "auth-public-ann")).toBe(true);
  expect(list.some((entry) => entry.body === "auth-private-ann")).toBe(true);
});
// @relation(GSSC-BLLR-439, scope=range_end, role=Test)

// @relation(GSSC-BLLR-440, scope=range_start, role=Test)
test("GSSC-BLLR-440 Announcement List Entry Fields", async () => {
  const row = await seedAnnouncement({
    header: "Fields",
    body: "field body ann",
    tags: ["t1"],
    index: 42,
    isPublic: true,
  });

  const { status, body } = await getJson("/announcements");
  expect(status).toBe(200);
  const entry = listAnnouncements(body).find((item) => item.cuid === row.id);
  expect(entry).toEqual({
    cuid: row.id,
    header: "Fields",
    body: "field body ann",
    resources: [],
    tags: ["t1"],
    index: 42,
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    imageFile: null,
    imagePosition: null,
  });
});
// @relation(GSSC-BLLR-440, scope=range_end, role=Test)

// @relation(GSSC-BLLR-441, scope=range_start, role=Test)
test("GSSC-BLLR-441 Announcement List Index Order", async () => {
  const stamp = `ann-order-${Date.now()}`;
  await seedAnnouncement({ body: `${stamp}-c`, isPublic: true, index: 30, tags: [stamp] });
  await seedAnnouncement({ body: `${stamp}-a`, isPublic: true, index: 10, tags: [stamp] });
  await seedAnnouncement({ body: `${stamp}-b`, isPublic: true, index: 20, tags: [stamp] });

  const { status, body } = await getJson(`/announcements?tag=${encodeURIComponent(stamp)}`);
  expect(status).toBe(200);
  const list = listAnnouncements(body);
  expect(list.map((entry) => entry.body)).toEqual([`${stamp}-a`, `${stamp}-b`, `${stamp}-c`]);
  expect(list.map((entry) => entry.index)).toEqual([10, 20, 30]);
});
// @relation(GSSC-BLLR-441, scope=range_end, role=Test)

// @relation(GSSC-BLLR-442, scope=range_start, role=Test)
test("GSSC-BLLR-442 Announcement List Filters", async () => {
  const stamp = `ann-filt-${Date.now()}`;
  const row = await seedAnnouncement({
    header: `Alpha ${stamp}`,
    body: `Bravo body ${stamp}`,
    tags: [`tag-${stamp}`],
    isPublic: true,
    index: 1,
  });
  await seedAnnouncement({
    header: "Other",
    body: "zzz",
    tags: ["nofilter"],
    isPublic: true,
    index: 2,
  });

  const byHeader = await getJson(`/announcements?header=${encodeURIComponent(stamp)}`);
  expect(byHeader.status).toBe(200);
  expect(listAnnouncements(byHeader.body).map((e) => e.cuid)).toContain(row.id);

  const byBody = await getJson(`/announcements?body=${encodeURIComponent(`bravo body ${stamp}`)}`);
  expect(listAnnouncements(byBody.body).map((e) => e.cuid)).toContain(row.id);

  const byTag = await getJson(`/announcements?tag=${encodeURIComponent(`TAG-${stamp}`)}`);
  expect(listAnnouncements(byTag.body).map((e) => e.cuid)).toContain(row.id);

  const byCuid = await getJson(`/announcements?cuid=${encodeURIComponent(row.id)}`);
  expect(listAnnouncements(byCuid.body)).toEqual([expect.objectContaining({ cuid: row.id })]);

  const byContent = await getJson(`/announcements?content=${encodeURIComponent(`alpha ${stamp}`)}`);
  expect(listAnnouncements(byContent.body).map((e) => e.cuid)).toContain(row.id);

  const byContentBody = await getJson(
    `/announcements?content=${encodeURIComponent(`bravo body ${stamp}`)}`,
  );
  expect(listAnnouncements(byContentBody.body).map((e) => e.cuid)).toContain(row.id);
});
// @relation(GSSC-BLLR-442, scope=range_end, role=Test)

// @relation(GSSC-BLLR-443, scope=range_start, role=Test)
test("GSSC-BLLR-443 Public Announcement Get", async () => {
  const row = await seedAnnouncement({
    header: "Get Pub",
    body: "get public ann",
    resources: ["r1"],
    tags: ["g"],
    index: 5,
    isPublic: true,
  });

  const { status, body } = await getJson(`/announcements/${row.id}`);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "Get Pub",
    body: "get public ann",
    resources: ["r1"],
    tags: ["g"],
    index: 5,
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    imageFile: null,
    imagePosition: null,
  });
});
// @relation(GSSC-BLLR-443, scope=range_end, role=Test)

// @relation(GSSC-BLLR-444, scope=range_start, role=Test)
test("GSSC-BLLR-444 Public Announcement Get Rejects Private", async () => {
  const row = await seedAnnouncement({ body: "hidden ann", isPublic: false });
  const { status } = await getJson(`/announcements/${row.id}`);
  expect(status).toBe(403);
});
// @relation(GSSC-BLLR-444, scope=range_end, role=Test)

// @relation(GSSC-BLLR-445, scope=range_start, role=Test)
test("GSSC-BLLR-445 Authenticated Announcement Get", async () => {
  const row = await seedAnnouncement({
    header: "Mem",
    body: "member get ann",
    resources: ["x"],
    tags: ["m"],
    index: 7,
    isPublic: false,
  });

  const { status, body } = await getJson(`/announcements/${row.id}`, memberTok);
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "Mem",
    body: "member get ann",
    resources: ["x"],
    tags: ["m"],
    index: 7,
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    imageFile: null,
    imagePosition: null,
  });
});
// @relation(GSSC-BLLR-445, scope=range_end, role=Test)

// @relation(GSSC-BLLR-446, scope=range_start, role=Test)
test("GSSC-BLLR-446 Announcement Creation", async () => {
  const { status, body } = await sendJson(
    "POST",
    "/announcements",
    {
      body: "created announcement",
      templateId: publicTemplateId,
      header: "Created",
      resources: ["res-a"],
      tags: ["extra"],
      index: 99,
    },
    memberTok,
  );
  expect(status).toBe(201);
  const created = body as {
    cuid: string;
    header: string;
    body: string;
    resources: string[];
    tags: string[];
    index: number;
  };
  expect(created.header).toBe("Created");
  expect(created.body).toBe("created announcement");
  expect(created.resources).toEqual(["res-a"]);
  expect(created.tags).toEqual(expect.arrayContaining(["announce", "extra"]));
  expect(created.index).toBe(99);

  const stored = await db().pageDataEntry.findUnique({ where: { id: created.cuid } });
  expect(stored?.datatype).toBe("announcement");
  expect(stored?.isPublic).toBe(true);
  expect(stored?.createPerm).toBe(MEMBER_PERM);
  expect(stored?.modifyPerm).toBe(MEMBER_PERM);
  expect(stored?.deletePerm).toBe(MEMBER_PERM);
  expect(stored?.templateId).toBe(publicTemplateId);
});
// @relation(GSSC-BLLR-446, scope=range_end, role=Test)

// @relation(GSSC-BLLR-447, scope=range_start, role=Test)
test("GSSC-BLLR-447 Announcement Creation Forbidden", async () => {
  const before = await db().pageDataEntry.count({ where: { datatype: "announcement" } });
  const { status } = await sendJson(
    "POST",
    "/announcements",
    { body: "nope", templateId: lockedTemplateId },
    memberTok,
  );
  expect(status).toBe(403);
  const after = await db().pageDataEntry.count({ where: { datatype: "announcement" } });
  expect(after).toBe(before);
});
// @relation(GSSC-BLLR-447, scope=range_end, role=Test)

// @relation(GSSC-BLLR-448, scope=range_start, role=Test)
test("GSSC-BLLR-448 Public Announcement Events", async () => {
  const stamp = `ann-ev-pub-${Date.now()}`;
  const future = farFuture();
  const past = farPast();
  const today = new Date();
  const windowOpen = {
    month: today.getMonth() + 1,
    day: today.getDate(),
    year: today.getFullYear() - 1,
  };
  const upcoming = await seedEvent({
    name: `${stamp}-upcoming`,
    isPublic: true,
    month: future.month,
    day: future.day,
    year: future.year,
    announcementStartMonth: windowOpen.month,
    announcementStartDay: windowOpen.day,
    announcementStartYear: windowOpen.year,
  });
  await seedEvent({
    name: `${stamp}-past`,
    isPublic: true,
    month: past.month,
    day: past.day,
    year: past.year,
    announcementStartMonth: past.month,
    announcementStartDay: past.day,
    announcementStartYear: past.year - 1,
  });
  await seedEvent({
    name: `${stamp}-private`,
    isPublic: false,
    month: future.month,
    day: future.day,
    year: future.year,
    announcementStartMonth: windowOpen.month,
    announcementStartDay: windowOpen.day,
    announcementStartYear: windowOpen.year,
  });
  await seedEvent({
    name: `${stamp}-not-yet`,
    isPublic: true,
    month: future.month,
    day: future.day,
    year: future.year,
    announcementStartMonth: future.month,
    announcementStartDay: future.day,
    announcementStartYear: future.year,
  });

  const { status, body } = await getJson("/announcements");
  expect(status).toBe(200);
  const events = listEvents(body);
  expect(events.some((e) => e.cuid === upcoming.id && e.name === `${stamp}-upcoming`)).toBe(true);
  expect(events.some((e) => e.name === `${stamp}-past`)).toBe(false);
  expect(events.some((e) => e.name === `${stamp}-private`)).toBe(false);
  expect(events.some((e) => e.name === `${stamp}-not-yet`)).toBe(false);
});
// @relation(GSSC-BLLR-448, scope=range_end, role=Test)

// @relation(GSSC-BLLR-449, scope=range_start, role=Test)
test("GSSC-BLLR-449 Authenticated Announcement Events", async () => {
  const stamp = `ann-ev-auth-${Date.now()}`;
  const future = farFuture();
  const today = new Date();
  const windowOpen = {
    month: today.getMonth() + 1,
    day: today.getDate(),
    year: today.getFullYear() - 1,
  };
  const privateUpcoming = await seedEvent({
    name: `${stamp}-private-up`,
    isPublic: false,
    month: future.month,
    day: future.day,
    year: future.year,
    announcementStartMonth: windowOpen.month,
    announcementStartDay: windowOpen.day,
    announcementStartYear: windowOpen.year,
  });

  const publicList = await getJson("/announcements");
  expect(listEvents(publicList.body).some((e) => e.cuid === privateUpcoming.id)).toBe(false);

  const authList = await getJson("/announcements", memberTok);
  expect(authList.status).toBe(200);
  expect(listEvents(authList.body).some((e) => e.cuid === privateUpcoming.id)).toBe(true);
});
// @relation(GSSC-BLLR-449, scope=range_end, role=Test)

// @relation(GSSC-BLLR-450, scope=range_start, role=Test)
test("GSSC-BLLR-450 Announcement Modification", async () => {
  const row = await seedAnnouncement({
    body: "before",
    isPublic: true,
    modifyPerm: MEMBER_PERM,
    index: 1,
  });

  const { status, body } = await sendJson(
    "PATCH",
    `/announcements/${row.id}`,
    {
      header: "After",
      body: "after body",
      resources: ["r2"],
      tags: ["new"],
      index: 8,
    },
    memberTok,
  );
  expect(status).toBe(200);
  expect(body).toEqual({
    cuid: row.id,
    header: "After",
    body: "after body",
    resources: ["r2"],
    tags: ["new"],
    index: 8,
    startMonth: null,
    startDay: null,
    startYear: null,
    endMonth: null,
    endDay: null,
    endYear: null,
    imageFile: null,
    imagePosition: null,
  });
});
// @relation(GSSC-BLLR-450, scope=range_end, role=Test)

// @relation(GSSC-BLLR-451, scope=range_start, role=Test)
test("GSSC-BLLR-451 Announcement IsPublic Modification", async () => {
  const allowed = await seedAnnouncement({
    body: "flip",
    isPublic: true,
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: MEMBER_PERM,
  });
  const denied = await seedAnnouncement({
    body: "noflip",
    isPublic: true,
    createPerm: MEMBER_PERM,
    modifyPerm: MEMBER_PERM,
    deletePerm: 0,
  });

  const ok = await sendJson(
    "PATCH",
    `/announcements/${allowed.id}`,
    { isPublic: false },
    memberTok,
  );
  expect(ok.status).toBe(200);
  expect((await db().pageDataEntry.findUnique({ where: { id: allowed.id } }))?.isPublic).toBe(
    false,
  );

  const bad = await sendJson(
    "PATCH",
    `/announcements/${denied.id}`,
    { isPublic: false },
    memberTok,
  );
  expect(bad.status).toBe(403);
});
// @relation(GSSC-BLLR-451, scope=range_end, role=Test)

// @relation(GSSC-BLLR-452, scope=range_start, role=Test)
test("GSSC-BLLR-452 Announcement Deletion", async () => {
  const allowed = await seedAnnouncement({
    body: "delete-me-ann",
    isPublic: true,
    deletePerm: MEMBER_PERM,
  });
  const denied = await seedAnnouncement({
    body: "keep-me-ann",
    isPublic: true,
    deletePerm: 0,
  });

  const ok = await backend(
    new Request(`http://127.0.0.1/announcements/${allowed.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(ok.status).toBe(204);
  expect(await db().pageDataEntry.findUnique({ where: { id: allowed.id } })).toBeNull();

  const bad = await backend(
    new Request(`http://127.0.0.1/announcements/${denied.id}`, {
      method: "DELETE",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(bad.status).toBe(403);
  expect(await db().pageDataEntry.findUnique({ where: { id: denied.id } })).not.toBeNull();
});
// @relation(GSSC-BLLR-452, scope=range_end, role=Test)

// Sanity: section routes do not surface announcement datatype rows.
test("announcement datatype isolated from /sections", async () => {
  const stamp = `iso-${Date.now()}`;
  await seedAnnouncement({ body: stamp, isPublic: true, tags: [stamp] });
  const { body } = await getJson(`/sections?tag=${encodeURIComponent(stamp)}`);
  expect((body as Array<{ body: string }>).some((e) => e.body === stamp)).toBe(false);
});
