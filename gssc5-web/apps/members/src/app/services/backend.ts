import { treaty } from "@elysiajs/eden";
import type { App } from "@gssc/backend";

/** Fallback when `location` is unavailable (SSR / non-browser harness). */
const DEFAULT_BACKEND_ORIGIN = "http://localhost:3000";

/**
 * Unified Backend origin for Eden Treaty and browser file hrefs.
 * On loopback FE hosts, use the same hostname so the Login Token cookie is
 * same-site (127.0.0.1 vs localhost break credentialed follow-ups).
 */
export function resolveBackendOrigin(
  locationLike: { protocol: string; hostname: string } | undefined = globalThis.location,
): string {
  if (!locationLike?.hostname) return DEFAULT_BACKEND_ORIGIN;
  if (locationLike.hostname === "localhost" || locationLike.hostname === "127.0.0.1") {
    return `${locationLike.protocol}//${locationLike.hostname}:3000`;
  }
  return DEFAULT_BACKEND_ORIGIN;
}

/** Single origin shared by Treaty and href builders in this app. */
export const BACKEND_ORIGIN = resolveBackendOrigin();

/** JSON / text responses stay on Treaty's default parsers. */
function isTreatyJsonLikeContentType(contentType: string | null): boolean {
  const ct = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ct === "") return true;
  return (
    ct === "application/json" ||
    ct === "text/event-stream" ||
    ct === "multipart/form-data" ||
    ct.startsWith("text/")
  );
}

export const backend = treaty<App>(BACKEND_ORIGIN, {
  // Include the Login Token cookie on credentialed browser requests.
  fetch: { credentials: "include" },
  // Stored-file GET returns binary bodies; hand the Response through so callers
  // can .blob() (default Treaty parsing would text-decode non-JSON MIME types).
  onResponse: (response) => {
    if (isTreatyJsonLikeContentType(response.headers.get("content-type"))) {
      return;
    }
    return response;
  },
});
