import { backend } from './backend';

/** Wire announcement fields from GSSC5-68 GET/POST/PATCH /announcements. */
export type AnnouncementRecord = {
  cuid: string;
  header: string | null;
  body: string;
  resources: string[];
  tags: string[];
  index: number;
  isPublic?: boolean;
  startMonth: number | null;
  startDay: number | null;
  startYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  endYear: number | null;
  imageFile: string | null;
  imagePosition: 'none' | 'left' | 'right' | null;
};

export type AnnouncementListEntry = Pick<
  AnnouncementRecord,
  | 'cuid'
  | 'header'
  | 'body'
  | 'resources'
  | 'tags'
  | 'index'
  | 'startMonth'
  | 'startDay'
  | 'startYear'
  | 'endMonth'
  | 'endDay'
  | 'endYear'
  | 'imageFile'
  | 'imagePosition'
>;

export type AnnouncementCreateBody = {
  body: string;
  templateId: string;
  header?: string | null;
  resources?: string[];
  tags?: string[];
  index?: number;
};

export type AnnouncementUpdateBody = {
  header?: string | null;
  body?: string;
  resources?: string[];
  tags?: string[];
  index?: number;
  isPublic?: boolean;
};

export type ContentTemplateListEntry = {
  cuid: string;
  name: string;
};

export type ContentTemplateDetail = {
  cuid: string;
  name: string;
  isPublic: boolean;
  tags: string[];
  createPerm: number;
  modifyPerm: number;
  deletePerm: number;
};

/** Publication Target values for MHLR-44 mapped onto GSSC5-68 isPublic. */
export type PublicationTarget = 'members' | 'public' | 'both';

export function publicationTargetToIsPublic(target: PublicationTarget): boolean {
  return target !== 'members';
}

export function isPublicToPublicationTarget(isPublic: boolean): PublicationTarget {
  return isPublic ? 'both' : 'members';
}

/**
 * Treaty calls for announcements + templates (GSSC5-68 / content templates).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const announcementsApi = {
  list: async (): Promise<AnnouncementListEntry[]> => {
    const result = await backend.announcements.get();
    if (result.error || result.data == null) return [];
    return (result.data.announcements ?? []) as AnnouncementListEntry[];
  },
  get: async (cuid: string): Promise<AnnouncementRecord | null> => {
    const result = await backend.announcements({ cuid }).get();
    if (result.error || result.data == null || typeof result.data === 'string') {
      return null;
    }
    return result.data as AnnouncementRecord;
  },
  create: async (
    body: AnnouncementCreateBody,
  ): Promise<{ ok: true; data: AnnouncementRecord } | { ok: false; status: number }> => {
    const result = await backend.announcements.post(body as never);
    if (result.error || result.data == null || typeof result.data === 'string') {
      return { ok: false, status: result.status ?? 403 };
    }
    return { ok: true, data: result.data as AnnouncementRecord };
  },
  update: async (
    cuid: string,
    body: AnnouncementUpdateBody,
  ): Promise<{ ok: true; data: AnnouncementRecord } | { ok: false; status: number }> => {
    const result = await backend.announcements({ cuid }).patch(body as never);
    if (result.error || result.data == null || typeof result.data === 'string') {
      return { ok: false, status: result.status ?? 403 };
    }
    return { ok: true, data: result.data as AnnouncementRecord };
  },
  remove: async (
    cuid: string,
  ): Promise<{ ok: true } | { ok: false; status: number }> => {
    const result = await backend.announcements({ cuid }).delete();
    if (result.error) {
      return { ok: false, status: result.status ?? 403 };
    }
    return { ok: true };
  },
  listTemplates: async (): Promise<ContentTemplateListEntry[]> => {
    const result = await backend.templates.get();
    if (result.error || result.data == null) return [];
    return result.data as ContentTemplateListEntry[];
  },
  getTemplate: async (cuid: string): Promise<ContentTemplateDetail | null> => {
    const result = await backend.templates({ cuid }).get();
    if (result.error || result.data == null || typeof result.data === 'string') {
      return null;
    }
    return result.data as ContentTemplateDetail;
  },
};
