import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { EventPlain } from "../generated/prismabox/Event";
import { PageDataEntryPlain } from "../generated/prismabox/PageDataEntry";
import { loginTokenCookie } from "../user/login-session";
import {
  hasPerm,
  isImagePosition,
  openSession,
  parseStringArray,
  trimStrings,
  uniqueTags,
  type EntryRow,
  type ImagePosition,
} from "./helpers";

const AnnouncementListEntry = t.Object({
  cuid: PageDataEntryPlain.properties.id,
  header: PageDataEntryPlain.properties.header,
  body: PageDataEntryPlain.properties.body,
  resources: t.Array(t.String()),
  tags: t.Array(t.String()),
  index: PageDataEntryPlain.properties.index,
  startMonth: PageDataEntryPlain.properties.startMonth,
  startDay: PageDataEntryPlain.properties.startDay,
  startYear: PageDataEntryPlain.properties.startYear,
  endMonth: PageDataEntryPlain.properties.endMonth,
  endDay: PageDataEntryPlain.properties.endDay,
  endYear: PageDataEntryPlain.properties.endYear,
  imageFile: PageDataEntryPlain.properties.imageFile,
  imagePosition: t.Union([
    t.Literal("none"),
    t.Literal("left"),
    t.Literal("right"),
    t.Null(),
  ]),
});

/** Event catalog fields included beside announcements (GSSC5-69 Event table). */
const IncludedEventEntry = t.Object({
  cuid: EventPlain.properties.id,
  name: EventPlain.properties.name,
  month: EventPlain.properties.month,
  day: EventPlain.properties.day,
  year: EventPlain.properties.year,
  announcementStartMonth: EventPlain.properties.announcementStartMonth,
  announcementStartDay: EventPlain.properties.announcementStartDay,
  announcementStartYear: EventPlain.properties.announcementStartYear,
  time: EventPlain.properties.time,
  duration: EventPlain.properties.duration,
  location: EventPlain.properties.location,
  isPublic: EventPlain.properties.isPublic,
  pageDataCuid: EventPlain.properties.pageDataId,
});

const AnnouncementListResponse = t.Object({
  announcements: t.Array(AnnouncementListEntry),
  events: t.Array(IncludedEventEntry),
});

/**
 * Wire detail: Prismabox scalars with `cuid` and tags/resources as string[]
 * (DB columns stay JSON strings). Do not expose raw PageDataEntryPlain.
 */
const AnnouncementDetail = t.Object({
  cuid: PageDataEntryPlain.properties.id,
  header: PageDataEntryPlain.properties.header,
  body: PageDataEntryPlain.properties.body,
  resources: t.Array(t.String()),
  tags: t.Array(t.String()),
  index: PageDataEntryPlain.properties.index,
  startMonth: PageDataEntryPlain.properties.startMonth,
  startDay: PageDataEntryPlain.properties.startDay,
  startYear: PageDataEntryPlain.properties.startYear,
  endMonth: PageDataEntryPlain.properties.endMonth,
  endDay: PageDataEntryPlain.properties.endDay,
  endYear: PageDataEntryPlain.properties.endYear,
  imageFile: PageDataEntryPlain.properties.imageFile,
  imagePosition: t.Union([
    t.Literal("none"),
    t.Literal("left"),
    t.Literal("right"),
    t.Null(),
  ]),
});

/**
 * Create body: wire contract keeps templateId/template, string[] tags/resources.
 * datatype and perms are forced server-side from the template.
 */
const AnnouncementCreateBody = t.Object(
  {
    body: t.String({ minLength: 1 }),
    templateId: t.Optional(t.String({ minLength: 1 })),
    template: t.Optional(t.String({ minLength: 1 })),
    header: t.Optional(PageDataEntryPlain.properties.header),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(PageDataEntryPlain.properties.index),
  },
  { additionalProperties: true },
);

const AnnouncementUpdateBody = t.Object(
  {
    header: t.Optional(PageDataEntryPlain.properties.header),
    body: t.Optional(t.String({ minLength: 1 })),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(PageDataEntryPlain.properties.index),
    isPublic: t.Optional(PageDataEntryPlain.properties.isPublic),
  },
  { additionalProperties: true },
);

export const announcement = new Elysia({
  name: "content-announcement",
  prefix: "/announcements",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({ pageDataEntry: PageDataEntryPlain })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ query, cookie, status }) => {
      const session = await openSession(cookie);
      const loggedIn = !("failure" in session);
      const prisma = getPrisma(loadConfig().DATABASE_URL);

      // @relation(GSSC-BLLR-438, GSSC-BLLR-439, scope=range_start, role=Implementation)
      const announcementRows = await prisma.pageDataEntry.findMany({
        where: {
          datatype: "announcement",
          ...(loggedIn ? {} : { isPublic: true }),
        },
        orderBy: { index: "asc" },
      });
      // @relation(GSSC-BLLR-438, GSSC-BLLR-439, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-448, GSSC-BLLR-449, scope=range_start, role=Implementation)
      const eventRows = await prisma.event.findMany({
        where: loggedIn ? {} : { isPublic: true },
        orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
      });
      const today = todayCalendarParts();
      const inWindowEvents = eventRows.filter((row) =>
        isUpcomingInAnnouncementWindow(row, today),
      );
      // @relation(GSSC-BLLR-448, GSSC-BLLR-449, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-442, scope=range_start, role=Implementation)
      const filtered = applyAnnouncementFilters(announcementRows, query);
      // @relation(GSSC-BLLR-442, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-440, GSSC-BLLR-441, scope=range_start, role=Implementation)
      return status(200, {
        announcements: filtered.map((row) => toAnnouncementListEntry(row)),
        events: inWindowEvents.map((row) => toIncludedEventEntry(row)),
      });
      // @relation(GSSC-BLLR-440, GSSC-BLLR-441, scope=range_end, role=Implementation)
    },
    {
      query: t.Object({
        header: t.Optional(t.String()),
        body: t.Optional(t.String()),
        tag: t.Optional(t.String()),
        cuid: t.Optional(t.String()),
        content: t.Optional(t.String()),
      }),
      cookie: loginTokenCookie,
      response: {
        200: AnnouncementListResponse,
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status }) => {
      const session = await openSession(cookie);
      const loggedIn = !("failure" in session);
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.pageDataEntry.findFirst({
        where: { id: params.cuid, datatype: "announcement" },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-444, scope=range_start, role=Implementation)
      if (!row.isPublic && !loggedIn) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-444, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-443, GSSC-BLLR-445, scope=range_start, role=Implementation)
      return status(200, toAnnouncementDetail(row));
      // @relation(GSSC-BLLR-443, GSSC-BLLR-445, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      cookie: loginTokenCookie,
      response: {
        200: AnnouncementDetail,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
      },
    },
  )
  .post(
    "/",
    async ({ body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      const templateId = body.templateId ?? body.template;
      if (typeof templateId !== "string" || templateId.length === 0) {
        return status(422, "Invalid" as const);
      }

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const template = await prisma.contentTemplate.findUnique({ where: { id: templateId } });
      if (!template) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-447, scope=range_start, role=Implementation)
      if (!hasPerm(session.user, template.createPerm)) {
        return status(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-447, scope=range_end, role=Implementation)

      const header = body.header === undefined ? null : body.header;
      const resources = body.resources ?? [];
      const requestTags = body.tags ?? [];
      const index = body.index ?? 0;
      const tags = uniqueTags([...parseStringArray(template.tags), ...requestTags]);

      // @relation(GSSC-BLLR-446, scope=range_start, role=Implementation)
      const created = await prisma.pageDataEntry.create({
        data: {
          datatype: "announcement",
          header,
          body: body.body,
          resources: JSON.stringify(resources),
          tags: JSON.stringify(tags),
          index,
          isPublic: template.isPublic,
          createPerm: template.createPerm,
          modifyPerm: template.modifyPerm,
          deletePerm: template.deletePerm,
          templateId: template.id,
        },
      });
      return status(201, toAnnouncementDetail(created));
      // @relation(GSSC-BLLR-446, scope=range_end, role=Implementation)
    },
    {
      body: AnnouncementCreateBody,
      cookie: loginTokenCookie,
      response: {
        201: AnnouncementDetail,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .patch(
    "/:cuid",
    async ({ params, body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.pageDataEntry.findFirst({
        where: { id: params.cuid, datatype: "announcement" },
      });
      if (!row) return status(404, "Not Found" as const);

      const wantsIsPublic = body.isPublic !== undefined;
      if (wantsIsPublic) {
        // @relation(GSSC-BLLR-451, scope=range_start, role=Implementation)
        if (
          !hasPerm(session.user, row.createPerm) ||
          !hasPerm(session.user, row.modifyPerm) ||
          !hasPerm(session.user, row.deletePerm)
        ) {
          return status(403, "Forbidden" as const);
        }
        // @relation(GSSC-BLLR-451, scope=range_end, role=Implementation)
      } else {
        if (!hasPerm(session.user, row.modifyPerm)) {
          return status(403, "Forbidden" as const);
        }
      }

      const data: {
        header?: string | null;
        body?: string;
        resources?: string;
        tags?: string;
        index?: number;
        isPublic?: boolean;
      } = {};

      if (body.header !== undefined) data.header = body.header;
      if (body.body !== undefined) data.body = body.body;
      if (body.resources !== undefined) data.resources = JSON.stringify(body.resources);
      if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
      if (body.index !== undefined) data.index = body.index;
      if (wantsIsPublic) data.isPublic = body.isPublic;

      // @relation(GSSC-BLLR-450, scope=range_start, role=Implementation)
      const updated = await prisma.pageDataEntry.update({
        where: { id: row.id },
        data,
      });
      return status(200, toAnnouncementDetail(updated));
      // @relation(GSSC-BLLR-450, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: AnnouncementUpdateBody,
      cookie: loginTokenCookie,
      response: {
        200: AnnouncementDetail,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .delete(
    "/:cuid",
    async ({ params, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) return status(403, "Forbidden" as const);

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.pageDataEntry.findFirst({
        where: { id: params.cuid, datatype: "announcement" },
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-452, scope=range_start, role=Implementation)
      if (!hasPerm(session.user, row.deletePerm)) {
        return status(403, "Forbidden" as const);
      }
      await prisma.pageDataEntry.delete({ where: { id: row.id } });
      return status(204, undefined);
      // @relation(GSSC-BLLR-452, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
      },
    },
  );

function applyAnnouncementFilters(
  rows: EntryRow[],
  query: {
    header?: string;
    body?: string;
    tag?: string;
    cuid?: string;
    content?: string;
  },
): EntryRow[] {
  return rows.filter((row) => {
    if (query.cuid !== undefined && row.id !== query.cuid) return false;
    if (query.header !== undefined && !includesInsensitive(row.header ?? "", query.header)) {
      return false;
    }
    if (query.body !== undefined && !includesInsensitive(row.body, query.body)) return false;
    if (query.tag !== undefined) {
      const tags = parseStringArray(row.tags);
      if (!tags.some((tag) => includesInsensitive(tag, query.tag!))) return false;
    }
    if (query.content !== undefined) {
      const inHeader = includesInsensitive(row.header ?? "", query.content);
      const inBody = includesInsensitive(row.body, query.content);
      if (!inHeader && !inBody) return false;
    }
    return true;
  });
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function wireImagePosition(value: string | null): ImagePosition | null {
  if (value === null) return null;
  return isImagePosition(value) ? value : null;
}

function toAnnouncementListEntry(row: EntryRow) {
  return {
    cuid: row.id,
    header: row.header,
    body: row.body,
    resources: parseStringArray(row.resources),
    tags: parseStringArray(row.tags),
    index: row.index,
    startMonth: row.startMonth,
    startDay: row.startDay,
    startYear: row.startYear,
    endMonth: row.endMonth,
    endDay: row.endDay,
    endYear: row.endYear,
    imageFile: row.imageFile,
    imagePosition: wireImagePosition(row.imagePosition),
  };
}

function toIncludedEventEntry(row: {
  id: string;
  name: string;
  month: number;
  day: number;
  year: number;
  announcementStartMonth: number;
  announcementStartDay: number;
  announcementStartYear: number;
  time: string;
  duration: string;
  location: string;
  isPublic: boolean;
  pageDataId: string;
}) {
  return {
    cuid: row.id,
    name: row.name,
    month: row.month,
    day: row.day,
    year: row.year,
    announcementStartMonth: row.announcementStartMonth,
    announcementStartDay: row.announcementStartDay,
    announcementStartYear: row.announcementStartYear,
    time: row.time,
    duration: row.duration,
    location: row.location,
    isPublic: row.isPublic,
    pageDataCuid: row.pageDataId,
  };
}

function toAnnouncementDetail(row: EntryRow) {
  return {
    cuid: row.id,
    header: row.header,
    body: row.body,
    resources: parseStringArray(row.resources),
    tags: parseStringArray(row.tags),
    index: row.index,
    startMonth: row.startMonth,
    startDay: row.startDay,
    startYear: row.startYear,
    endMonth: row.endMonth,
    endDay: row.endDay,
    endYear: row.endYear,
    imageFile: row.imageFile,
    imagePosition: wireImagePosition(row.imagePosition),
  };
}

type CalendarParts = { year: number; month: number; day: number };

/** Local calendar Y/M/D for announcement-window comparisons. */
export function todayCalendarParts(now = new Date()): CalendarParts {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function calendarKey(parts: CalendarParts): number {
  return parts.year * 10_000 + parts.month * 100 + parts.day;
}

/**
 * Upcoming event inside its announcement window (Event table).
 * Window: announcementStart ≤ today ≤ event date (Y/M/D).
 */
export function isUpcomingInAnnouncementWindow(
  row: {
    month: number;
    day: number;
    year: number;
    announcementStartMonth: number;
    announcementStartDay: number;
    announcementStartYear: number;
  },
  today: CalendarParts,
): boolean {
  const start: CalendarParts = {
    year: row.announcementStartYear,
    month: row.announcementStartMonth,
    day: row.announcementStartDay,
  };
  const end: CalendarParts = { year: row.year, month: row.month, day: row.day };
  const key = calendarKey(today);
  return key >= calendarKey(start) && key <= calendarKey(end);
}
