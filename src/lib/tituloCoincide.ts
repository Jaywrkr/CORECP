function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bingenieria\b/g, "ingenieria")
    .replace(/\bingeniero\b/g, "ingenieria")
    .replace(/\blicenciado\b/g, "licenciatura")
    .replace(/\blicenciada\b/g, "licenciatura")
    .trim();
}

// Compares a técnico's título against a pliego's requirement text. Pliegos
// frequently list several acceptable fields separated by comas/"o" and end
// with "afines" ("or related fields") — in that case the requirement is
// deliberately broad, so we don't flag a mismatch at all.
export function tituloCoincide(tituloTecnico: string, tituloRequerido: string): boolean {
  if (!tituloTecnico.trim() || !tituloRequerido.trim()) return true;
  if (/afin/i.test(tituloRequerido)) return true;

  const normTecnico = normalizar(tituloTecnico);
  const candidatos = tituloRequerido
    .split(/,| o | y |\/|;/i)
    .map((c) => normalizar(c))
    .filter(Boolean);

  return candidatos.some((c) => c.includes(normTecnico) || normTecnico.includes(c));
}
