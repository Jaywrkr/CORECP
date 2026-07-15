"use client";

import type { Anexo2Fila, Anexo2Firma, Anexo2Overrides, Anexo2OverridesMap } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import { formatFechaLarga } from "@/lib/formatFechaLarga";

interface Anexo2PreviewProps {
  filas: Anexo2Fila[];
  tecnicos: Tecnico[];
  asignaciones: Record<number, string>;
  overrides?: Anexo2OverridesMap;
  firma?: Anexo2Firma;
  editable?: boolean;
  onOverrideChange?: (rowIndex: number, field: keyof Anexo2Overrides, value: string) => void;
  onFirmaChange?: (field: keyof Anexo2Firma, value: string) => void;
}

const HEADERS = ["Nro", "Función", "Nombre", "Nivel de estudio", "Titulación académica"];
const COL_WIDTHS = ["5%", "24%", "19%", "21%", "31%"];

// Colores y tipografía tomados directamente de la plantilla oficial
// (Anexo_2_personal_tecnico.docx): título #1F4E79 con borde inferior
// #5B9BD5, encabezado de tabla #44546A con texto blanco, fuente Calibri.
const AZUL_TITULO = "#1F4E79";
const AZUL_BORDE = "#5B9BD5";
const NAVY_TABLA = "#44546A";
const FONT_FAMILY = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";

const FIRMA_DEFAULT: Required<Anexo2Firma> = {
  encabezadoDireccion: "Cuenca: Av. 3 de Noviembre 21-176 y Juan Pablo I",
  encabezadoTelefonos: "Teléfonos: +593 (07) 284-1495   (07) 284-3991",
  encabezadoEmail: "E-mail: gerencia@coresolutions.com.ec",
  introEmpresa:
    "Para asegurar que los servicios de implementación y soporte post-instalación sean oportunos y eficientes, CORESOLUTIONS cuenta con un equipo de consultores comerciales y especialistas técnicos certificados, para garantizar tiempos de respuesta oportunos, frente a requerimientos e incidentes críticos para resolución de problemas con profesionales expertos.",
  introTitulos:
    "Se indican a continuación los títulos académicos de los especialistas técnicos asignados al proyecto, según consulta realizada en https://www.senescyt.gob.ec/web/guest/consultas. Dicho documento incluye también la información correspondiente a certificados de riesgos laborales vigentes del personal técnico.",
  introCertificaciones:
    "A continuación, constan las certificaciones, con lo cual podemos garantizar el nivel de conocimientos requeridos y cumplir con lo solicitado en los pliegos.",
  representanteNombre: "ING. JUAN CARLOS JARAMILLO",
  representanteCargo: "REPRESENTANTE LEGAL",
  empresa: "CORESOLUTIONS S.A.",
  ciudadFecha: `Cuenca, ${formatFechaLarga()}`,
};

function nivelEstudioLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push("Tercer nivel con título");
  if (tecnico.cuartoNivelTitulo) lineas.push("Cuarto nivel con título");
  return lineas;
}

function titulacionLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push(tecnico.tituloAcademico);
  if (tecnico.cuartoNivelTitulo) lineas.push(tecnico.cuartoNivelTitulo);
  return lineas;
}

export default function Anexo2Preview({
  filas,
  tecnicos,
  asignaciones,
  overrides = {},
  firma = {},
  editable = false,
  onOverrideChange,
  onFirmaChange,
}: Anexo2PreviewProps) {
  if (filas.length === 0) return null;

  const f = { ...FIRMA_DEFAULT, ...firma };

  return (
    <div
      className="flex flex-col gap-5 rounded-md p-8"
      style={{ background: "#ffffff", color: "#000000", fontFamily: FONT_FAMILY }}
    >
      {/* Encabezado / letterhead */}
      <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "#ccc" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served from /public, not optimizable content */}
        <img src="/coresolutions-logo.png" alt="CORESOLUTIONS" className="h-9 w-auto" />
        <div className="text-right text-[10px] leading-snug" style={{ color: "#333" }}>
          <EditableParagraph
            editable={editable}
            value={f.encabezadoDireccion}
            small
            align="right"
            onChange={(v) => onFirmaChange?.("encabezadoDireccion", v)}
          />
          <EditableParagraph
            editable={editable}
            value={f.encabezadoTelefonos}
            small
            align="right"
            onChange={(v) => onFirmaChange?.("encabezadoTelefonos", v)}
          />
          <EditableParagraph
            editable={editable}
            value={f.encabezadoEmail}
            small
            align="right"
            onChange={(v) => onFirmaChange?.("encabezadoEmail", v)}
          />
        </div>
      </div>

      <h1
        className="pb-1.5 text-2xl font-bold"
        style={{ color: AZUL_TITULO, borderBottom: `1px solid ${AZUL_BORDE}` }}
      >
        ANEXO 2: PERSONAL TÉCNICO
      </h1>

      <EditableParagraph
        editable={editable}
        value={f.introEmpresa}
        onChange={(v) => onFirmaChange?.("introEmpresa", v)}
      />

      <div>
        <h2 className="mb-2 text-lg font-bold" style={{ color: AZUL_TITULO }}>
          Cumplimiento de personal técnico mínimo
        </h2>
        <p className="mb-3 text-justify text-sm">
          A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo
          requerido en los términos de referencia:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <colgroup>
              {COL_WIDTHS.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="border px-2 py-1.5 text-center text-xs font-bold"
                    style={{ background: NAVY_TABLA, color: "#ffffff", borderColor: "#000" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((row, i) => {
                const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
                const overrideRow = overrides[i] ?? {};
                const funcionValor = overrideRow.funcion ?? row.funcion ?? "";
                const nombreValor = overrideRow.nombre ?? (tecnico ? `${i + 1}.1 ${tecnico.nombre}` : "");
                const nivelValor = overrideRow.nivelEstudio ?? nivelEstudioLineas(tecnico).join("\n");
                const tituloValor = overrideRow.titulacionAcademica ?? titulacionLineas(tecnico).join("\n");

                return (
                  <tr key={i}>
                    <td className="border px-2 py-2 align-top text-xs" style={{ borderColor: "#000" }}>
                      {i + 1}
                    </td>
                    <EditableCell
                      editable={editable}
                      value={funcionValor}
                      multiline
                      onChange={(v) => onOverrideChange?.(i, "funcion", v)}
                    />
                    <EditableCell
                      editable={editable}
                      value={nombreValor}
                      onChange={(v) => onOverrideChange?.(i, "nombre", v)}
                    />
                    <EditableCell
                      editable={editable}
                      value={nivelValor}
                      multiline
                      onChange={(v) => onOverrideChange?.(i, "nivelEstudio", v)}
                    />
                    <EditableCell
                      editable={editable}
                      value={tituloValor}
                      multiline
                      onChange={(v) => onOverrideChange?.(i, "titulacionAcademica", v)}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold" style={{ color: AZUL_TITULO }}>
          Títulos profesionales y formación académica
        </h2>
        <EditableParagraph
          editable={editable}
          value={f.introTitulos}
          onChange={(v) => onFirmaChange?.("introTitulos", v)}
        />
        <div className="mt-3 flex flex-col gap-4">
          {filas.map((row, i) => {
            const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
            return (
              <DocumentoTecnicoGallery
                key={i}
                titulo={tecnico ? tecnico.nombre : `Perfil ${i + 1}`}
                archivos={tecnico?.documentos?.["Senescyt"] ?? []}
                vacioMensaje={
                  tecnico ? "Sin documento Senescyt subido para este técnico." : "Técnico no asignado."
                }
              />
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold" style={{ color: AZUL_TITULO }}>
          Certificaciones de consultores y especialistas técnicos
        </h2>
        <EditableParagraph
          editable={editable}
          value={f.introCertificaciones}
          onChange={(v) => onFirmaChange?.("introCertificaciones", v)}
        />
        <div className="mt-3 flex flex-col gap-4">
          {filas.map((row, i) => {
            const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
            return (
              <DocumentoTecnicoGallery
                key={i}
                titulo={tecnico ? tecnico.nombre : `Perfil ${i + 1}`}
                archivos={tecnico?.documentos?.["Certificaciones"] ?? []}
                vacioMensaje={
                  tecnico ? "Sin certificaciones subidas para este técnico." : "Técnico no asignado."
                }
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm">Para constancia de lo ofertado, suscribo este Anexo,</p>
        <p className="text-sm" style={{ color: "#999" }}>
          -------------------------------------------------------
        </p>
        <EditableParagraph
          editable={editable}
          value={f.representanteNombre}
          bold
          small
          onChange={(v) => onFirmaChange?.("representanteNombre", v)}
        />
        <EditableParagraph
          editable={editable}
          value={f.representanteCargo}
          small
          onChange={(v) => onFirmaChange?.("representanteCargo", v)}
        />
        <EditableParagraph
          editable={editable}
          value={f.empresa}
          small
          onChange={(v) => onFirmaChange?.("empresa", v)}
        />
        <EditableParagraph
          editable={editable}
          value={f.ciudadFecha}
          small
          onChange={(v) => onFirmaChange?.("ciudadFecha", v)}
        />
      </div>
    </div>
  );
}

function DocumentoTecnicoGallery({
  titulo,
  archivos,
  vacioMensaje,
}: {
  titulo: string;
  archivos: { url: string; nombre: string }[];
  vacioMensaje: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{titulo}</p>
      {archivos.length === 0 ? (
        <p className="text-xs italic" style={{ color: "#888" }}>
          {vacioMensaje}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {archivos.map((archivo) =>
            /\.pdf$/i.test(archivo.nombre) ? (
              <iframe
                key={archivo.url}
                src={archivo.url}
                title={archivo.nombre}
                className="h-64 w-56 rounded"
                style={{ border: "1px solid #ccc" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL, not a local/optimizable asset
              <img
                key={archivo.url}
                src={archivo.url}
                alt={archivo.nombre}
                className="max-h-64 max-w-[220px] rounded object-contain"
                style={{ border: "1px solid #ccc" }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EditableCell({
  editable,
  value,
  multiline,
  onChange,
}: {
  editable: boolean;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  if (!editable) {
    return (
      <td className="border px-2 py-2 align-top text-xs whitespace-pre-line" style={{ borderColor: "#000" }}>
        {value.split("\n").map((linea, li) => (
          <div key={li}>{linea}</div>
        ))}
      </td>
    );
  }

  return (
    <td className="border p-1 align-top" style={{ borderColor: "#000" }}>
      <textarea
        key={value}
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        rows={multiline ? 3 : 1}
        className="w-full resize-none rounded p-1.5 text-xs outline-none"
        style={{ color: "#000", background: "#f3f4f6", border: "1px solid #999" }}
      />
    </td>
  );
}

function EditableParagraph({
  editable,
  value,
  onChange,
  bold,
  small,
  align,
}: {
  editable: boolean;
  value: string;
  onChange: (value: string) => void;
  bold?: boolean;
  small?: boolean;
  align?: "left" | "right";
}) {
  if (!editable) {
    return (
      <p
        className={`whitespace-pre-line ${small ? "text-xs" : "text-sm text-justify"} ${bold ? "font-bold" : ""}`}
        style={{ textAlign: align }}
      >
        {value}
      </p>
    );
  }

  return (
    <textarea
      key={value}
      defaultValue={value}
      onBlur={(e) => onChange(e.target.value)}
      rows={small ? 1 : 3}
      className={`w-full resize-none rounded p-2 outline-none ${small ? "text-xs" : "text-sm"} ${bold ? "font-bold" : ""}`}
      style={{ color: "#000", background: "#f3f4f6", border: "1px solid #999", textAlign: align }}
    />
  );
}
