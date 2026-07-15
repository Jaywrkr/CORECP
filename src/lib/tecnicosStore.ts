import { list, put } from "@vercel/blob";
import type { Tecnico } from "@/types/tecnico";

// A single JSON document is more than enough for a technician roster of this
// size — no need for a database. `addRandomSuffix: false` keeps the pathname
// (and therefore the blob URL) stable across writes so it can be looked up
// deterministically via `list()`.
const PATHNAME = "tecnicos/roster.json";

export async function readTecnicos(): Promise<Tecnico[]> {
  const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
  const blob = blobs.find((b) => b.pathname === PATHNAME);
  if (!blob) return [];

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return [];

  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Tecnico[]) : [];
}

export async function writeTecnicos(tecnicos: Tecnico[]): Promise<void> {
  await put(PATHNAME, JSON.stringify(tecnicos, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
