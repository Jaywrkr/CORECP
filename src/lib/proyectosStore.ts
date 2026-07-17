import { list, put } from "@vercel/blob";
import type { Proyecto } from "@/types/proyecto";

const PATHNAME = "proyectos/roster.json";

export async function readProyectos(): Promise<Proyecto[]> {
  const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
  const blob = blobs.find((b) => b.pathname === PATHNAME);
  if (!blob) return [];

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return [];

  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Proyecto[]) : [];
}

export async function writeProyectos(proyectos: Proyecto[]): Promise<void> {
  await put(PATHNAME, JSON.stringify(proyectos, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
