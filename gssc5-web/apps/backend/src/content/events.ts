import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import { EventPlain } from "../generated/prismabox/Event";
import { PageDataEntryPlain } from "../generated/prismabox/PageDataEntry";
import { loginTokenCookie } from "../user/login-session";
import {
  hasPerm,
  includesInsensitive,
  isImagePosition,
  openSession,
  parseKnownQuery,
  parseStringArray,
  PERM_USER_MOD,
  trimStrings,
  uniqueTags,
  type ImagePosition,
} from "./helpers";

const EVENT_LIST_FILTERS = new Set([
  "name",
  "location",
  "cuid",
  "year",
  "month",
  "day",
  "isPublic",
  "content",
]);

const ImagePositionWire = t.Union([
  t.Literal("none"),
  t.Literal("left"),
  t.Literal("right"),
]);

/** Catalog + linked page_data details for calendar assembly (GSSC5-30). */
const EventEntry = t.Object({
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
  header: PageDataEntryPlain.properties.header,
  body: PageDataEntryPlain.properties.body,
  resources: t.Array(t.String()),
  startMonth: PageDataEntryPlain.properties.startMonth,
  startDay: PageDataEntryPlain.properties.startDay,
  startYear: PageDataEntryPlain.properties.startYear,
  endMonth: PageDataEntryPlain.properties.endMonth,
  endDay: PageDataEntryPlain.properties.endDay,
  endYear: PageDataEntryPlain.properties.endYear,
  imageFile: PageDataEntryPlain.properties.imageFile,
  imagePosition: t.Union([ImagePositionWire, t.Null()]),
});

const EventCreateBody = t.Object(
  {
    name: t.String({ minLength: 1 }),
    month: EventPlain.properties.month,
    day: EventPlain.properties.day,
    year: EventPlain.properties.year,
    announcementStartMonth: EventPlain.properties.announcementStartMonth,
    announcementStartDay: EventPlain.properties.announcementStartDay,
    announcementStartYear: EventPlain.properties.announcementStartYear,
    time: t.String({ minLength: 1 }),
    duration: t.String({ minLength: 1 }),
    location: t.String({ minLength: 1 }),
    isPublic: EventPlain.properties.isPublic,
    templateId: t.Optional(t.String({ minLength: 1 })),
    template: t.Optional(t.String({ minLength: 1 })),
    header: t.Optional(t.Union([t.String(), t.Null()])),
    body: t.Optional(t.String()),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(t.Integer()),
  },
  { additionalProperties: true },
);

const EventUpdateBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1 })),
    month: t.Optional(EventPlain.properties.month),
    day: t.Optional(EventPlain.properties.day),
    year: t.Optional(EventPlain.properties.year),
    announcementStartMonth: t.Optional(EventPlain.properties.announcementStartMonth),
    announcementStartDay: t.Optional(EventPlain.properties.announcementStartDay),
    announcementStartYear: t.Optional(EventPlain.properties.announcementStartYear),
    time: t.Optional(t.String({ minLength: 1 })),
    duration: t.Optional(t.String({ minLength: 1 })),
    location: t.Optional(t.String({ minLength: 1 })),
    isPublic: t.Optional(EventPlain.properties.isPublic),
    header: t.Optional(t.Union([t.String(), t.Null()])),
    body: t.Optional(t.String()),
    resources: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    index: t.Optional(t.Integer()),
  },
  { additionalProperties: true },
);

type EventDetailsRow = {
  header: string | null;
  body: string;
  resources: string;
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
  imageFile: string | null;
  imagePosition: string | null;
};

type EventRow = {
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
  pageData: EventDetailsRow;
};

function wireImagePosition(value: string | null): ImagePosition | null {
  if (value === null) return null;
  return isImagePosition(value) ? value : null;
}

function toEntry(row: EventRow) {
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
    header: row.pageData.header,
    body: row.pageData.body,
    resources: parseStringArray(row.pageData.resources),
    startMonth: row.pageData.startMonth,
    startDay: row.pageData.startDay,
    startYear: row.pageData.startYear,
    endMonth: row.pageData.endMonth,
    endDay: row.pageData.endDay,
    endYear: row.pageData.endYear,
    imageFile: row.pageData.imageFile,
    imagePosition: wireImagePosition(row.pageData.imagePosition),
  };
}

type EventWire = ReturnType<typeof toEntry>;

function matchesEventFilters(entry: EventWire, filters: Record<string, string>): boolean {
  if (filters.cuid !== undefined && entry.cuid !== filters.cuid) return false;
  if (filters.name !== undefined && !includesInsensitive(entry.name, filters.name)) return false;
  if (filters.location !== undefined && !includesInsensitive(entry.location, filters.location)) {
    return false;
  }
  if (filters.year !== undefined && String(entry.year) !== filters.year) return false;
  if (filters.month !== undefined && String(entry.month) !== filters.month) return false;
  if (filters.day !== undefined && String(entry.day) !== filters.day) return false;
  if (filters.isPublic !== undefined) {
    const want =
      filters.isPublic === "true" ? true : filters.isPublic === "false" ? false : null;
    if (want === null || entry.isPublic !== want) return false;
  }
  if (filters.content !== undefined) {
    const inHeader = includesInsensitive(entry.header ?? "", filters.content);
    const inBody = includesInsensitive(entry.body, filters.content);
    if (!inHeader && !inBody) return false;
  }
  return true;
}

const eventWithDetails = { pageData: true } as const;

/** Webpage events catalog + details page_data (GSSC5-69). */
export const events = new Elysia({
  name: "content-events",
  prefix: "/events",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({ event: EventPlain })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ query, cookie, status }) => {
      const filters = parseKnownQuery(query, EVENT_LIST_FILTERS);
      if (filters === "invalid") return status(422, "Invalid" as const);

      const session = await openSession(cookie);
      const loggedIn = !("failure" in session);

      // @relation(GSSC-BLLR-412, GSSC-BLLR-413, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const rows = await prisma.event.findMany({
        where: loggedIn ? {} : { isPublic: true },
        orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
        include: eventWithDetails,
      });
      // @relation(GSSC-BLLR-412, GSSC-BLLR-413, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-414, scope=range_start, role=Implementation)
      const entries = rows.map(toEntry).filter((entry) => matchesEventFilters(entry, filters));
      return status(200, entries);
      // @relation(GSSC-BLLR-414, scope=range_end, role=Implementation)
    },
    {
      query: t.Record(t.String(), t.String()),
      cookie: loginTokenCookie,
      response: {
        200: t.Array(EventEntry),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status }) => {
      const session = await openSession(cookie);
      const loggedIn = !("failure" in session);
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const row = await prisma.event.findUnique({
        where: { id: params.cuid },
        include: eventWithDetails,
      });
      if (!row) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-416, scope=range_start, role=Implementation)
      if (!row.isPublic && !loggedIn) return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-416, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-415, GSSC-BLLR-417, scope=range_start, role=Implementation)
      return status(200, toEntry(row));
      // @relation(GSSC-BLLR-415, GSSC-BLLR-417, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      cookie: loginTokenCookie,
      response: {
        200: EventEntry,
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

      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const templateId = body.templateId ?? body.template;
      let createPerm = PERM_USER_MOD;
      let modifyPerm = PERM_USER_MOD;
      let deletePerm = PERM_USER_MOD;
      let templateTags: string[] = [];

      if (typeof templateId === "string" && templateId.length > 0) {
        const template = await prisma.contentTemplate.findUnique({
          where: { id: templateId },
        });
        if (!template) return status(404, "Not Found" as const);
        createPerm = template.createPerm;
        modifyPerm = template.modifyPerm;
        deletePerm = template.deletePerm;
        templateTags = parseStringArray(template.tags);

        // @relation(GSSC-BLLR-419, scope=range_start, role=Implementation)
        if (!hasPerm(session.user, createPerm)) {
          return status(403, "Forbidden" as const);
        }
        // @relation(GSSC-BLLR-419, scope=range_end, role=Implementation)
      } else {
        // @relation(GSSC-BLLR-419, scope=range_start, role=Implementation)
        if (!hasPerm(session.user, createPerm)) {
          return status(403, "Forbidden" as const);
        }
        // @relation(GSSC-BLLR-419, scope=range_end, role=Implementation)
      }

      const resources = body.resources ?? [];
      const requestTags = body.tags ?? [];
      const tags = uniqueTags([...templateTags, ...requestTags]);
      const header = body.header === undefined ? body.name : body.header;
      const detailsBody = body.body ?? "";
      const index = body.index ?? 0;

      // @relation(GSSC-BLLR-418, GSSC-BLLR-404, scope=range_start, role=Implementation)
      const created = await prisma.$transaction(async (tx) => {
        const details = await tx.pageDataEntry.create({
          data: {
            datatype: "event",
            header,
            body: detailsBody,
            resources: JSON.stringify(resources),
            tags: JSON.stringify(tags),
            index,
            isPublic: body.isPublic,
            createPerm,
            modifyPerm,
            deletePerm,
            templateId: typeof templateId === "string" ? templateId : null,
            startMonth: body.month,
            startDay: body.day,
            startYear: body.year,
            endMonth: body.month,
            endDay: body.day,
            endYear: body.year,
          },
        });
        return tx.event.create({
          data: {
            name: body.name,
            month: body.month,
            day: body.day,
            year: body.year,
            announcementStartMonth: body.announcementStartMonth,
            announcementStartDay: body.announcementStartDay,
            announcementStartYear: body.announcementStartYear,
            time: body.time,
            duration: body.duration,
            location: body.location,
            isPublic: body.isPublic,
            createPerm,
            modifyPerm,
            deletePerm,
            pageDataId: details.id,
          },
          include: eventWithDetails,
        });
      });
      return status(201, toEntry(created));
      // @relation(GSSC-BLLR-418, GSSC-BLLR-404, scope=range_end, role=Implementation)
    },
    {
      body: EventCreateBody,
      cookie: loginTokenCookie,
      response: {
        201: EventEntry,
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
      const existing = await prisma.event.findUnique({ where: { id: params.cuid } });
      if (!existing) return status(404, "Not Found" as const);

      if (!hasPerm(session.user, existing.modifyPerm)) {
        return status(403, "Forbidden" as const);
      }

      const eventData: {
        name?: string;
        month?: number;
        day?: number;
        year?: number;
        announcementStartMonth?: number;
        announcementStartDay?: number;
        announcementStartYear?: number;
        time?: string;
        duration?: string;
        location?: string;
        isPublic?: boolean;
      } = {};
      if (body.name !== undefined) eventData.name = body.name;
      if (body.month !== undefined) eventData.month = body.month;
      if (body.day !== undefined) eventData.day = body.day;
      if (body.year !== undefined) eventData.year = body.year;
      if (body.announcementStartMonth !== undefined) {
        eventData.announcementStartMonth = body.announcementStartMonth;
      }
      if (body.announcementStartDay !== undefined) {
        eventData.announcementStartDay = body.announcementStartDay;
      }
      if (body.announcementStartYear !== undefined) {
        eventData.announcementStartYear = body.announcementStartYear;
      }
      if (body.time !== undefined) eventData.time = body.time;
      if (body.duration !== undefined) eventData.duration = body.duration;
      if (body.location !== undefined) eventData.location = body.location;
      if (body.isPublic !== undefined) eventData.isPublic = body.isPublic;

      const detailsData: {
        header?: string | null;
        body?: string;
        resources?: string;
        tags?: string;
        index?: number;
        isPublic?: boolean;
        startMonth?: number;
        startDay?: number;
        startYear?: number;
        endMonth?: number;
        endDay?: number;
        endYear?: number;
      } = {};
      if (body.header !== undefined) detailsData.header = body.header;
      if (body.body !== undefined) detailsData.body = body.body;
      if (body.resources !== undefined) {
        detailsData.resources = JSON.stringify(body.resources);
      }
      if (body.tags !== undefined) detailsData.tags = JSON.stringify(body.tags);
      if (body.index !== undefined) detailsData.index = body.index;
      if (body.isPublic !== undefined) detailsData.isPublic = body.isPublic;

      const nextMonth = body.month ?? existing.month;
      const nextDay = body.day ?? existing.day;
      const nextYear = body.year ?? existing.year;
      const dateChanged =
        body.month !== undefined || body.day !== undefined || body.year !== undefined;
      if (dateChanged) {
        detailsData.startMonth = nextMonth;
        detailsData.startDay = nextDay;
        detailsData.startYear = nextYear;
        detailsData.endMonth = nextMonth;
        detailsData.endDay = nextDay;
        detailsData.endYear = nextYear;
      }

      if (Object.keys(eventData).length === 0 && Object.keys(detailsData).length === 0) {
        return status(422, "Invalid" as const);
      }

      // @relation(GSSC-BLLR-420, GSSC-BLLR-404, scope=range_start, role=Implementation)
      const updated = await prisma.$transaction(async (tx) => {
        if (Object.keys(detailsData).length > 0) {
          await tx.pageDataEntry.update({
            where: { id: existing.pageDataId },
            data: detailsData,
          });
        }
        if (Object.keys(eventData).length > 0) {
          await tx.event.update({
            where: { id: existing.id },
            data: eventData,
          });
        }
        return tx.event.findUniqueOrThrow({
          where: { id: existing.id },
          include: eventWithDetails,
        });
      });
      return status(200, toEntry(updated));
      // @relation(GSSC-BLLR-420, GSSC-BLLR-404, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String({ minLength: 1 }) }),
      body: EventUpdateBody,
      cookie: loginTokenCookie,
      response: {
        200: EventEntry,
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
      const existing = await prisma.event.findUnique({ where: { id: params.cuid } });
      if (!existing) return status(404, "Not Found" as const);

      // @relation(GSSC-BLLR-422, scope=range_start, role=Implementation)
      if (!hasPerm(session.user, existing.deletePerm)) {
        return status(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-422, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-421, scope=range_start, role=Implementation)
      await prisma.$transaction(async (tx) => {
        await tx.event.delete({ where: { id: existing.id } });
        await tx.pageDataEntry.delete({ where: { id: existing.pageDataId } });
      });
      return status(204, undefined);
      // @relation(GSSC-BLLR-421, scope=range_end, role=Implementation)
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
