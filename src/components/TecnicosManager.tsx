"use client";

import { useState } from "react";
import type { Tecnico, TecnicoInput } from "@/types/tecnico";

interface TecnicosManagerProps {
  onClose: () => void;
  tecnicos: Tecnico[];
  onTecnicosChange: (tecnicos: Tecnico[]) => void;
}

const EMPTY_FORM: TecnicoInput = {
  nombre: "",
  cedula: "",
  tituloAcademico: "",
  nivelEstudio: "",
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

  const startEdit = (t: Tecnico) => {
    setEditingId(t.id);
    setForm({
      nombre: t.nombre,
      cedula: t.cedula,
      tituloAcademico: t.tituloAcademico,
      nivelEstudio: t.nivelEstudio,
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
      tituloAcademico: form.tituloAcademico.trim(),
      nivelEstudio: form.nivelEstudio.trim(),
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
              <Field label="Título académico">
                <input
                  value={form.tituloAcademico}
                  onChange={(e) => setForm((f) => ({ ...f, tituloAcademico: e.target.value }))}
                  className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                  style={inputStyle}
                  placeholder="ej. Ingeniería Civil"
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
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                >
                  <div className="min-w-0">
                    <div style={{ color: "var(--text-primary)" }}>{t.nombre}</div>
                    <div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                      CI {t.cedula}
                      {t.tituloAcademico ? ` · ${t.tituloAcademico}` : ""}
                      {t.nivelEstudio ? ` · ${t.nivelEstudio}` : ""}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
