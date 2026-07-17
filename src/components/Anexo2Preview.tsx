"use client";

import type { CSSProperties } from "react";
import type { Anexo2Fila, Anexo2Firma, Anexo2Overrides, Anexo2OverridesMap } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import {
  AZUL_BORDE,
  AZUL_TITULO,
  FIRMA_DEFAULT,
  FONT_FAMILY,
  NAVY_TABLA,
  nivelEstudioLineas,
  resolverValor,
  titulacionLineas,
} from "@/lib/anexo2Shared";

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

// Tamaños tomados literalmente de los puntos usados en el .docx (1pt = 4/3px).
const FS = {
  titulo1: "24px", // 18pt
  titulo2: "21px", // 16pt
  body: "15px", // 11pt
  tabla: "11px", // 8pt
  membrete: "11px", // 8pt
};

const PAGE_BREAK_STYLE: CSSProperties = { breakBefore: "page", pageBreakBefore: "always" };

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
      id="anexo2-print-area"
      className="flex flex-col gap-5 rounded-md p-8"
      style={{ background: "#ffffff", color: "#000000", fontFamily: FONT_FAMILY, fontSize: FS.body }}
    >
      {/* Página 1: membrete, título, resumen de la empresa y tabla de cumplimiento */}
      <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "#ccc" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served from /public, not optimizable content */}
        <img src="/coresolutions-logo.png" alt="CORESOLUTIONS" className="h-9 w-auto" />
        <div className="text-right leading-snug" style={{ color: "#333", fontSize: FS.membrete }}>
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
        className="pb-1.5 font-bold"
        style={{ color: AZUL_TITULO, borderBottom: `1px solid ${AZUL_BORDE}`, fontSize: FS.titulo1 }}
      >
        ANEXO 2: PERSONAL TÉCNICO
      </h1>

      <EditableParagraph
        editable={editable}
        value={f.introEmpresa}
        onChange={(v) => onFirmaChange?.("introEmpresa", v)}
      />

      <div>
        <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
          Cumplimiento de personal técnico mínimo
        </h2>
        <p className="mb-3 text-justify" style={{ fontSize: FS.body }}>
          A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo
          requerido en los términos de referencia:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse" style={{ fontSize: FS.tabla }}>
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
                    className="border px-2 py-1.5 text-center font-bold"
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
                const funcionValor = resolverValor(overrideRow.funcion, row.funcion ?? "");
                const nombreValor = resolverValor(
                  overrideRow.nombre,
                  tecnico ? `${i + 1}.1 ${tecnico.nombre}` : "",
                );
                const nivelValor = resolverValor(overrideRow.nivelEstudio, nivelEstudioLineas(tecnico).join("\n"));
                const tituloValor = resolverValor(
                  overrideRow.titulacionAcademica,
                  titulacionLineas(tecnico).join("\n"),
                );

                return (
                  <tr key={i}>
                    <td className="border px-2 py-2 align-top" style={{ borderColor: "#000" }}>
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

      {/* Página 2: Títulos profesionales y formación académica */}
      <div style={PAGE_BREAK_STYLE}>
        <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
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

      {/* Página 3: Certificaciones de consultores y especialistas técnicos */}
      <div style={PAGE_BREAK_STYLE}>
        <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
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

      {/* Página 4: Firma */}
      <div className="flex flex-col gap-1" style={PAGE_BREAK_STYLE}>
        <p style={{ fontSize: FS.body }}>Para constancia de lo ofertado, suscribo este Anexo,</p>
        {/* Espacio en blanco para la firma física o digital */}
        <div style={{ height: "80px" }} />
        <p style={{ fontSize: FS.body, color: "#999" }}>
          -------------------------------------------------------
        </p>
        <EditableParagraph
          editable={editable}
          value={f.representanteNombre}
          bold
          onChange={(v) => onFirmaChange?.("representanteNombre", v)}
        />
        <EditableParagraph
          editable={editable}
          value={f.representanteCargo}
          onChange={(v) => onFirmaChange?.("representanteCargo", v)}
        />
        <EditableParagraph
          editable={editable}
          value={f.empresa}
          onChange={(v) => onFirmaChange?.("empresa", v)}
        />
        {/* La fecha de firma cambia en cada proceso — siempre editable, sin
            depender del interruptor general "Editar todo". */}
        <EditableParagraph
          editable
          value={f.ciudadFecha}
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
      <p className="mb-1.5 font-semibold" style={{ fontSize: FS.body }}>
        {titulo}
      </p>
      {archivos.length === 0 ? (
        <p className="italic" style={{ color: "#888", fontSize: FS.tabla }}>
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
      <td className="border px-2 py-2 align-top whitespace-pre-line" style={{ borderColor: "#000" }}>
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
        className="w-full resize-none rounded p-1.5 outline-none"
        style={{ color: "#000", background: "#f3f4f6", border: "1px solid #999", fontSize: FS.tabla }}
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
  const fontSize = small ? FS.membrete : FS.body;

  if (!editable) {
    return (
      <p
        className={`whitespace-pre-line ${small ? "" : "text-justify"} ${bold ? "font-bold" : ""}`}
        style={{ textAlign: align, fontSize }}
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
      className={`w-full resize-none rounded p-2 outline-none ${bold ? "font-bold" : ""}`}
      style={{ color: "#000", background: "#f3f4f6", border: "1px solid #999", textAlign: align, fontSize }}
    />
  );
}
