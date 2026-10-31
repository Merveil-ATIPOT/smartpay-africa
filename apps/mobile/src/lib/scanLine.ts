/** Cadre QR M13 : 256 dp, comme le w-64/h-64 Stitch. */
export const SCAN_FRAME_SIZE = 256;
/** Marge intérieure (left-4 Stitch = 16 dp) pour rester dans les coins arrondis. */
export const SCAN_LINE_INSET = 16;
/** Hauteur du wrap laser (ligne 2 dp + halo). */
export const SCAN_LINE_HEIGHT = 3;

/**
 * Amplitude verticale de la ligne de scan, en dp depuis le haut du cadre.
 * `from` = bord intérieur haut ; `to` = position du haut de la ligne quand
 * son bas atteint le bord intérieur bas (hauteur de ligne déduite).
 */
export function scanLineTravelRange(
  frameHeight: number,
  lineHeight: number = SCAN_LINE_HEIGHT,
  inset: number = SCAN_LINE_INSET,
): { from: number; to: number } {
  const height = Number.isFinite(frameHeight) && frameHeight > 0 ? frameHeight : SCAN_FRAME_SIZE;
  const safeLine = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : SCAN_LINE_HEIGHT;
  const safeInset = Number.isFinite(inset) && inset >= 0 ? inset : SCAN_LINE_INSET;
  const from = Math.min(safeInset, Math.max(0, height - safeLine));
  const to = Math.max(from, height - safeInset - safeLine);
  return { from, to };
}
