/** Public newsletter catalog helpers (Unified Backend Newsletter rows). */

export type NewsletterCatalogEntry = {
  cuid: string;
  volume: number;
  number: number;
  month: number;
  year: number;
  filePath: string;
  keywords: string[];
};

export type NewsletterSelectionMode = 'volume-number' | 'month-year';

/** Newest = highest year, then month, then volume, then number. */
export function mostRecentEntry(
  entries: NewsletterCatalogEntry[],
): NewsletterCatalogEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort(compareNewestFirst)[0]!;
}

function compareNewestFirst(
  a: NewsletterCatalogEntry,
  b: NewsletterCatalogEntry,
): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.month !== b.month) return b.month - a.month;
  if (a.volume !== b.volume) return b.volume - a.volume;
  return b.number - a.number;
}

export function catalogVolumes(entries: NewsletterCatalogEntry[]): number[] {
  const volumes = new Set<number>();
  for (const entry of entries) volumes.add(entry.volume);
  return [...volumes].sort((a, b) => b - a);
}

export function numbersForVolume(
  entries: NewsletterCatalogEntry[],
  volume: number,
): number[] {
  const numbers = new Set<number>();
  for (const entry of entries) {
    if (entry.volume === volume) numbers.add(entry.number);
  }
  return [...numbers].sort((a, b) => a - b);
}

export function catalogYears(entries: NewsletterCatalogEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) years.add(entry.year);
  return [...years].sort((a, b) => b - a);
}

export function monthsForYear(
  entries: NewsletterCatalogEntry[],
  year: number,
): number[] {
  const months = new Set<number>();
  for (const entry of entries) {
    if (entry.year === year) months.add(entry.month);
  }
  return [...months].sort((a, b) => a - b);
}

export function entryForVolumeNumber(
  entries: NewsletterCatalogEntry[],
  volume: number,
  number: number,
): NewsletterCatalogEntry | null {
  return (
    entries.find((entry) => entry.volume === volume && entry.number === number) ??
    null
  );
}

export function entryForYearMonth(
  entries: NewsletterCatalogEntry[],
  year: number,
  month: number,
): NewsletterCatalogEntry | null {
  const matches = entries.filter(
    (entry) => entry.year === year && entry.month === month,
  );
  if (matches.length === 0) return null;
  return [...matches].sort(compareNewestFirst)[0]!;
}

export function entryByCuid(
  entries: NewsletterCatalogEntry[],
  cuid: string,
): NewsletterCatalogEntry | null {
  return entries.find((entry) => entry.cuid === cuid) ?? null;
}

export function entryLabel(entry: NewsletterCatalogEntry): string {
  return `Vol. ${entry.volume} No. ${entry.number} · ${monthLabel(entry.month)} ${entry.year}`;
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

const FILES_API_ORIGIN = 'http://localhost:3000';

/**
 * Resolve a newsletter filePath (StoredFileEntry cuid) to Unified Backend GET /files/{cuid}.
 * Absolute http(s) URLs and `/files/...` paths still pass through.
 */
export function filesApiUrl(resource: string, origin: string = FILES_API_ORIGIN): string {
  const trimmed = resource.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/files/')) return `${origin}${trimmed}`;
  const cuid = trimmed.replace(/^\/+/, '');
  return `${origin}/files/${cuid}`;
}
