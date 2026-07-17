"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TecnicosManager from "@/components/TecnicosManager";
import ProyectosManager from "@/components/ProyectosManager";
import type { Tecnico } from "@/types/tecnico";
import type { Proyecto } from "@/types/proyecto";
import type { ProcesoResumen } from "@/types/proceso";

export default function Home() {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [showTecnicos, setShowTecnicos] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [showProyectos, setShowProyectos] = useState(false);

  useEffect(() => {
    fetch("/api/procesos")
      .then((res) => res.json())
      .then((data) => setProcesos(Array.isArray(data?.procesos) ? data.procesos : []))
      .catch(() => setError("No se pudo cargar la lista de procesos."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/tecnicos")
      .then((res) => res.json())
      .then((data) => setTecnicos(Array.isArray(data?.tecnicos) ? data.tecnicos : []))
      .catch(() => setTecnicos([]));
  }, []);

  useEffect(() => {
    fetch("/api/proyectos")
      .then((res) => res.json())
      .then((data) => setProyectos(Array.isArray(data?.proyectos) ? data.proyectos : []))
      .catch(() => setProyectos([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return procesos;
    return procesos.filter(
      (p) =>
        p.nombreProyecto.toLowerCase().includes(q) || p.numeroProceso.toLowerCase().includes(q),
    );
  }, [procesos, query]);

  const handleDelete = async (numero: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/procesos?numero=${encodeURIComponent(numero)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el proceso.");
      setProcesos((prev) => prev.filter((p) => p.numeroProceso !== numero));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex shrink-0 items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{ background: "var(--accent-soft)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2">
              <path
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Extractor de Anexos — Compras Públicas
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Coresolutions · Fase 1: extracción y visualización
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProyectos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Proyectos
          </button>
          <button
            onClick={() => setShowTecnicos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Técnicos
          </button>
          <Link
            href="/analizar"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            + Nuevo proceso
          </Link>
        </div>
      </header>

      {showTecnicos && (
        <TecnicosManager
          onClose={() => setShowTecnicos(false)}
          tecnicos={tecnicos}
          onTecnicosChange={setTecnicos}
        />
      )}

      {showProyectos && (
        <ProyectosManager
          onClose={() => setShowProyectos(false)}
          proyectos={proyectos}
          onProyectosChange={setProyectos}
        />
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <label className="mb-6 block">
          <span className="sr-only">Buscar proceso</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proceso por nombre o número…"
            className="w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
          />
        </label>

        {error && (
          <p className="mb-4 text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Cargando…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {procesos.length === 0
              ? 'Aún no hay procesos analizados. Usa "+ Nuevo proceso" para empezar.'
              : "Ningún proceso coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((p) => (
              <li
                key={p.numeroProceso}
                className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
              >
                <Link href={`/analizar?numero=${encodeURIComponent(p.numeroProceso)}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.nombreProyecto}
                  </div>
                  <div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {p.numeroProceso} · {new Date(p.actualizadoEn).toLocaleString("es-EC")}
                    {p.documentos.length > 0 ? ` · ${p.documentos.length} documento(s)` : ""}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(p.numeroProceso)}
                  className="shrink-0 rounded px-2 py-1 text-xs hover:bg-white/5"
                  style={{ color: "var(--danger)" }}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
