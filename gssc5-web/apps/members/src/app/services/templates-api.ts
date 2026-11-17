import { backend } from './backend';

/** List wire shape from GSSC5-37 GET /templates. */
export type ContentTemplateListEntry = {
  cuid: string;
  name: string;
};

/** Detail wire shape from GSSC5-37 GET/POST/PATCH /templates. */
export type ContentTemplateDetail = {
  cuid: string;
  name: string;
  isPublic: boolean;
  tags: string[];
  createPerm: number;
  modifyPerm: number;
  deletePerm: number;
};

export type ContentTemplateCreateBody = {
  name: string;
  isPublic: boolean;
  tags?: string[];
  createPerm?: number;
  modifyPerm?: number;
  deletePerm?: number;
};

export type ContentTemplateUpdateBody = {
  isPublic?: boolean;
  createPerm?: number;
  modifyPerm?: number;
  deletePerm?: number;
};

/**
 * Treaty calls for content template CRUD (GSSC5-37 /templates).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const templatesApi = {
  list: () => backend.templates.get(),
  get: (cuid: string) => backend.templates({ cuid }).get(),
  create: (body: ContentTemplateCreateBody) =>
    backend.templates.post(body as never),
  update: (cuid: string, body: ContentTemplateUpdateBody) =>
    backend.templates({ cuid }).patch(body as never),
  remove: (cuid: string) => backend.templates({ cuid }).delete(),
};
