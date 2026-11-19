const PUBLICATIONS_ORIGIN = 'http://localhost:3000';

/**
 * Resolve a publication cuid (or publications/{cuid} path) to Unified Backend
 * GET /publications/{cuid}/file. Absolute http(s) URLs still pass through.
 */
export function publicationFileUrl(
  resource: string,
  origin: string = PUBLICATIONS_ORIGIN,
): string {
  const trimmed = resource.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/publications/') && trimmed.endsWith('/file')) {
    return `${origin}${trimmed}`;
  }
  const id = trimmed.startsWith('publications/')
    ? trimmed.slice('publications/'.length)
    : trimmed.replace(/^\/+/, '');
  return `${origin}/publications/${id}/file`;
}
