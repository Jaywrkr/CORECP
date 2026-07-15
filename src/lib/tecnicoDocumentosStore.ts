import { del, put } from "@vercel/blob";

function pathFor(tecnicoId: string, extension: string): string {
  return `tecnicos/documentos/${tecnicoId}.${extension}`;
}

export async function guardarDocumentoTecnico(
  tecnicoId: string,
  file: File,
): Promise<{ url: string; nombre: string }> {
  const extension = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const pathname = pathFor(tecnicoId, extension);
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: blob.url, nombre: file.name };
}

export async function eliminarDocumentoTecnico(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Best-effort — a stale blob left behind isn't worth failing the request over.
  }
}
