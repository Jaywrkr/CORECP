/**
 * Best-effort heuristic to pre-fill the "número de proceso" field from the
 * pliego's own text — the user can always edit/correct it. Not run through
 * the model: this only needs to be good enough to save typing, not perfect.
 */
export function detectProcessCode(text: string): string {
  // Strip accents (NFD decomposes "código" to "co" + U+0301 + "digo", etc.)
  // so the label regex only needs to match the unaccented form.
  const normalized = text.normalize("NFD").replace(/[̀-ͯ]/g, "");

  const labelMatch = normalized.match(
    /codigo\s+del\s+proceso\s*:?\s*([A-Z0-9][A-Z0-9\-/]{3,40})/i,
  );
  if (labelMatch) {
    return labelMatch[1].trim().replace(/[.,;:]+$/, "");
  }

  // Common Ecuadorian public-procurement code shapes, e.g. SIE-EERSSA-2026-023,
  // COTO-GADX-2026-001, LICO-..., MCBS-...
  const genericMatch = normalized.match(/\b([A-Z]{2,8}-[A-Z0-9]{2,15}-\d{4}-\d{2,6})\b/);
  if (genericMatch) {
    return genericMatch[1];
  }

  return "";
}
