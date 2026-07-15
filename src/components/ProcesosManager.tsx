"use client";

import { useEffect, useState } from "react";
import type { ProcesoCache, ProcesoResumen } from "@/types/proceso";

interface ProcesosManagerProps {
  onClose: () => void;
  onOpenProceso: (proceso: ProcesoCache) => void;
}

export default function ProcesosManager({ onClose, onOpenProceso }: ProcesosManagerProps) {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingNumero, setOpeningNumero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/procesos")
      .then((res) => res.json())
      .then((data) => setProcesos(Array.isArray(data?.procesos) ? data.procesos : []))
      .catch(() => setError("No se pudo cargar la lista de procesos."))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (numero: string) => {
    setOpeningNumero(numero);
    setError(null);
    try {
      const res = await fetch(`/api/procesos?numero=${encodeURIComponent(numero)}`);
      const data: { proceso?: ProcesoCache; error?: string } = await res.json();
      if (!res.ok || !data.proceso) throw new Error(data.error || "No se pudo abrir este proceso.");
      onOpenProceso(data.proceso);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al abrir el proceso.");
    } finally {
      setOpeningNumero(null);
    }
  };

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Procesos guardados
            </h2>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Reabre un análisis previo sin volver a usar IA.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded px-2 py-1 text-sm hover:bg-white/5"
            style={{ color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Cargando…
            </p>
          ) : procesos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Aún no hay procesos guardados. Se guardan automáticamente al analizar un pliego.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {procesos.map((p) => (
                <li
                  key={p.numeroProceso}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                      {p.nombreProyecto}
                    </div>
                    <div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {p.numeroProceso} · {new Date(p.actualizadoEn).toLocaleString("es-EC")}
                      {p.documentos.length > 0 ? ` · ${p.documentos.length} documento(s)` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleOpen(p.numeroProceso)}
                      disabled={openingNumero === p.numeroProceso}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
                      style={{ background: "var(--accent)" }}
                    >
                      {openingNumero === p.numeroProceso ? "Abriendo…" : "Abrir"}
                    </button>
                    <button
                      onClick={() => handleDelete(p.numeroProceso)}
                      className="rounded px-2 py-1 text-xs hover:bg-white/5"
                      style={{ color: "var(--danger)" }}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
