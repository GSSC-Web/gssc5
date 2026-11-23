import { BACKEND_ORIGIN, backend } from './backend';


export type PublicationEntry = {
  cuid: string;
  title: string;
  /** Stored path `publications/{cuid}` for the uploaded file. */
  referenceLink: string;
  description: string | null;
};

export type PublicationCreateBody = {
  title: string;
  description?: string | null;
};

export type PublicationUpdateBody = {
  title?: string;
  description?: string | null;
};

export type PublicationFileUploadResult = { cuid: string; path: string };

type PublicationFilePostResult = {
  data: PublicationFileUploadResult | null;
  error: { status: number; value: unknown } | null;
  status?: number;
};

/**
 * Treaty POST /publications/{cuid}/file. Mutable so unit tests can stub.
 */
export const publicationFilesTreaty = {
  post: (
    cuid: string,
    body: { file: File },
  ): Promise<PublicationFilePostResult> =>
    (
      backend.publications({ cuid }) as unknown as {
        file: { post: (b: { file: File }) => Promise<PublicationFilePostResult> };
      }
    ).file.post(body),
};

/**
 * Treaty calls for publications catalog CRUD + file upload.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const publicationsApi = {
  list: () => backend.publications.get(),
  get: (cuid: string) => backend.publications({ cuid }).get(),
  create: (body: PublicationCreateBody) => backend.publications.post(body as never),
  update: (cuid: string, body: PublicationUpdateBody) =>
    backend.publications({ cuid }).patch(body as never),
  remove: (cuid: string) => backend.publications({ cuid }).delete(),
  uploadFile: async (
    cuid: string,
    file: File,
  ): Promise<{
    data: PublicationFileUploadResult | null;
    error: { status: number; value: unknown } | null;
  }> => {
    // Eden Treaty multipart: File fields become FormData automatically.
    const result = await publicationFilesTreaty.post(cuid, { file });
    if (result.error) {
      return {
        data: null,
        error: { status: result.error.status, value: result.error.value },
      };
    }
    return {
      data: result.data ?? null,
      error: null,
    };
  },
};

/** Resolve a publication cuid to the dedicated GET file URL. */
export function publicationFileUrl(
  cuid: string | null | undefined,
  origin: string = BACKEND_ORIGIN,
): string | null {
  if (cuid === null || cuid === undefined) return null;
  const trimmed = cuid.trim();
  if (trimmed.length === 0) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/publications/') && trimmed.endsWith('/file')) {
    return `${origin}${trimmed}`;
  }
  const id = trimmed.startsWith('publications/')
    ? trimmed.slice('publications/'.length)
    : trimmed.replace(/^\/+/, '');
  return `${origin}/publications/${id}/file`;
}
