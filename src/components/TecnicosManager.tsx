"use client";

import { useState } from "react";
import type { DocumentoArchivo, Tecnico, TecnicoInput } from "@/types/tecnico";

interface TecnicosManagerProps {
  onClose: () => void;
  tecnicos: Tecnico[];
  onTecnicosChange: (tecnicos: Tecnico[]) => void;
}

// Categorías de documento por técnico. Agregar una nueva categoría es tan
// simple como añadir un string aquí — el resto de la UI se genera solo.
const TIPOS_DOCUMENTO = ["Senescyt"];

interface PreviewState {
  tecnicoId: string;
  tipo: string;
  archivos: DocumentoArchivo[];
}

const EMPTY_FORM: TecnicoInput = {
  nombre: "",
  cedula: "",
  rol: "Técnico",
  tituloAcademico: "",
  cuartoNivelTitulo: "",
  nivelEstudio: "",
  fechaContrato: "",
  fechaIngreso: "",
  certificaciones: [],
  notas: "",
};

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text-primary)",
};

export default function TecnicosManager({ onClose, tecnicos, onTecnicosChange }: TecnicosManagerProps) {
  const [form, setForm] = useState<TecnicoInput & { certificacionesText: string }>({
    ...EMPTY_FORM,
    certificacionesText: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const startEdit = (t: Tecnico) => {
    setEditingId(t.id);
    setForm({
      nombre: t.nombre,
      cedula: t.cedula,
      rol: t.rol,
      tituloAcademico: t.tituloAcademico,
      cuartoNivelTitulo: t.cuartoNivelTitulo ?? "",
      nivelEstudio: t.nivelEstudio,
      fechaContrato: t.fechaContrato ?? "",
      fechaIngreso: t.fechaIngreso ?? "",
      certificaciones: t.certificaciones,
      notas: t.notas ?? "",
      certificacionesText: t.certificaciones.join(", "),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, certificacionesText: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.cedula.trim()) {
      setError("Nombre y cédula son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      cedula: form.cedula.trim(),
      rol: form.rol.trim() || "Técnico",
      tituloAcademico: form.tituloAcademico.trim(),
      cuartoNivelTitulo: form.cuartoNivelTitulo?.trim() || undefined,
      nivelEstudio: form.nivelEstudio.trim(),
      fechaContrato: form.fechaContrato?.trim() || undefined,
      fechaIngreso: form.fechaIngreso?.trim() || undefined,
      certificaciones: form.certificacionesText
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      notas: form.notas?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/tecnicos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar el técnico.");
      onTecnicosChange(data.tecnicos);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocumentos = async (tecnicoId: string, tipo: string, files: FileList) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("id", tecnicoId);
      formData.append("tipo", tipo);
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/tecnicos/documento", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo subir el documento.");
      onTecnicosChange(data.tecnicos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al subir el documento.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveArchivo = async (tecnicoId: string, tipo: string, url?: string) => {
    setSaving(true);
    setError(null);
    try {
      const params = new URLSearchParams({ id: tecnicoId, tipo });
      if (url) params.set("url", url);
      const res = await fetch(`/api/tecnicos/documento?${params.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el documento.");
      onTecnicosChange(data.tecnicos);
      setPreview((prev) => {
        if (!prev || prev.tecnicoId !== tecnicoId || prev.tipo !== tipo) return prev;
        const restantes = url ? prev.archivos.filter((a) => a.url !== url) : [];
        return restantes.length > 0 ? { ...prev, archivos: restantes } : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tecnicos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el técnico.");
      onTecnicosChange(data.tecnicos);
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar.");
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
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Técnicos
          </h2>
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
              <Field label="Nombre completo *">
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  required
                />
              </Field>
              <Field label="Cédula *">
                <input
                  value={form.cedula}
                  onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  required
                />
              </Field>
              <Field label="Rol">
                <input
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Técnico"
                />
              </Field>
              <Field label="Título académico (tercer nivel)">
                <input
                  value={form.tituloAcademico}
                  onChange={(e) => setForm((f) => ({ ...f, tituloAcademico: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Ingeniería Civil"
                />
              </Field>
              <Field label="Cuarto nivel de título (maestría)">
                <input
                  value={form.cuartoNivelTitulo}
                  onChange={(e) => setForm((f) => ({ ...f, cuartoNivelTitulo: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Máster en Telecomunicaciones"
                />
              </Field>
              <Field label="Nivel de estudio">
                <input
                  value={form.nivelEstudio}
                  onChange={(e) => setForm((f) => ({ ...f, nivelEstudio: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Tercer Nivel"
                />
              </Field>
              <Field label="Fecha de contrato">
                <input
                  type="date"
                  value={form.fechaContrato}
                  onChange={(e) => setForm((f) => ({ ...f, fechaContrato: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                />
              </Field>
              <Field label="Fecha de ingreso">
                <input
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                />
              </Field>
              <Field label="Certificaciones (separadas por coma)">
                <input
                  value={form.certificacionesText}
                  onChange={(e) => setForm((f) => ({ ...f, certificacionesText: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. PMP, LEED AP"
                />
              </Field>
              <Field label="Notas">
                <input
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
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
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar técnico"}
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

          {tecnicos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Aún no has agregado ningún técnico.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tecnicos.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div style={{ color: "var(--text-primary)" }}>
                        {t.nombre}
                        {t.rol ? ` · ${t.rol}` : ""}
                      </div>
                      <div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                        CI {t.cedula}
                        {t.tituloAcademico ? ` · ${t.tituloAcademico}` : ""}
                        {t.cuartoNivelTitulo ? ` · ${t.cuartoNivelTitulo}` : ""}
                        {t.nivelEstudio ? ` · ${t.nivelEstudio}` : ""}
                        {t.fechaIngreso ? ` · Ingreso: ${t.fechaIngreso}` : ""}
                        {t.fechaContrato ? ` · Contrato: ${t.fechaContrato}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="rounded px-2 py-1 text-xs hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={saving}
                        className="rounded px-2 py-1 text-xs hover:bg-white/5"
                        style={{ color: "var(--danger)" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {TIPOS_DOCUMENTO.map((tipo) => {
                      const archivos = t.documentos?.[tipo] ?? [];
                      return (
                        <div key={tipo} className="flex items-center gap-1.5 text-xs">
                          {archivos.length > 0 ? (
                            <>
                              <button
                                onClick={() => setPreview({ tecnicoId: t.id, tipo, archivos })}
                                className="rounded px-2 py-1 hover:bg-white/5"
                                style={{ color: "var(--accent-hover)" }}
                              >
                                Ver {tipo} ({archivos.length})
                              </button>
                              <label
                                className="cursor-pointer rounded px-1.5 py-1 hover:bg-white/5"
                                style={{ color: "var(--text-tertiary)" }}
                                title={`Agregar más archivos a ${tipo}`}
                              >
                                +
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  multiple
                                  disabled={saving}
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.length) void handleUploadDocumentos(t.id, tipo, e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => handleRemoveArchivo(t.id, tipo)}
                                disabled={saving}
                                className="rounded px-1.5 py-1 hover:bg-white/5"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Quitar todo
                              </button>
                            </>
                          ) : (
                            <label
                              className="cursor-pointer rounded px-2 py-1 hover:bg-white/5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              + Subir {tipo}
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                disabled={saving}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.length) void handleUploadDocumentos(t.id, tipo, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
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
                {preview.tipo} · {preview.archivos.length} archivo{preview.archivos.length === 1 ? "" : "s"}
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
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3">
              {preview.archivos.map((archivo) => (
                <div key={archivo.url} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <span className="truncate">{archivo.nombre}</span>
                    <button
                      onClick={() => handleRemoveArchivo(preview.tecnicoId, preview.tipo, archivo.url)}
                      disabled={saving}
                      className="shrink-0 rounded px-2 py-0.5 hover:bg-white/5"
                      style={{ color: "var(--danger)" }}
                    >
                      Quitar
                    </button>
                  </div>
                  {/\.pdf$/i.test(archivo.nombre) ? (
                    <iframe src={archivo.url} title={archivo.nombre} className="h-[60vh] w-[70vw] rounded" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL, not a local/optimizable asset
                    <img src={archivo.url} alt={archivo.nombre} className="max-w-full rounded" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
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
