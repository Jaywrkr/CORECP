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

const FIRMA_DEFAULT: Required<Anexo2Firma> = {
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
    <div className="flex flex-col gap-6 rounded-lg p-6" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
      <h1 className="text-xl font-bold" style={{ color: "#5b9bd5" }}>
        ANEXO 2: PERSONAL TÉCNICO
      </h1>

      <EditableParagraph
        editable={editable}
        value={f.introEmpresa}
        onChange={(v) => onFirmaChange?.("introEmpresa", v)}
      />

      <div>
        <h2 className="mb-2 text-lg font-semibold" style={{ color: "#5b9bd5" }}>
          Cumplimiento de personal técnico mínimo
        </h2>
        <p className="mb-4 text-sm" style={{ color: "#e5e7eb" }}>
          A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo
          requerido en los términos de referencia:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm" style={{ color: "#e5e7eb" }}>
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="border px-3 py-2 text-left font-semibold"
                    style={{ background: "#a9c6e8", color: "#1f2d3d", borderColor: "#333" }}
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
                    <td className="border px-3 py-3 align-top" style={{ borderColor: "#333" }}>
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
        <h2 className="mb-2 text-lg font-semibold" style={{ color: "#5b9bd5" }}>
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
        <h2 className="mb-2 text-lg font-semibold" style={{ color: "#5b9bd5" }}>
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
        <p className="text-sm" style={{ color: "#e5e7eb" }}>
          Para constancia de lo ofertado, suscribo este Anexo,
        </p>
        <p className="text-sm" style={{ color: "#666" }}>
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
      <p className="mb-1.5 text-sm font-semibold" style={{ color: "#e5e7eb" }}>
        {titulo}
      </p>
      {archivos.length === 0 ? (
        <p className="text-xs italic" style={{ color: "#777" }}>
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
                style={{ border: "1px solid #333" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL, not a local/optimizable asset
              <img
                key={archivo.url}
                src={archivo.url}
                alt={archivo.nombre}
                className="max-h-64 max-w-[220px] rounded object-contain"
                style={{ border: "1px solid #333" }}
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
      <td className="border px-3 py-3 align-top whitespace-pre-line" style={{ borderColor: "#333" }}>
        {value.split("\n").map((linea, li) => (
          <div key={li}>{linea}</div>
        ))}
      </td>
    );
  }

  return (
    <td className="border p-1 align-top" style={{ borderColor: "#333" }}>
      <textarea
        key={value}
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        rows={multiline ? 3 : 1}
        className="w-full resize-none rounded p-1.5 text-sm outline-none"
        style={{ color: "#e5e7eb", background: "#111", border: "1px solid #444" }}
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
}: {
  editable: boolean;
  value: string;
  onChange: (value: string) => void;
  bold?: boolean;
  small?: boolean;
}) {
  if (!editable) {
    return (
      <p
        className={`whitespace-pre-line text-sm ${bold ? "font-semibold" : ""}`}
        style={{ color: "#e5e7eb" }}
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
      className={`w-full resize-none rounded p-2 text-sm outline-none ${bold ? "font-semibold" : ""}`}
      style={{ color: "#e5e7eb", background: "#111", border: "1px solid #444" }}
    />
  );
}
