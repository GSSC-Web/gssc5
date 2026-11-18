/**
 * Split stored Position text on `;`, trim whitespace, and drop empty segments
 * (GSSC5-135 multi-position convention).
 */
// @relation(GSSC-PLLR-389, scope=range_start, role=Implementation)
export function lintPositionSegments(
  position: string | null | undefined,
): string[] {
  if (position === null || position === undefined) return [];
  return position
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/** Rejoin linted Position segments with the stored semicolon convention. */
export function formatPositionText(
  position: string | null | undefined,
): string {
  return lintPositionSegments(position).join('; ');
}

/** True when linted Position segments include the given office title. */
export function positionIncludesOffice(
  position: string | null | undefined,
  office: string,
): boolean {
  return lintPositionSegments(position).includes(office);
}
// @relation(GSSC-PLLR-389, scope=range_end, role=Implementation)
