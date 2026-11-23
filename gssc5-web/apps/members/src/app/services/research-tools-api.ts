import { BACKEND_ORIGIN, backend } from './backend';


export type ResearchToolEntry = {
  cuid: string;
  title: string;
  referenceLink: string;
  hasFile: boolean;
};

export type ResearchToolCreateBody = {
  title: string;
  referenceLink?: string;
};

export type ResearchToolUpdateBody = {
  title?: string;
  referenceLink?: string;
};

export type ResearchToolFileUploadResult = {
  cuid: string;
  path: string;
};

type ResearchToolFileRoutes = {
  file: {
    post: (body: { file: File }) => Promise<{
      data: ResearchToolFileUploadResult | null;
      error: { status: number; value: unknown } | null;
      status: number;
    }>;
  };
};

/**
 * Treaty calls for research tools catalog CRUD and reference-file upload.
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
  uploadFile: async (
    cuid: string,
    file: File,
  ): Promise<{
    data: ResearchToolFileUploadResult | null;
    error: { status: number; value: unknown } | null;
  }> => {
    const routes = backend['research-tools']({ cuid }) as unknown as ResearchToolFileRoutes;
    const result = await routes.file.post({ file });
    if (result.error) {
      return {
        data: null,
        error: { status: result.error.status, value: result.error.value },
      };
    }
    return { data: result.data ?? null, error: null };
  },
};

/** Resolve a research-tool file cuid to the dedicated GET URL. */
export function researchToolFileUrl(
  cuid: string,
  origin: string = BACKEND_ORIGIN,
): string {
  return `${origin}/research-tools/${cuid.replace(/^\/+/, '')}/file`;
}
