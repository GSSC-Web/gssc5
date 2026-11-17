import { treaty } from "@elysiajs/eden";
import type { App } from "@gssc/backend";

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

export const backend = treaty<App>("http://localhost:3000", {
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
