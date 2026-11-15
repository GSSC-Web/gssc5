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

/**
 * Treaty calls for newsletters catalog mutations (GSSC5-96).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const newslettersApi = {
  list: () => backend.newsletters.get(),
  get: (cuid: string) => backend.newsletter({ cuid }).get(),
  create: (body: NewsletterFields) => backend.newsletters.post(body),
  update: (cuid: string, body: Partial<NewsletterFields>) =>
    backend.newsletter({ cuid }).patch(body),
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
