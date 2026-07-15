import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

function sanitizeSegment(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "doc";
}

function sanitizeFilename(name: string): string {
  const idx = name.lastIndexOf(".");
  const base = idx > 0 ? name.slice(0, idx) : name;
  const ext = idx > 0 ? name.slice(idx + 1) : "";
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanExt ? `${sanitizeSegment(base)}.${cleanExt}` : sanitizeSegment(base);
}

export async function guardarArchivosDocumentoTecnico(
  tecnicoId: string,
  tipo: string,
  files: File[],
): Promise<{ url: string; nombre: string }[]> {
  const tipoSlug = sanitizeSegment(tipo);
  const subidos: { url: string; nombre: string }[] = [];
  for (const file of files) {
    const pathname = `tecnicos/documentos/${tecnicoId}/${tipoSlug}/${randomUUID()}-${sanitizeFilename(file.name)}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false,
    });
    subidos.push({ url: blob.url, nombre: file.name });
  }
  return subidos;
}

export async function eliminarArchivoDocumentoTecnico(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Best-effort — a stale blob left behind isn't worth failing the request over.
  }
}
