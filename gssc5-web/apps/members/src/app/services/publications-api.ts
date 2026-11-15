import { backend } from './backend';

export type PublicationEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
  description: string | null;
};

export type PublicationCreateBody = {
  title: string;
  referenceLink: string;
  description?: string | null;
};

export type PublicationUpdateBody = {
  title?: string;
  referenceLink?: string;
  description?: string | null;
};

/**
 * Treaty calls for publications catalog CRUD.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const publicationsApi = {
  list: () => backend.publications.get(),
  get: (cuid: string) => backend.publications({ cuid }).get(),
  create: (body: PublicationCreateBody) => backend.publications.post(body as never),
  update: (cuid: string, body: PublicationUpdateBody) =>
    backend.publications({ cuid }).patch(body as never),
  remove: (cuid: string) => backend.publications({ cuid }).delete(),
};
