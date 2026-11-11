/** Public newsletter catalog helpers (section-tagged backend rows). */

export type NewsletterCatalogEntry = {
  cuid: string;
  header: string | null;
  body: string;
  resources: string[];
  tags: string[];
  index: number;
};

const YEAR_TAG = /^year-(\d{4})$/i;
const MONTH_TAG = /^month-(\d{2})$/i;

export function yearFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const match = YEAR_TAG.exec(tag);
    if (match) return Number(match[1]);
  }
  return null;
}

export function monthFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const match = MONTH_TAG.exec(tag);
    if (match) return Number(match[1]);
  }
  return null;
}

export function isNewsletterEntry(entry: NewsletterCatalogEntry): boolean {
  return entry.tags.some((tag) => tag.toLowerCase() === 'newsletter');
}

export function catalogYears(entries: NewsletterCatalogEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    const year = yearFromTags(entry.tags);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function entriesForYear(
  entries: NewsletterCatalogEntry[],
  year: number,
): NewsletterCatalogEntry[] {
  return entries
    .filter((entry) => yearFromTags(entry.tags) === year)
    .sort((a, b) => {
      const monthA = monthFromTags(a.tags) ?? 0;
      const monthB = monthFromTags(b.tags) ?? 0;
      if (monthA !== monthB) return monthA - monthB;
      return a.index - b.index;
    });
}

export function currentYearEntries(
  entries: NewsletterCatalogEntry[],
  currentYear: number,
): NewsletterCatalogEntry[] {
  return entriesForYear(entries, currentYear);
}

export function monthsForYear(entries: NewsletterCatalogEntry[], year: number): number[] {
  const months = new Set<number>();
  for (const entry of entriesForYear(entries, year)) {
    const month = monthFromTags(entry.tags);
    if (month !== null) months.add(month);
  }
  return [...months].sort((a, b) => a - b);
}

export function entryForYearMonth(
  entries: NewsletterCatalogEntry[],
  year: number,
  month: number,
): NewsletterCatalogEntry | null {
  return (
    entries.find(
      (entry) => yearFromTags(entry.tags) === year && monthFromTags(entry.tags) === month,
    ) ?? null
  );
}

/** Most recent = highest year, then highest month, then highest index. */
export function mostRecentEntry(
  entries: NewsletterCatalogEntry[],
): NewsletterCatalogEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => {
    const yearA = yearFromTags(a.tags) ?? 0;
    const yearB = yearFromTags(b.tags) ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    const monthA = monthFromTags(a.tags) ?? 0;
    const monthB = monthFromTags(b.tags) ?? 0;
    if (monthA !== monthB) return monthB - monthA;
    return b.index - a.index;
  })[0]!;
}

/** First catalog resource: stored-file cuid, `/files/{cuid}`, or absolute URL. */
export function issueFileRef(entry: NewsletterCatalogEntry | null): string | null {
  if (entry === null) return null;
  const resource = entry.resources[0];
  return resource && resource.length > 0 ? resource.trim() : null;
}

/** @deprecated Prefer issueFileRef + filesApiUrl; kept as alias for first resource. */
export function issueFileUrl(entry: NewsletterCatalogEntry | null): string | null {
  return issueFileRef(entry);
}

const FILES_API_ORIGIN = 'http://localhost:3000';

/**
 * Resolve a newsletter resource string to a Unified Backend file GET URL.
 * Absolute http(s) URLs pass through; `/files/...` and bare cuids map to GET /files/{cuid}.
 */
export function filesApiUrl(resource: string, origin: string = FILES_API_ORIGIN): string {
  const trimmed = resource.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/files/')) return `${origin}${trimmed}`;
  const cuid = trimmed.replace(/^\/+/, '');
  return `${origin}/files/${cuid}`;
}

export function entryLabel(entry: NewsletterCatalogEntry): string {
  if (entry.header && entry.header.trim().length > 0) return entry.header.trim();
  const year = yearFromTags(entry.tags);
  const month = monthFromTags(entry.tags);
  if (year !== null && month !== null) {
    return `${month.toString().padStart(2, '0')}/${year}`;
  }
  return entry.cuid;
}

/** Older catalog = years other than the current calendar year. */
export function searchOlderCatalog(
  entries: NewsletterCatalogEntry[],
  currentYear: number,
  query: string,
): NewsletterCatalogEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  return entries.filter((entry) => {
    const year = yearFromTags(entry.tags);
    if (year === null || year === currentYear) return false;
    const hay = [
      entry.header ?? '',
      entry.body,
      ...entry.tags,
      year.toString(),
      (monthFromTags(entry.tags) ?? '').toString(),
    ]
      .join('\n')
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function monthLabel(month: number): string {
  const labels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return labels[month - 1] ?? month.toString().padStart(2, '0');
}
