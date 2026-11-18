/**
 * Split stored Position text on `;`, trim whitespace, and drop empty segments
 * (GSSC5-135 multi-position convention).
 */
// @relation(GSSC-MLLR-661, GSSC-MLLR-664, scope=range_start, role=Implementation)
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
// @relation(GSSC-MLLR-661, GSSC-MLLR-664, scope=range_end, role=Implementation)
