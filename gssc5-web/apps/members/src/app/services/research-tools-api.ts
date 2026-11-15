import { backend } from './backend';

export type ResearchToolEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
};

export type ResearchToolCreateBody = {
  title: string;
  referenceLink: string;
};

export type ResearchToolUpdateBody = {
  title?: string;
  referenceLink?: string;
};

/**
 * Treaty calls for research tools catalog CRUD.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const researchToolsApi = {
  list: () => backend['research-tools'].get(),
  get: (cuid: string) => backend['research-tools']({ cuid }).get(),
  create: (body: ResearchToolCreateBody) =>
    backend['research-tools'].post(body as never),
  update: (cuid: string, body: ResearchToolUpdateBody) =>
    backend['research-tools']({ cuid }).patch(body as never),
  remove: (cuid: string) => backend['research-tools']({ cuid }).delete(),
};
