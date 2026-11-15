const FILES_API_ORIGIN = 'http://localhost:3000';

/**
 * Resolve a StoredFileEntry cuid (or /files path) to Unified Backend GET /files/{cuid}.
 * Absolute http(s) URLs still pass through.
 */
export function filesApiUrl(resource: string, origin: string = FILES_API_ORIGIN): string {
  const trimmed = resource.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/files/')) return `${origin}${trimmed}`;
  const cuid = trimmed.replace(/^\/+/, '');
  return `${origin}/files/${cuid}`;
}
