function sanitizeToken(value: string, fallback: string): string {
  const clean = value.trim().toUpperCase().replace(/\s+/g, " ");
  return clean || fallback;
}

export function formatFechaYYMMDD(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

// Builds an auto-generated, human-friendly project label like
// "ETAPA-260716-STORAGE Y VMS" (CLIENTE-AÑOMESDIA-DESCRIPCION) so a stored
// proceso is recognizable in a list without needing its official código.
export function generarNombreProyecto(
  cliente: string,
  descripcion: string,
  fecha: Date = new Date(),
): string {
  const clienteToken = sanitizeToken(cliente, "SIN-CLIENTE");
  const descripcionToken = sanitizeToken(descripcion, "SIN-DESCRIPCION");
  return `${clienteToken}-${formatFechaYYMMDD(fecha)}-${descripcionToken}`;
}
