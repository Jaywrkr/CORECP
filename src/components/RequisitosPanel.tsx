"use client";

import { Fragment, useState } from "react";
import type { Anexo3ProyectosMap, ExtractionResult, ExtractionStatus } from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import ResumenPreview from "./ResumenPreview";
import { tituloCoincide } from "@/lib/tituloCoincide";
import { buscarCoincidenciaTT2 } from "@/lib/cpcTT2";
import { requisitoGrisDePerfil } from "@/lib/anexo3Shared";
import { descargarBlob } from "@/lib/exportarAnexo2Docx";
import { generarResumenDocx } from "@/lib/exportarResumenDocx";

interface RequisitosPanelProps {
  status: ExtractionStatus;
  result: ExtractionResult | null;
  error: string | null;
  onRetry?: () => void;
  documentCount?: number;
  progressLabel?: string | null;
  numeroProceso?: string;
  nombreProyecto?: string | null;
  tecnicos?: Tecnico[];
  proyectos?: Proyecto[];
  asignaciones?: Record<number, string>;
  onAssignTecnico?: (rowIndex: number, tecnicoId: string) => void;
  anexo3Proyectos?: Anexo3ProyectosMap;
  onAnexo3ProyectosChange?: (rowIndex: number, proyectoIds: string[]) => void;
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
  numeroProceso,
  nombreProyecto,
  tecnicos = [],
  proyectos = [],
  asignaciones = {},
  onAssignTecnico,
  anexo3Proyectos = {},
  onAnexo3ProyectosChange,
}: RequisitosPanelProps) {
  const [showResumen, setShowResumen] = useState(false);
  const [exportingWordResumen, setExportingWordResumen] = useState(false);
  const [exportErrorResumen, setExportErrorResumen] = useState<string | null>(null);

  const handleDescargarPdf = () => window.print();

  const handleDescargarWordResumen = async () => {
    if (!result) return;
    setExportingWordResumen(true);
    setExportErrorResumen(null);
    try {
      const blob = await generarResumenDocx({ result, numeroProceso, nombreProyecto });
      descargarBlob(blob, "Resumen_del_Proceso.docx");
    } catch (err) {
      setExportErrorResumen(err instanceof Error ? err.message : "No se pudo generar el archivo Word.");
    } finally {
      setExportingWordResumen(false);
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

  const { requisitos, fechasClave, anexo2Sugerido, anexo3Sugerido, alertas } = result;
  const hasAnyRequisitos = CATEGORY_LABELS.some((c) => requisitos[c.key].length > 0);
  const hasFechasClave =
    !!fechasClave && (fechasClave.presentacionOferta || fechasClave.puja || fechasClave.adjudicacion);

  const codigosCpc = alertas?.codigosCpc ?? [];
  const coincidenciasTT2 = codigosCpc
    .map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) }))
    .filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  return (
    <div className="flex flex-col gap-8 px-5 py-5">
      {documentCount > 1 && (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Análisis consolidado de {documentCount} documentos — la información repetida entre archivos
          se combinó en una sola vista.
        </p>
      )}

      <div>
        <button
          onClick={() => setShowResumen(true)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Resumen del proceso
        </button>
      </div>

      {alertas && (
        <section
          className="rounded-md border p-4"
          style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}
        >
          <h2
            className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: "var(--danger)" }}
          >
            Alertas del proceso
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AlertaClaveItem label="Cronograma de implementación" requerido={alertas.cronograma.requerido} detalle={alertas.cronograma.detalle} />
            <AlertaClaveItem
              label="Transferencia de tecnología (TT2)"
              requerido={requiereTT2}
              detalle={
                codigosCpc.length === 0
                  ? "No se detectó código CPC en el pliego."
                  : requiereTT2
                    ? `CPC ${coincidenciasTT2.map((c) => c.codigo).join(", ")} coincide con la Tabla 2 de SERCOP.`
                    : `CPC ${codigosCpc.join(", ")} no coincide con la Tabla 2 transcrita — verificar manualmente.`
              }
            />
            <AlertaClaveItem label="Entrega de manuales" requerido={alertas.manuales.requerido} detalle={alertas.manuales.detalle} />
          </dl>
        </section>
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
        </div>

        {anexo3Sugerido.length === 0 ? (
          <EmptyState message="No se identificaron requisitos de experiencia para el Anexo 3." />
        ) : (
          <div className="flex flex-col gap-6">
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

            <div>
              <SectionTitle>Tabla del Anexo 3 — Experiencia del Personal Técnico</SectionTitle>
              <Anexo3TablaConsolidada
                anexo3Sugerido={anexo3Sugerido}
                anexo2Sugerido={anexo2Sugerido}
                tecnicos={tecnicos}
                proyectos={proyectos}
                asignaciones={asignaciones}
                anexo3Proyectos={anexo3Proyectos}
              />
            </div>
          </div>
        )}
      </section>

      {showResumen && (
        <div
          className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowResumen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="print-modal-shell flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Resumen del proceso
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
                  onClick={handleDescargarWordResumen}
                  disabled={exportingWordResumen}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  {exportingWordResumen ? "Generando…" : "Descargar Word"}
                </button>
                <button
                  onClick={() => setShowResumen(false)}
                  aria-label="Cerrar"
                  className="rounded px-2 py-1 text-sm hover:bg-white/5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="print-modal-scroll min-h-0 flex-1 overflow-auto p-4">
              {exportErrorResumen && (
                <p className="mb-3 text-xs print:hidden" style={{ color: "var(--danger)" }}>
                  {exportErrorResumen}
                </p>
              )}
              <ResumenPreview result={result} numeroProceso={numeroProceso} nombreProyecto={nombreProyecto} />
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

function AlertaClaveItem({ label, requerido, detalle }: { label: string; requerido: boolean; detalle: string }) {
  return (
    <div>
      <dt className="mb-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <span
          className="rounded px-1 py-0.5 text-[10px] font-bold"
          style={{
            background: requerido ? "var(--danger-soft)" : "rgba(74, 222, 128, 0.12)",
            color: requerido ? "var(--danger)" : "var(--success)",
          }}
        >
          {requerido ? "SÍ" : "NO"}
        </span>
        {label}
      </dt>
      <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
        {detalle || (requerido ? "Sin más detalle en el texto." : "No se detectó este requisito.")}
      </dd>
    </div>
  );
}

function Anexo3TablaConsolidada({
  anexo3Sugerido,
  anexo2Sugerido,
  tecnicos,
  proyectos,
  asignaciones,
  anexo3Proyectos,
}: {
  anexo3Sugerido: ExtractionResult["anexo3Sugerido"];
  anexo2Sugerido: ExtractionResult["anexo2Sugerido"];
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  anexo3Proyectos: Anexo3ProyectosMap;
}) {
  // La fila gris replica el formato del pliego: un título numerado con el
  // nombre del perfil ("1.1.  Especialista técnico en...") y, debajo, el
  // párrafo del requisito de experiencia ("Se deberá acreditar...").
  const requisitoGris = (i: number) =>
    requisitoGrisDePerfil(
      i,
      anexo2Sugerido[i]?.funcion,
      anexo3Sugerido[i]?.personal,
      anexo3Sugerido[i]?.requisitoExperiencia,
    );

  return (
    <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr style={{ background: "var(--bg-elevated)" }}>
            <Th>Personal</Th>
            <Th>Cliente – Fecha de entrega / Factura</Th>
            <Th>Proyecto</Th>
            <Th>Monto</Th>
          </tr>
        </thead>
        <tbody>
          {anexo3Sugerido.map((_, i) => {
            // El nombre del técnico se llena automáticamente con quien se haya
            // asignado a este perfil en la tabla del Anexo 2 (punto 2).
            const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
            const filas = (anexo3Proyectos[i] ?? [])
              .map((id) => proyectos.find((p) => p.id === id))
              .filter((p): p is Proyecto => Boolean(p));

            const nombreCelda = tecnico ? (
              tecnico.nombre
            ) : (
              <span className="italic" style={{ color: "var(--text-tertiary)" }}>
                (asignar técnico en el punto 2)
              </span>
            );

            return (
              <Fragment key={i}>
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-[13px]"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {(() => {
                      const { titulo, requisito } = requisitoGris(i);
                      return (
                        <>
                          <span className="font-semibold">{titulo}</span>
                          {requisito ? (
                            <span className="mt-1 block font-normal" style={{ color: "var(--text-secondary)" }}>
                              {requisito}
                            </span>
                          ) : null}
                        </>
                      );
                    })()}
                  </td>
                </tr>
                {filas.length === 0 ? (
                  <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <Td>{nombreCelda}</Td>
                    <Td italic muted>
                      (vincula proyectos con las casillas de arriba)
                    </Td>
                    <Td muted>—</Td>
                    <Td muted>—</Td>
                  </tr>
                ) : (
                  filas.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <Td>{nombreCelda}</Td>
                      <Td>
                        {p.cliente}
                        {p.fechaActaEntrega ? (
                          <span className="block text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            Acta de entrega: {p.fechaActaEntrega}
                          </span>
                        ) : null}
                      </Td>
                      <Td>{p.descripcionProyecto || p.descripcionCorta || "—"}</Td>
                      <Td>{p.monto || "—"}</Td>
                    </tr>
                  ))
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
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
