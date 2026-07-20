"use client";

import { useState } from "react";
import type {
  Anexo2Firma,
  Anexo2Overrides,
  Anexo2OverridesMap,
  Anexo3Firma,
  Anexo3FilaOverride,
  Anexo3OverridesMap,
  Anexo3ProyectosMap,
  Anexo3TecnicoOverride,
  Anexo3TecnicoOverridesMap,
  ExtractionResult,
  ExtractionStatus,
} from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import Anexo2Preview from "./Anexo2Preview";
import Anexo3Preview from "./Anexo3Preview";
import { tituloCoincide } from "@/lib/tituloCoincide";
import { descargarBlob, generarAnexo2Docx } from "@/lib/exportarAnexo2Docx";
import { generarAnexo3Docx } from "@/lib/exportarAnexo3Docx";

interface RequisitosPanelProps {
  status: ExtractionStatus;
  result: ExtractionResult | null;
  error: string | null;
  onRetry?: () => void;
  documentCount?: number;
  progressLabel?: string | null;
  tecnicos?: Tecnico[];
  proyectos?: Proyecto[];
  asignaciones?: Record<number, string>;
  onAssignTecnico?: (rowIndex: number, tecnicoId: string) => void;
  anexo2Overrides?: Anexo2OverridesMap;
  onAnexo2OverrideChange?: (rowIndex: number, field: keyof Anexo2Overrides, value: string) => void;
  anexo2Firma?: Anexo2Firma;
  onAnexo2FirmaChange?: (field: keyof Anexo2Firma, value: string) => void;
  anexo3Proyectos?: Anexo3ProyectosMap;
  onAnexo3ProyectosChange?: (rowIndex: number, proyectoIds: string[]) => void;
  anexo3Overrides?: Anexo3OverridesMap;
  onAnexo3OverrideChange?: (rowIndex: number, proyectoId: string, field: keyof Anexo3FilaOverride, value: string) => void;
  anexo3TecnicoOverrides?: Anexo3TecnicoOverridesMap;
  onAnexo3TecnicoOverrideChange?: (tecnicoId: string, field: keyof Anexo3TecnicoOverride, value: string) => void;
  anexo3Firma?: Anexo3Firma;
  onAnexo3FirmaChange?: (field: keyof Anexo3Firma, value: string) => void;
}

const CATEGORY_LABELS: { key: keyof ExtractionResult["requisitos"]; label: string }[] = [
  { key: "personal", label: "Personal técnico requerido" },
  { key: "nivelAcademico", label: "Nivel académico exigido" },
  { key: "titulacion", label: "Titulación específica requerida" },
  { key: "certificaciones", label: "Certificaciones técnicas exigidas" },
  { key: "experiencia", label: "Experiencia mínima requerida" },
  { key: "otros", label: "Otros requisitos relevantes" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </h2>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
      {message}
    </p>
  );
}

export default function RequisitosPanel({
  status,
  result,
  error,
  onRetry,
  documentCount = 0,
  progressLabel,
  tecnicos = [],
  proyectos = [],
  asignaciones = {},
  onAssignTecnico,
  anexo2Overrides = {},
  onAnexo2OverrideChange,
  anexo2Firma = {},
  onAnexo2FirmaChange,
  anexo3Proyectos = {},
  onAnexo3ProyectosChange,
  anexo3Overrides = {},
  onAnexo3OverrideChange,
  anexo3TecnicoOverrides = {},
  onAnexo3TecnicoOverrideChange,
  anexo3Firma = {},
  onAnexo3FirmaChange,
}: RequisitosPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [showPreviewAnexo3, setShowPreviewAnexo3] = useState(false);
  const [editModeAnexo3, setEditModeAnexo3] = useState(false);
  const [exportingWordAnexo3, setExportingWordAnexo3] = useState(false);
  const [exportErrorAnexo3, setExportErrorAnexo3] = useState<string | null>(null);

  const handleDescargarPdf = () => window.print();

  const handleDescargarWord = async () => {
    if (!result) return;
    setExportingWord(true);
    setExportError(null);
    try {
      const blob = await generarAnexo2Docx({
        filas: result.anexo2Sugerido,
        tecnicos,
        asignaciones,
        overrides: anexo2Overrides,
        firma: anexo2Firma,
      });
      descargarBlob(blob, "Anexo_2_Personal_Tecnico.docx");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo generar el archivo Word.");
    } finally {
      setExportingWord(false);
    }
  };

  const handleDescargarWordAnexo3 = async () => {
    if (!result) return;
    setExportingWordAnexo3(true);
    setExportErrorAnexo3(null);
    try {
      const blob = await generarAnexo3Docx({
        anexo2Filas: result.anexo2Sugerido,
        anexo3Filas: result.anexo3Sugerido,
        tecnicos,
        proyectos,
        asignaciones,
        proyectosPorFila: anexo3Proyectos,
        overrides: anexo3Overrides,
        tecnicoOverrides: anexo3TecnicoOverrides,
        firma: anexo3Firma,
      });
      descargarBlob(blob, "Anexo_3_Experiencia_Personal_Tecnico.docx");
    } catch (err) {
      setExportErrorAnexo3(err instanceof Error ? err.message : "No se pudo generar el archivo Word.");
    } finally {
      setExportingWordAnexo3(false);
    }
  };

  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {documentCount > 0
            ? 'Presiona "Analizar" para procesar los documentos con IA.'
            : "Sube uno o más pliegos en la columna izquierda para comenzar."}
        </p>
      </div>
    );
  }

  if (status === "uploading" || status === "extracting") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {status === "uploading"
            ? progressLabel ?? "Leyendo el texto del PDF…"
            : documentCount > 1
              ? `Consolidando el análisis de ${documentCount} documentos con Claude…`
              : "Analizando el pliego con Claude…"}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Esto puede tardar hasta un minuto en documentos extensos.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--danger-soft)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.18A2 2 0 004.18 21h15.64a2 2 0 001.87-2.96L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="max-w-sm text-sm" style={{ color: "var(--text-primary)" }}>
          {error ?? "Ocurrió un error al procesar el documento."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    );
  }

  if (!result) return null;

  const { requisitos, fechasClave, anexo2Sugerido, anexo3Sugerido } = result;
  const hasAnyRequisitos = CATEGORY_LABELS.some((c) => requisitos[c.key].length > 0);
  const hasFechasClave =
    !!fechasClave && (fechasClave.presentacionOferta || fechasClave.puja || fechasClave.adjudicacion);

  return (
    <div className="flex flex-col gap-8 px-5 py-5">
      {documentCount > 1 && (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Análisis consolidado de {documentCount} documentos — la información repetida entre archivos
          se combinó en una sola vista.
        </p>
      )}

      {hasFechasClave && (
        <section
          className="rounded-md border p-4"
          style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}
        >
          <h2
            className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: "var(--accent-hover)" }}
          >
            Fechas clave del proceso
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FechaClaveItem label="Presentación de oferta" value={fechasClave.presentacionOferta} />
            <FechaClaveItem label="Puja / subasta inversa" value={fechasClave.puja} />
            <FechaClaveItem label="Adjudicación" value={fechasClave.adjudicacion} />
          </dl>
        </section>
      )}

      {/* Bloque A: requisitos detectados */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
          >
            1
          </span>
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Requisitos detectados
          </h1>
        </div>

        {!hasAnyRequisitos ? (
          <EmptyState message="No se detectaron requisitos de personal técnico en el documento." />
        ) : (
          <div className="flex flex-col gap-5">
            {CATEGORY_LABELS.map(({ key, label }) => {
              const items = requisitos[key];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <SectionTitle>{label}</SectionTitle>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-md border px-3 py-2 text-sm leading-snug"
                        style={{
                          borderColor: "var(--border-subtle)",
                          background: "var(--bg-elevated)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <hr style={{ borderColor: "var(--border)" }} />

      {/* Bloque B: Anexo 2 */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
            >
              2
            </span>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Campos sugeridos — Anexo 2: Personal Técnico
            </h1>
          </div>
          {anexo2Sugerido.length > 0 && (
            <button
              onClick={() => setShowPreview(true)}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Vista previa Anexo 2
            </button>
          )}
        </div>

        {anexo2Sugerido.length === 0 ? (
          <EmptyState message="No se identificaron perfiles de especialistas para el Anexo 2." />
        ) : (
          <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  <Th>Nº</Th>
                  <Th>Función</Th>
                  <Th>Nombre</Th>
                  <Th>Nivel de estudio</Th>
                  <Th>Titulación académica</Th>
                </tr>
              </thead>
              <tbody>
                {anexo2Sugerido.map((row, i) => {
                  const asignadoId = asignaciones[i] ?? "";
                  const tecnicoAsignado = tecnicos.find((t) => t.id === asignadoId);
                  const tituloNoCoincide =
                    tecnicoAsignado &&
                    row.titulacionAcademica &&
                    tecnicoAsignado.tituloAcademico &&
                    !tituloCoincide(tecnicoAsignado.tituloAcademico, row.titulacionAcademica);

                  return (
                    <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <Td muted>{i + 1}</Td>
                      <Td>{row.funcion || "—"}</Td>
                      <Td>
                        {onAssignTecnico ? (
                          tecnicos.length === 0 ? (
                            <span className="italic" style={{ color: "var(--text-tertiary)" }}>
                              (por completar)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select
                                value={asignadoId}
                                onChange={(e) => onAssignTecnico(i, e.target.value)}
                                className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                              >
                                <option value="" style={{ color: "black" }}>
                                  (por completar)
                                </option>
                                {tecnicos.map((t) => (
                                  <option key={t.id} value={t.id} style={{ color: "black" }}>
                                    {t.nombre}
                                  </option>
                                ))}
                              </select>
                              {tituloNoCoincide && (
                                <span className="text-[11px]" style={{ color: "var(--danger)" }}>
                                  Título del técnico no coincide con el requerido
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="italic" style={{ color: "var(--text-tertiary)" }}>
                            (por completar)
                          </span>
                        )}
                      </Td>
                      <Td>{row.nivelEstudio || "—"}</Td>
                      <Td>{row.titulacionAcademica || "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPreview && (
        <div
          className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowPreview(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="print-modal-shell flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Vista previa — Anexo 2
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescargarPdf}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Descargar PDF
                </button>
                <button
                  onClick={handleDescargarWord}
                  disabled={exportingWord}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  {exportingWord ? "Generando…" : "Descargar Word"}
                </button>
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{
                    borderColor: editMode ? "var(--accent)" : "var(--border)",
                    color: editMode ? "var(--accent-hover)" : "var(--text-secondary)",
                  }}
                >
                  {editMode ? "Terminar edición" : "Editar todo"}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  aria-label="Cerrar"
                  className="rounded px-2 py-1 text-sm hover:bg-white/5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="print-modal-scroll min-h-0 flex-1 overflow-auto p-4">
              {exportError && (
                <p className="mb-3 text-xs print:hidden" style={{ color: "var(--danger)" }}>
                  {exportError}
                </p>
              )}
              <Anexo2Preview
                filas={anexo2Sugerido}
                tecnicos={tecnicos}
                asignaciones={asignaciones}
                overrides={anexo2Overrides}
                firma={anexo2Firma}
                editable={editMode}
                onOverrideChange={onAnexo2OverrideChange}
                onFirmaChange={onAnexo2FirmaChange}
              />
              {editMode && (
                <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Los cambios se guardan automáticamente al salir de cada campo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <hr style={{ borderColor: "var(--border)" }} />

      {/* Bloque C: Anexo 3 */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
            >
              3
            </span>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Campos sugeridos — Anexo 3: Experiencia del Personal Técnico
            </h1>
          </div>
          {anexo3Sugerido.length > 0 && (
            <button
              onClick={() => setShowPreviewAnexo3(true)}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Vista previa Anexo 3
            </button>
          )}
        </div>

        {anexo3Sugerido.length === 0 ? (
          <EmptyState message="No se identificaron requisitos de experiencia para el Anexo 3." />
        ) : (
          <div className="flex flex-col gap-3">
            {anexo3Sugerido.map((row, i) => {
              const tecnicoAsignado = tecnicos.find((t) => t.id === asignaciones[i]);
              const proyectoIds = anexo3Proyectos[i] ?? [];

              return (
                <div
                  key={i}
                  data-testid={`anexo3-row-${i}`}
                  className="rounded-md border p-3.5"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {row.personal || `Perfil ${i + 1}`}
                    </span>
                    {tecnicoAsignado && (
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
                      >
                        {tecnicoAsignado.nombre}
                      </span>
                    )}
                  </div>
                  <dl className="mb-3 text-xs">
                    <dt className="mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Requisito de experiencia
                    </dt>
                    <dd style={{ color: "var(--text-primary)" }}>{row.requisitoExperiencia || "—"}</dd>
                  </dl>

                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Proyectos que acreditan esta experiencia
                  </div>
                  {proyectos.length === 0 ? (
                    <p className="mt-1 text-xs italic" style={{ color: "var(--text-tertiary)" }}>
                      Aún no hay proyectos en el roster — agrégalos con el botón &quot;Proyectos&quot;.
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {proyectos.map((p) => {
                        const checked = proyectoIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs"
                            style={{
                              borderColor: checked ? "var(--accent)" : "var(--border-subtle)",
                              background: checked ? "var(--accent-soft)" : "transparent",
                              color: checked ? "var(--accent-hover)" : "var(--text-secondary)",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? proyectoIds.filter((id) => id !== p.id)
                                  : [...proyectoIds, p.id];
                                onAnexo3ProyectosChange?.(i, next);
                              }}
                            />
                            {p.cliente}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showPreviewAnexo3 && (
        <div
          className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowPreviewAnexo3(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="print-modal-shell flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Vista previa — Anexo 3
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescargarPdf}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Descargar PDF
                </button>
                <button
                  onClick={handleDescargarWordAnexo3}
                  disabled={exportingWordAnexo3}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  {exportingWordAnexo3 ? "Generando…" : "Descargar Word"}
                </button>
                <button
                  onClick={() => setEditModeAnexo3((v) => !v)}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{
                    borderColor: editModeAnexo3 ? "var(--accent)" : "var(--border)",
                    color: editModeAnexo3 ? "var(--accent-hover)" : "var(--text-secondary)",
                  }}
                >
                  {editModeAnexo3 ? "Terminar edición" : "Editar todo"}
                </button>
                <button
                  onClick={() => setShowPreviewAnexo3(false)}
                  aria-label="Cerrar"
                  className="rounded px-2 py-1 text-sm hover:bg-white/5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="print-modal-scroll min-h-0 flex-1 overflow-auto p-4">
              {exportErrorAnexo3 && (
                <p className="mb-3 text-xs print:hidden" style={{ color: "var(--danger)" }}>
                  {exportErrorAnexo3}
                </p>
              )}
              <Anexo3Preview
                anexo2Filas={anexo2Sugerido}
                anexo3Filas={anexo3Sugerido}
                tecnicos={tecnicos}
                proyectos={proyectos}
                asignaciones={asignaciones}
                proyectosPorFila={anexo3Proyectos}
                overrides={anexo3Overrides}
                tecnicoOverrides={anexo3TecnicoOverrides}
                firma={anexo3Firma}
                editable={editModeAnexo3}
                onOverrideChange={onAnexo3OverrideChange}
                onTecnicoOverrideChange={onAnexo3TecnicoOverrideChange}
                onFirmaChange={onAnexo3FirmaChange}
              />
              {editModeAnexo3 && (
                <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Los cambios se guardan automáticamente al salir de cada campo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FechaClaveItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </dt>
      <dd
        className={`text-sm font-medium ${value ? "" : "italic"}`}
        style={{ color: value ? "var(--text-primary)" : "var(--text-tertiary)" }}
      >
        {value || "No especificada"}
      </dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.04em] uppercase"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  muted,
  italic,
}: {
  children: React.ReactNode;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 align-top ${italic ? "italic" : ""}`}
      style={{ color: muted ? "var(--text-tertiary)" : "var(--text-primary)" }}
    >
      {children}
    </td>
  );
}
