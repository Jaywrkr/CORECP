import { del, list, put } from "@vercel/blob";
import type { ProcesoCache } from "@/types/proceso";

// One JSON document per process number — caches the consolidated extraction
// result so re-uploading the same pliego doesn't require another Claude call.
function sanitizeKey(numero: string): string {
  return numero.trim().toLowerCase().replace(/[^a-z0-9\-_.]/g, "_");
}

function pathFor(numero: string): string {
  return `procesos/${sanitizeKey(numero)}.json`;
}

export async function readProceso(numero: string): Promise<ProcesoCache | null> {
  const pathname = pathFor(numero);
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const blob = blobs.find((b) => b.pathname === pathname);
  if (!blob) return null;

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;

  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null) return null;
  return data as ProcesoCache;
}

export async function writeProceso(proceso: ProcesoCache): Promise<void> {
  await put(pathFor(proceso.numeroProceso), JSON.stringify(proceso, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function deleteProceso(numero: string): Promise<void> {
  await del(pathFor(numero));
}
