"use client";

import type { ExtractionResult, ExtractionStatus } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";

interface RequisitosPanelProps {
  status: ExtractionStatus;
  result: ExtractionResult | null;
  error: string | null;
  onRetry?: () => void;
  documentCount?: number;
  progressLabel?: string | null;
  tecnicos?: Tecnico[];
  asignaciones?: Record<number, string>;
  onAssignTecnico?: (rowIndex: number, tecnicoId: string) => void;
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
  asignaciones = {},
  onAssignTecnico,
}: RequisitosPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Sube uno o más pliegos en la columna izquierda para comenzar el análisis.
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
        <div className="mb-4 flex items-center gap-2">
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
                    !tecnicoAsignado.tituloAcademico
                      .toLowerCase()
                      .includes(row.titulacionAcademica.toLowerCase()) &&
                    !row.titulacionAcademica
                      .toLowerCase()
                      .includes(tecnicoAsignado.tituloAcademico.toLowerCase());

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
        <div className="mb-4 flex items-center gap-2">
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

        {anexo3Sugerido.length === 0 ? (
          <EmptyState message="No se identificaron requisitos de experiencia para el Anexo 3." />
        ) : (
          <div className="flex flex-col gap-3">
            {anexo3Sugerido.map((row, i) => {
              const tecnicoAsignado = tecnicos.find((t) => t.id === asignaciones[i]);
              return (
              <div
                key={i}
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
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <dt className="mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Requisito de experiencia
                    </dt>
                    <dd style={{ color: "var(--text-primary)" }}>{row.requisitoExperiencia || "—"}</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-tertiary)" }}>Cliente - Fecha de Acta/Factura</dt>
                    <dd className="italic" style={{ color: "var(--text-tertiary)" }}>
                      (por completar)
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-tertiary)" }}>Proyecto</dt>
                    <dd className="italic" style={{ color: "var(--text-tertiary)" }}>
                      (por completar)
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-tertiary)" }}>Monto</dt>
                    <dd className="italic" style={{ color: "var(--text-tertiary)" }}>
                      (por completar)
                    </dd>
                  </div>
                </dl>
              </div>
              );
            })}
          </div>
        )}
      </section>
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
