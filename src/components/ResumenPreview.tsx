"use client";

import type { ExtractionResult } from "@/types/extraction";
import { buscarCoincidenciaTT2 } from "@/lib/cpcTT2";
import { formatFechaLarga } from "@/lib/formatFechaLarga";

interface ResumenPreviewProps {
  result: ExtractionResult;
  numeroProceso?: string;
  nombreProyecto?: string | null;
}

// Documento standalone, deliberadamente sin el membrete/plantilla formal de
// Coresolutions (esa es la de los Anexos) — este es el "resumen ejecutivo y
// checklist de cumplimiento" de TODO el proceso (alcance, aclaraciones
// técnicas clave, infraestructura existente, condiciones económicas, reglas
// de participación...), no del personal técnico ni su experiencia, que ya
// cubren el Anexo 2 y el Anexo 3 por separado.
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: BORDER, background: "#ffffff" }} data-break-inside-avoid>
      {children}
    </div>
  );
}

function Seccion({ icon, titulo, numero, children }: { icon: string; titulo: string; numero: number; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold"
          style={{ background: ACCENT_SOFT, color: ACCENT }}
        >
          {numero}
        </span>
        <span aria-hidden style={{ fontSize: "15px" }}>
          {icon}
        </span>
        <h2 className="text-[13px] font-bold tracking-wide uppercase" style={{ color: INK }}>
          {titulo}
        </h2>
      </div>
      {children}
    </Card>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] italic" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function DatoChip({ label, value }: { label: string; value: string }) {
  const set = Boolean(value);
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: BORDER, background: SURFACE }}>
      <p className="mb-0.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color: MUTED }}>
        {label}
      </p>
      <p className="text-[13px] font-medium" style={{ color: set ? INK : MUTED, fontStyle: set ? "normal" : "italic" }}>
        {value || "No especificado"}
      </p>
    </div>
  );
}

function ListaChips({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) return <Vacio>{vacio}</Vacio>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: INK }}>
          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ListaChecklist({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) return <Vacio>{vacio}</Vacio>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2 rounded-lg border p-2.5 text-[13px]"
          style={{ borderColor: BORDER, background: SURFACE, color: INK }}
        >
          <span aria-hidden style={{ color: MUTED }}>
            ☐
          </span>
          {item}
        </li>
      ))}
    </ul>
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

export default function ResumenPreview({ result, numeroProceso, nombreProyecto }: ResumenPreviewProps) {
  const { fechasClave, identificacion, alertas, informacionGeneral: info, resumenEjecutivo: r } = result;

  const codigosCpc = alertas?.codigosCpc ?? [];
  const coincidenciasTT2 = codigosCpc.map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) })).filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  let seccionContador = 0;
  const n = () => ++seccionContador;

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
            Resumen ejecutivo y checklist de cumplimiento
          </p>
          <h1 className="text-[22px] leading-tight font-bold" style={{ color: INK }}>
            {identificacion.descripcion || "Proceso sin descripción"}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
            {identificacion.cliente || "Cliente no identificado"}
            {numeroProceso ? ` · ${numeroProceso}` : ""}
            {nombreProyecto ? ` · ${nombreProyecto}` : ""}
          </p>
          {r?.objetivo && (
            <p className="mt-2 text-[12.5px] italic" style={{ color: MUTED }}>
              {r.objetivo}
            </p>
          )}
        </div>
        <p className="shrink-0 text-right text-[11px]" style={{ color: MUTED }}>
          Generado el {formatFechaLarga()}
        </p>
      </div>

      <Seccion icon="🏢" titulo="Información general" numero={n()}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <DatoChip label="Entidad" value={r?.entidadContratante || identificacion.cliente} />
          {numeroProceso && <DatoChip label="Proceso" value={numeroProceso} />}
          <DatoChip label="Modalidad" value={info?.modalidadContratacion ?? ""} />
          <DatoChip label="Objeto" value={identificacion.descripcion} />
          <DatoChip label="Presupuesto referencial" value={info?.presupuestoReferencial ?? ""} />
          <DatoChip label="Plazo de ejecución" value={info?.plazoEjecucion ?? ""} />
          <DatoChip label="Forma de pago" value={info?.formaDePago ?? ""} />
          <DatoChip label="Anticipo" value={info?.anticipo ?? ""} />
          <DatoChip label="Vigencia de la oferta" value={info?.vigenciaOferta ?? ""} />
          <DatoChip label="Lugar de entrega / ejecución" value={info?.lugarEntrega ?? ""} />
        </div>
      </Seccion>

      <Seccion icon="📅" titulo="Cronograma" numero={n()}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <DatoChip label="Presentación de oferta" value={fechasClave.presentacionOferta} />
          <DatoChip label="Puja / subasta inversa" value={fechasClave.puja} />
          <DatoChip label="Adjudicación" value={fechasClave.adjudicacion} />
        </div>
      </Seccion>

      <Seccion icon="📦" titulo="Alcance del proyecto" numero={n()}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold" style={{ color: INK }}>
              Equipos / bienes
            </p>
            <ListaChecklist items={r?.alcanceEquipos ?? []} vacio="No se detectaron bienes/equipos en el alcance." />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold" style={{ color: INK }}>
              Servicios incluidos
            </p>
            <ListaChips items={r?.alcanceServicios ?? []} vacio="No se detectaron servicios en el alcance." />
          </div>
        </div>
      </Seccion>

      {(r?.requisitosClave.length ?? 0) > 0 && (
        <Seccion icon="🔑" titulo="Requisitos técnicos clave" numero={n()}>
          <div className="flex flex-col gap-4">
            {r?.requisitosClave.map((req, i) => (
              <div key={i}>
                <p className="mb-1 text-[13px] font-semibold" style={{ color: INK }}>
                  {req.titulo}
                </p>
                <ul className="flex flex-col gap-1">
                  {req.puntos.map((punto, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12.5px]" style={{ color: INK }}>
                      <span aria-hidden style={{ color: GREEN }}>
                        ✔
                      </span>
                      {punto}
                    </li>
                  ))}
                </ul>
                {req.referencia && (
                  <p className="mt-1 text-[11px] italic" style={{ color: MUTED }}>
                    Referencia: {req.referencia}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {(r?.infraestructuraExistente.length ?? 0) > 0 && (
        <Seccion icon="🖥️" titulo="Infraestructura existente" numero={n()}>
          <p className="mb-2 text-[12.5px]" style={{ color: MUTED }}>
            La entidad ya cuenta con lo siguiente — no ofertarlo de más:
          </p>
          <ListaChips items={r?.infraestructuraExistente ?? []} vacio="" />
        </Seccion>
      )}

      <Seccion icon="🛡️" titulo="Garantías y multas" numero={n()}>
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] font-semibold" style={{ color: INK }}>
            Garantías exigidas
          </p>
          <ListaChips items={info?.garantias ?? []} vacio="No se detectaron garantías exigidas en el pliego." />
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold" style={{ color: INK }}>
            Multas
          </p>
          <p className="text-[13px]" style={{ color: info?.multas ? INK : MUTED, fontStyle: info?.multas ? "normal" : "italic" }}>
            {info?.multas || "No se detectaron condiciones de multas en el pliego."}
          </p>
        </div>
      </Seccion>

      <Seccion icon="✅" titulo="Requisitos habilitantes" numero={n()}>
        <ListaChips items={info?.requisitosHabilitantes ?? []} vacio="No se detectaron requisitos habilitantes específicos en el pliego." />
      </Seccion>

      <Seccion icon="⚖️" titulo="Criterios de evaluación de ofertas" numero={n()}>
        <ListaChips items={info?.criteriosEvaluacion ?? []} vacio="No se detectó una metodología de evaluación explícita en el pliego." />
      </Seccion>

      <Seccion icon="📄" titulo="Documentación requerida" numero={n()}>
        <ListaChips items={r?.documentacionRequerida ?? []} vacio="No se detectaron documentos de sustento específicos en el pliego." />
      </Seccion>

      <Seccion icon="⚠️" titulo="Entregables y obligaciones del oferente" numero={n()}>
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
      </Seccion>

      <Seccion icon="📋" titulo="Checklist de cumplimiento" numero={n()}>
        <ListaChecklist items={r?.checklist ?? []} vacio="No se generó un checklist específico para este proceso." />
      </Seccion>

      <Seccion icon="🗒️" titulo="Observaciones importantes" numero={n()}>
        <ListaChips items={r?.observaciones ?? []} vacio="No hay observaciones adicionales." />
      </Seccion>

      <p className="pt-1 text-[11px] italic" style={{ color: MUTED }}>
        Este resumen cubre el proceso en general — no incluye el detalle de personal técnico ni su
        experiencia, que están en el Anexo 2 y el Anexo 3, ni especificaciones técnicas de producto/marca.
        Generado automáticamente a partir del análisis del proceso; revisa cada punto antes de presentar la
        oferta.
      </p>
    </div>
  );
}
