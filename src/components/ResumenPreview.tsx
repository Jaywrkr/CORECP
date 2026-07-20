"use client";

import type { Anexo2Fila, Anexo3ProyectosMap, ExtractionResult } from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { AZUL_BORDE, AZUL_TITULO, FIRMA_DEFAULT, FONT_FAMILY } from "@/lib/anexo2Shared";
import { buscarCoincidenciaTT2 } from "@/lib/cpcTT2";

interface ResumenPreviewProps {
  result: ExtractionResult;
  numeroProceso?: string;
  nombreProyecto?: string | null;
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  anexo3Proyectos: Anexo3ProyectosMap;
}

const FS = {
  titulo1: "24px",
  titulo2: "19px",
  body: "14px",
  tabla: "12px",
  membrete: "11px",
};

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
  return tecnico?.nombre || fila.nombre || "(sin asignar)";
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
      {children}
    </h2>
  );
}

function AlertaItem({ label, requerido, detalle }: { label: string; requerido: boolean; detalle: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-2" style={{ borderColor: "#eee" }}>
      <div className="flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-bold"
          style={{
            background: requerido ? "#FCE8E6" : "#E6F4EA",
            color: requerido ? "#B3261E" : "#1E7E34",
          }}
        >
          {requerido ? "SÍ" : "NO"}
        </span>
        <span className="font-semibold" style={{ fontSize: FS.body }}>
          {label}
        </span>
      </div>
      {detalle && (
        <p className="pl-1" style={{ fontSize: FS.tabla, color: "#555" }}>
          {detalle}
        </p>
      )}
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
  const coincidenciasTT2 = codigosCpc
    .map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) }))
    .filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  return (
    <div
      id="resumen-print-area"
      className="flex flex-col gap-5 rounded-md p-8"
      style={{ background: "#ffffff", color: "#000000", fontFamily: FONT_FAMILY, fontSize: FS.body }}
    >
      <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "#ccc" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served from /public, not optimizable content */}
        <img src="/coresolutions-logo.png" alt="CORESOLUTIONS" className="h-9 w-auto" />
        <div className="text-right leading-snug" style={{ color: "#333", fontSize: FS.membrete }}>
          <p>{FIRMA_DEFAULT.encabezadoDireccion}</p>
          <p>{FIRMA_DEFAULT.encabezadoTelefonos}</p>
          <p>{FIRMA_DEFAULT.encabezadoEmail}</p>
        </div>
      </div>

      <h1
        className="pb-1.5 font-bold"
        style={{ color: AZUL_TITULO, borderBottom: `1px solid ${AZUL_BORDE}`, fontSize: FS.titulo1 }}
      >
        RESUMEN DEL PROCESO
      </h1>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" style={{ fontSize: FS.body }}>
        <p>
          <span className="font-semibold">Cliente: </span>
          {identificacion.cliente || "—"}
        </p>
        <p>
          <span className="font-semibold">Objeto de contratación: </span>
          {identificacion.descripcion || "—"}
        </p>
        {numeroProceso && (
          <p>
            <span className="font-semibold">Número de proceso: </span>
            {numeroProceso}
          </p>
        )}
        {nombreProyecto && (
          <p>
            <span className="font-semibold">Nombre de proyecto: </span>
            {nombreProyecto}
          </p>
        )}
      </div>

      <div>
        <SectionHeading>Fechas clave</SectionHeading>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" style={{ fontSize: FS.body }}>
          <p>
            <span className="font-semibold">Presentación de oferta: </span>
            {fechasClave.presentacionOferta || "No especificada"}
          </p>
          <p>
            <span className="font-semibold">Puja / subasta inversa: </span>
            {fechasClave.puja || "No especificada"}
          </p>
          <p>
            <span className="font-semibold">Adjudicación: </span>
            {fechasClave.adjudicacion || "No especificada"}
          </p>
        </div>
      </div>

      <div>
        <SectionHeading>Equipo técnico propuesto</SectionHeading>
        {anexo2Sugerido.length === 0 ? (
          <p className="italic" style={{ color: "#888" }}>
            No se detectaron perfiles de personal técnico.
          </p>
        ) : (
          <table className="w-full min-w-[560px] border-collapse" style={{ fontSize: FS.tabla }}>
            <thead>
              <tr>
                {["Función", "Técnico asignado", "Nivel de estudio", "Titulación académica"].map((h) => (
                  <th key={h} className="border p-1.5 text-left font-bold" style={{ borderColor: "#ccc" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anexo2Sugerido.map((fila, i) => (
                <tr key={i}>
                  <td className="border p-1.5" style={{ borderColor: "#ccc" }}>
                    {fila.funcion}
                  </td>
                  <td className="border p-1.5" style={{ borderColor: "#ccc" }}>
                    {nombreTecnicoAsignado(fila, i, tecnicos, asignaciones)}
                  </td>
                  <td className="border p-1.5" style={{ borderColor: "#ccc" }}>
                    {fila.nivelEstudio}
                  </td>
                  <td className="border p-1.5" style={{ borderColor: "#ccc" }}>
                    {fila.titulacionAcademica}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <SectionHeading>Requerimientos detectados</SectionHeading>
        <div className="flex flex-col gap-3">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const items = requisitos[key];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <p className="mb-1 font-semibold" style={{ fontSize: FS.body }}>
                  {label}
                </p>
                <ul className="flex flex-col gap-0.5 pl-4" style={{ fontSize: FS.tabla, listStyle: "disc" }}>
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          {CATEGORY_LABELS.every(({ key }) => requisitos[key].length === 0) && (
            <p className="italic" style={{ color: "#888" }}>
              No se detectaron requisitos de personal técnico.
            </p>
          )}
        </div>
      </div>

      <div>
        <SectionHeading>Entregables y obligaciones del oferente</SectionHeading>
        <div className="flex flex-col gap-2">
          <AlertaItem
            label="Cronograma de implementación"
            requerido={alertas?.cronograma.requerido ?? false}
            detalle={alertas?.cronograma.detalle ?? ""}
          />
          <AlertaItem
            label="Transferencia de tecnología — Nivel TT2"
            requerido={requiereTT2}
            detalle={
              codigosCpc.length === 0
                ? "No se detectó código CPC en el pliego — verificar manualmente."
                : requiereTT2
                  ? `Código(s) CPC detectado(s) que coinciden con la Tabla 2 de SERCOP: ${coincidenciasTT2
                      .map((c) => `${c.codigo} (${c.match?.descripcion})`)
                      .join("; ")}. Verificar contra el listado oficial vigente de SERCOP antes de ofertar.`
                  : `Código(s) CPC detectado(s): ${codigosCpc.join(", ")} — ninguno coincide con la Tabla 2 transcrita. Verificar contra el listado oficial de SERCOP.`
            }
          />
          <AlertaItem
            label="Entrega de manuales"
            requerido={alertas?.manuales.requerido ?? false}
            detalle={alertas?.manuales.detalle ?? ""}
          />
        </div>
      </div>

      <div>
        <SectionHeading>Documentación de respaldo (proyectos vinculados)</SectionHeading>
        {proyectosVinculados.length === 0 ? (
          <p className="italic" style={{ color: "#888" }}>
            Aún no hay proyectos vinculados a ningún perfil del Anexo 3.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5" style={{ fontSize: FS.tabla }}>
            {proyectosVinculados.map((proyecto, i) => (
              <li key={proyecto.id}>
                {i + 1}. {proyecto.cliente} - {proyecto.descripcionCorta}
                {" — "}
                Acta: {proyecto.archivoActaEntrega?.nombre || "(sin archivo)"}; Certificado:{" "}
                {proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"}
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="border-t pt-2 italic" style={{ borderColor: "#eee", fontSize: FS.tabla, color: "#888" }}>
        Este resumen no incluye especificaciones técnicas de producto/marca — consulta el pliego original
        para ese detalle. Generado automáticamente a partir del análisis del proceso; revisa cada punto
        antes de presentar la oferta.
      </p>
    </div>
  );
}
