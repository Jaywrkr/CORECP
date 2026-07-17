"use client";

import { useState } from "react";
import type { Proyecto, ProyectoInput } from "@/types/proyecto";

interface ProyectosManagerProps {
  onClose: () => void;
  proyectos: Proyecto[];
  onProyectosChange: (proyectos: Proyecto[]) => void;
}

const EMPTY_FORM: ProyectoInput = {
  cliente: "",
  descripcionCorta: "",
  descripcionProyecto: "",
  fechaActaEntrega: "",
  monto: "",
};

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text-primary)",
};

interface PreviewState {
  proyectoId: string;
  tipo: "acta" | "certificado";
  url: string;
  nombre: string;
}

export default function ProyectosManager({ onClose, proyectos, onProyectosChange }: ProyectosManagerProps) {
  const [form, setForm] = useState<ProyectoInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const startEdit = (p: Proyecto) => {
    setEditingId(p.id);
    setForm({
      cliente: p.cliente,
      descripcionCorta: p.descripcionCorta,
      descripcionProyecto: p.descripcionProyecto,
      fechaActaEntrega: p.fechaActaEntrega ?? "",
      monto: p.monto ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente.trim() || !form.descripcionCorta.trim()) {
      setError("Cliente y descripción corta son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      cliente: form.cliente.trim(),
      descripcionCorta: form.descripcionCorta.trim(),
      descripcionProyecto: form.descripcionProyecto.trim(),
      fechaActaEntrega: form.fechaActaEntrega?.trim() || undefined,
      monto: form.monto?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/proyectos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar el proyecto.");
      onProyectosChange(data.proyectos);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/proyectos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el proyecto.");
      onProyectosChange(data.proyectos);
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadArchivo = async (proyectoId: string, tipo: "acta" | "certificado", file: File) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("id", proyectoId);
      formData.append("tipo", tipo);
      formData.append("file", file);
      const res = await fetch("/api/proyectos/documento", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo subir el archivo.");
      onProyectosChange(data.proyectos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al subir el archivo.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveArchivo = async (proyectoId: string, tipo: "acta" | "certificado") => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proyectos/documento?id=${encodeURIComponent(proyectoId)}&tipo=${tipo}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el archivo.");
      onProyectosChange(data.proyectos);
      setPreview((prev) => (prev && prev.proyectoId === proyectoId && prev.tipo === tipo ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar el archivo.");
    } finally {
      setSaving(false);
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Proyectos
            </h2>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Experiencia previa (Anexo 3) — cliente, descripción, monto, acta de entrega y certificado de participación.
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
          <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <input
                  value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. EMOV EP."
                  required
                />
              </Field>
              <Field label="Fecha de acta de entrega">
                <input
                  type="date"
                  value={form.fechaActaEntrega}
                  onChange={(e) => setForm((f) => ({ ...f, fechaActaEntrega: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                />
              </Field>
              <Field label="Descripción corta (para el listado de documentación) *">
                <input
                  value={form.descripcionCorta}
                  onChange={(e) => setForm((f) => ({ ...f, descripcionCorta: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Adquisición y puesta en marcha de servidor de producción..."
                  required
                />
              </Field>
              <Field label="Monto">
                <input
                  value={form.monto}
                  onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. $115.075"
                />
              </Field>
              <Field label="Descripción del proyecto (columna 'Proyecto' del Anexo 3)">
                <textarea
                  value={form.descripcionProyecto}
                  onChange={(e) => setForm((f) => ({ ...f, descripcionProyecto: e.target.value }))}
                  rows={2}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. ADQUISICIÓN Y PUESTA EN MARCHA DE SERVIDOR DE PRODUCCIÓN..."
                />
              </Field>
            </div>

            {error && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar proyecto"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border px-3.5 py-1.5 text-xs font-medium hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <hr className="mb-4" style={{ borderColor: "var(--border)" }} />

          {proyectos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Aún no has agregado ningún proyecto.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {proyectos.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div style={{ color: "var(--text-primary)" }}>{p.cliente}</div>
                      <div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {p.descripcionCorta}
                        {p.monto ? ` · ${p.monto}` : ""}
                        {p.fechaActaEntrega ? ` · Acta: ${p.fechaActaEntrega}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded px-2 py-1 text-xs hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={saving}
                        className="rounded px-2 py-1 text-xs hover:bg-white/5"
                        style={{ color: "var(--danger)" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <ArchivoControl
                      label="Acta de entrega"
                      archivo={p.archivoActaEntrega}
                      saving={saving}
                      onUpload={(file) => handleUploadArchivo(p.id, "acta", file)}
                      onRemove={() => handleRemoveArchivo(p.id, "acta")}
                      onPreview={() =>
                        p.archivoActaEntrega &&
                        setPreview({ proyectoId: p.id, tipo: "acta", url: p.archivoActaEntrega.url, nombre: p.archivoActaEntrega.nombre })
                      }
                    />
                    <ArchivoControl
                      label="Certificado de participación"
                      archivo={p.archivoCertificadoParticipacion}
                      saving={saving}
                      onUpload={(file) => handleUploadArchivo(p.id, "certificado", file)}
                      onRemove={() => handleRemoveArchivo(p.id, "certificado")}
                      onPreview={() =>
                        p.archivoCertificadoParticipacion &&
                        setPreview({
                          proyectoId: p.id,
                          tipo: "certificado",
                          url: p.archivoCertificadoParticipacion.url,
                          nombre: p.archivoCertificadoParticipacion.nombre,
                        })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
              <span className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                {preview.nombre}
              </span>
              <button
                onClick={() => setPreview(null)}
                aria-label="Cerrar vista previa"
                className="rounded px-2 py-1 text-sm hover:bg-white/5"
                style={{ color: "var(--text-tertiary)" }}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {/\.pdf$/i.test(preview.nombre) ? (
                <iframe src={preview.url} title={preview.nombre} className="h-[75vh] w-[70vw] rounded" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL, not a local/optimizable asset
                <img src={preview.url} alt={preview.nombre} className="max-h-[75vh] max-w-full rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchivoControl({
  label,
  archivo,
  saving,
  onUpload,
  onRemove,
  onPreview,
}: {
  label: string;
  archivo?: { url: string; nombre: string };
  saving: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  if (archivo) {
    return (
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--text-tertiary)" }}>{label}:</span>
        <button onClick={onPreview} className="rounded px-1.5 py-0.5 hover:bg-white/5" style={{ color: "var(--accent-hover)" }}>
          Ver
        </button>
        <button onClick={onRemove} disabled={saving} className="rounded px-1.5 py-0.5 hover:bg-white/5" style={{ color: "var(--text-tertiary)" }}>
          Quitar
        </button>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-1.5 hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
      <span>+ Subir {label.toLowerCase()}</span>
      <input
        type="file"
        accept="application/pdf,image/*"
        disabled={saving}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
