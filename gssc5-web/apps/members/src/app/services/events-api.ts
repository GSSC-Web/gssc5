import { backend } from './backend';

/** Wire shape returned by GET/POST/PATCH /events (GSSC5-69). */
export type EventRecord = {
  cuid: string;
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
  pageDataCuid: string;
  header: string | null;
  body: string;
  resources: string[];
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
  imageFile: string | null;
  imagePosition: string | null;
};

export type EventCreateBody = {
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
  header?: string | null;
  body?: string;
  resources?: string[];
};

export type EventUpdateBody = Partial<EventCreateBody>;

/**
 * Treaty calls for events catalog create / modify.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const eventsApi = {
  list: () => backend.events.get(),
  get: (cuid: string) => backend.events({ cuid }).get(),
  create: (body: EventCreateBody) => backend.events.post(body as never),
  update: (cuid: string, body: EventUpdateBody) =>
    backend.events({ cuid }).patch(body as never),
};
