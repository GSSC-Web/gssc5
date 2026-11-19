import { backend } from './backend';

/** Society newsletter catalog entry from Unified Backend. */
export type NewsletterEntry = {
  cuid: string;
  volume: number;
  number: number;
  month: number;
  year: number;
  filePath: string;
  keywords: string[];
};

/** Field values accepted by newsletter create/modify. */
export type NewsletterFields = {
  volume: number;
  number: number;
  month: number;
  year: number;
  filePath: string;
  keywords: string[];
};

/** Metadata fields without requiring a file path string from the editor. */
export type NewsletterMetaFields = {
  volume: number;
  number: number;
  month: number;
  year: number;
  keywords: string[];
};

export type NewsletterFileUploadResult = {
  cuid: string;
  path: string;
};

type NewsletterFilePostResult = {
  data: NewsletterFileUploadResult | null;
  error: { status: number; value: unknown } | null;
  status?: number;
};

/**
 * Treaty POST /newsletter-files. Mutable so unit tests can stub without fighting Eden proxies.
 */
export const newsletterFilesTreaty = {
  post: (body: {
    file: File;
    newsletterCuid: string;
  }): Promise<NewsletterFilePostResult> =>
    backend['newsletter-files'].post(body) as Promise<NewsletterFilePostResult>,
};

/**
 * Treaty calls for newsletters catalog mutations (GSSC5-96).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const newslettersApi = {
  list: () => backend.newsletters.get(),
  get: (cuid: string) => backend.newsletters({ cuid }).get(),
  create: (body: NewsletterFields) => backend.newsletters.post(body),
  update: (cuid: string, body: Partial<NewsletterFields>) =>
    backend.newsletters({ cuid }).patch(body),
  uploadFile: async (
    file: File,
    newsletterCuid: string,
  ): Promise<{
    data: NewsletterFileUploadResult | null;
    error: { status: number; value: unknown } | null;
  }> => {
    // Eden Treaty multipart: File fields become FormData automatically.
    const result = await newsletterFilesTreaty.post({ file, newsletterCuid });
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

/** Display label for a catalog row. */
export function newsletterLabel(entry: Pick<NewsletterEntry, 'volume' | 'number' | 'month' | 'year'>): string {
  return `Vol. ${entry.volume} No. ${entry.number} · ${entry.month}/${entry.year}`;
}

/** Parse comma-separated keywords for the editor field. */
export function parseKeywordsInput(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Format keywords for the editor text field. */
export function formatKeywordsInput(keywords: string[]): string {
  return keywords.join(', ');
}

/** Parse a required integer from an editor text field. */
export function parseRequiredInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
