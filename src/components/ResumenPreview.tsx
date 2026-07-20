"use client";

import type { Anexo2Fila, Anexo3ProyectosMap, ExtractionResult } from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { buscarCoincidenciaTT2 } from "@/lib/cpcTT2";
import { formatFechaLarga } from "@/lib/formatFechaLarga";

interface ResumenPreviewProps {
  result: ExtractionResult;
  numeroProceso?: string;
  nombreProyecto?: string | null;
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  anexo3Proyectos: Anexo3ProyectosMap;
}

// Documento standalone, deliberadamente sin el membrete/plantilla formal de
// Coresolutions (esa es la de los Anexos) — este es un resumen interno de
// lectura rápida, con su propia identidad visual tipo dashboard.
const FONT_MODERNA = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";
const ACCENT = "#4F46E5";
const ACCENT_SOFT = "#EEF2FF";
const INK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFC";
const GREEN = "#16A34A";
const GREEN_SOFT = "#F0FDF4";
const RED = "#DC2626";
const RED_SOFT = "#FEF2F2";

const CATEGORY_LABELS: { key: keyof ExtractionResult["requisitos"]; label: string }[] = [
  { key: "personal", label: "Personal técnico requerido" },
  { key: "nivelAcademico", label: "Nivel académico exigido" },
  { key: "titulacion", label: "Titulación específica requerida" },
  { key: "certificaciones", label: "Certificaciones técnicas exigidas" },
  { key: "experiencia", label: "Experiencia mínima requerida" },
  { key: "otros", label: "Otros requisitos relevantes" },
];

function nombreTecnicoAsignado(fila: Anexo2Fila, rowIndex: number, tecnicos: Tecnico[], asignaciones: Record<number, string>): string {
  const tecnico = tecnicos.find((t) => t.id === asignaciones[rowIndex]);
  return tecnico?.nombre || fila.nombre || "Sin asignar";
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: BORDER, background: "#ffffff" }} data-break-inside-avoid>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span aria-hidden style={{ fontSize: "16px" }}>
        {icon}
      </span>
      <h2 className="text-[13px] font-bold tracking-wide uppercase" style={{ color: INK }}>
        {children}
      </h2>
    </div>
  );
}

function StatChip({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "danger" }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border px-3 py-2.5"
      style={{ borderColor: tone === "danger" ? "#FCA5A5" : BORDER, background: tone === "danger" ? RED_SOFT : SURFACE }}
    >
      <span className="text-[20px] leading-none font-bold" style={{ color: tone === "danger" ? RED : INK }}>
        {value}
      </span>
      <span className="text-[11px]" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

function FechaChip({ label, value }: { label: string; value: string }) {
  const set = Boolean(value);
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: BORDER, background: SURFACE }}>
      <p className="mb-0.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color: MUTED }}>
        {label}
      </p>
      <p className="text-[13px] font-medium" style={{ color: set ? INK : MUTED, fontStyle: set ? "normal" : "italic" }}>
        {value || "No especificada"}
      </p>
    </div>
  );
}

function AlertaCard({ label, requerido, detalle }: { label: string; requerido: boolean; detalle: string }) {
  const color = requerido ? RED : GREEN;
  const soft = requerido ? RED_SOFT : GREEN_SOFT;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3.5" style={{ borderColor: requerido ? "#FCA5A5" : "#BBF7D0", background: soft }}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: color }}
        >
          {requerido ? "!" : "✓"}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: INK }}>
          {label}
        </span>
      </div>
      <p className="pl-7 text-[12px] leading-snug" style={{ color: MUTED }}>
        {detalle || (requerido ? "Sin más detalle en el texto del pliego." : "No se detectó este requisito en el pliego.")}
      </p>
    </div>
  );
}

export default function ResumenPreview({
  result,
  numeroProceso,
  nombreProyecto,
  tecnicos,
  proyectos,
  asignaciones,
  anexo3Proyectos,
}: ResumenPreviewProps) {
  const { requisitos, fechasClave, identificacion, anexo2Sugerido, alertas } = result;

  const proyectoIdsVinculados = Array.from(new Set(Object.values(anexo3Proyectos).flat()));
  const proyectosVinculados = proyectoIdsVinculados
    .map((id) => proyectos.find((p) => p.id === id))
    .filter((p): p is Proyecto => Boolean(p));

  const codigosCpc = alertas?.codigosCpc ?? [];
  const coincidenciasTT2 = codigosCpc.map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) })).filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;
  const cantidadAlertasActivas = [alertas?.cronograma.requerido, requiereTT2, alertas?.manuales.requerido].filter(Boolean).length;
  const hayRequisitos = CATEGORY_LABELS.some(({ key }) => requisitos[key].length > 0);

  return (
    <div
      id="resumen-print-area"
      className="flex flex-col gap-4 rounded-md p-8"
      style={{ background: "#ffffff", color: INK, fontFamily: FONT_MODERNA, fontSize: "14px" }}
    >
      {/* Encabezado propio del resumen — sin membrete de Coresolutions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: ACCENT }}>
            Resumen del proceso
          </p>
          <h1 className="text-[22px] leading-tight font-bold" style={{ color: INK }}>
            {identificacion.descripcion || "Proceso sin descripción"}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {identificacion.cliente || "Cliente no identificado"}
            {numeroProceso ? ` · ${numeroProceso}` : ""}
            {nombreProyecto ? ` · ${nombreProyecto}` : ""}
          </p>
        </div>
        <p className="shrink-0 text-right text-[11px]" style={{ color: MUTED }}>
          Generado el {formatFechaLarga()}
        </p>
      </div>

      {/* Vistazo rápido */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatChip label="Perfiles técnicos" value={anexo2Sugerido.length} />
        <StatChip label="Proyectos vinculados" value={proyectosVinculados.length} />
        <StatChip label="Requisitos detectados" value={CATEGORY_LABELS.reduce((n, { key }) => n + requisitos[key].length, 0)} />
        <StatChip label="Alertas activas" value={cantidadAlertasActivas} tone={cantidadAlertasActivas > 0 ? "danger" : "neutral"} />
      </div>

      <Card>
        <SectionTitle icon="📅">Fechas clave</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <FechaChip label="Presentación de oferta" value={fechasClave.presentacionOferta} />
          <FechaChip label="Puja / subasta inversa" value={fechasClave.puja} />
          <FechaChip label="Adjudicación" value={fechasClave.adjudicacion} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon="👥">Equipo técnico propuesto</SectionTitle>
        {anexo2Sugerido.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: MUTED }}>
            No se detectaron perfiles de personal técnico.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: BORDER }}>
            <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: SURFACE }}>
                  {["Función", "Técnico asignado", "Nivel de estudio", "Titulación académica"].map((h) => (
                    <th key={h} className="p-2.5 text-left font-semibold" style={{ color: MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {anexo2Sugerido.map((fila, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="p-2.5">{fila.funcion}</td>
                    <td className="p-2.5 font-medium">{nombreTecnicoAsignado(fila, i, tecnicos, asignaciones)}</td>
                    <td className="p-2.5">{fila.nivelEstudio}</td>
                    <td className="p-2.5">{fila.titulacionAcademica}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="📋">Requerimientos detectados</SectionTitle>
        {!hayRequisitos ? (
          <p className="text-[13px] italic" style={{ color: MUTED }}>
            No se detectaron requisitos de personal técnico.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {CATEGORY_LABELS.map(({ key, label }) => {
              const items = requisitos[key];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <p className="mb-1.5 text-[12px] font-semibold" style={{ color: INK }}>
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item, i) => (
                      <span
                        key={i}
                        className="rounded-md border px-2 py-1 text-[12px]"
                        style={{ borderColor: BORDER, background: ACCENT_SOFT, color: INK }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="⚠️">Entregables y obligaciones del oferente</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <AlertaCard
            label="Cronograma de implementación"
            requerido={alertas?.cronograma.requerido ?? false}
            detalle={alertas?.cronograma.detalle ?? ""}
          />
          <AlertaCard
            label="Transferencia de tecnología — TT2"
            requerido={requiereTT2}
            detalle={
              codigosCpc.length === 0
                ? "No se detectó código CPC en el pliego — verificar manualmente."
                : requiereTT2
                  ? `CPC ${coincidenciasTT2.map((c) => c.codigo).join(", ")} coincide con la Tabla 2 de SERCOP. Verificar contra el listado oficial vigente antes de ofertar.`
                  : `CPC ${codigosCpc.join(", ")} — ninguno coincide con la Tabla 2 transcrita. Verificar manualmente.`
            }
          />
          <AlertaCard label="Entrega de manuales" requerido={alertas?.manuales.requerido ?? false} detalle={alertas?.manuales.detalle ?? ""} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📎">Documentación de respaldo</SectionTitle>
        {proyectosVinculados.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: MUTED }}>
            Aún no hay proyectos vinculados a ningún perfil del Anexo 3.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {proyectosVinculados.map((proyecto, i) => (
              <li key={proyecto.id} className="rounded-lg border p-2.5 text-[12.5px]" style={{ borderColor: BORDER, background: SURFACE }}>
                <span className="font-semibold">
                  {i + 1}. {proyecto.cliente}
                </span>{" "}
                — {proyecto.descripcionCorta}
                <br />
                <span style={{ color: MUTED }}>
                  Acta: {proyecto.archivoActaEntrega?.nombre || "(sin archivo)"} · Certificado:{" "}
                  {proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="pt-1 text-[11px] italic" style={{ color: MUTED }}>
        No incluye especificaciones técnicas de producto/marca — consulta el pliego original para ese
        detalle. Generado automáticamente a partir del análisis del proceso; revisa cada punto antes de
        presentar la oferta.
      </p>
    </div>
  );
}
