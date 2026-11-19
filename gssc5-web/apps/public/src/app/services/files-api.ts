import { backend } from './backend';

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

function filesCuid(resource: string): string {
  const trimmed = resource.trim();
  if (trimmed.startsWith('/files/')) {
    return trimmed.slice('/files/'.length).replace(/^\/+/, '');
  }
  return trimmed.replace(/^\/+/, '');
}

/**
 * Treaty GET /files/{cuid}. Mutable so unit tests can stub without fighting Eden proxies.
 */
export const filesApi = {
  get: (cuid: string) => backend.files({ cuid }).get(),
};

async function objectUrlFromTreatyPayload(payload: unknown): Promise<string | null> {
  if (payload instanceof Response) {
    if (!payload.ok) return null;
    return URL.createObjectURL(await payload.blob());
  }
  if (payload instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([payload]));
  }
  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    return URL.createObjectURL(payload);
  }
  return null;
}

/**
 * Load stored-file bytes via Eden Treaty GET /files/{cuid} (blob when data is a Response).
 * Absolute http(s) resources still fetch with credentials. 403/404 → null (omit chrome).
 */
export async function resolveStoredFileObjectUrl(resource: string): Promise<string | null> {
  const trimmed = resource.trim();
  if (trimmed.length === 0) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, { credentials: 'include' });
      if (!response.ok) return null;
      return URL.createObjectURL(await response.blob());
    } catch {
      return null;
    }
  }

  try {
    const result = await filesApi.get(filesCuid(trimmed));
    if (result.error) return null;
    if (result.status === 403 || result.status === 404) return null;
    if (result.status < 200 || result.status >= 300) return null;
    return objectUrlFromTreatyPayload(result.data);
  } catch {
    return null;
  }
}

/**
 * Probe Treaty GET /files/{cuid}; on success return the stable /files URL so the
 * browser PDF chrome can honor Content-Disposition filename (not a blob: UUID).
 * Absolute http(s) resources still pass through after a credentialed probe.
 */
export async function resolveStoredFileAccessUrl(resource: string): Promise<string | null> {
  const trimmed = resource.trim();
  if (trimmed.length === 0) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, { credentials: 'include', method: 'GET' });
      if (!response.ok) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  try {
    const result = await filesApi.get(filesCuid(trimmed));
    if (result.error) return null;
    if (result.status === 403 || result.status === 404) return null;
    if (result.status < 200 || result.status >= 300) return null;
    return filesApiUrl(trimmed);
  } catch {
    return null;
  }
}
