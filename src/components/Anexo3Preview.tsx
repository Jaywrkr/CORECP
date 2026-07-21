"use client";

import type { CSSProperties } from "react";
import type {
  Anexo2Fila,
  Anexo3Fila,
  Anexo3FilaOverride,
  Anexo3Firma,
  Anexo3OverridesMap,
  Anexo3ProyectosMap,
  Anexo3TecnicoOverride,
  Anexo3TecnicoOverridesMap,
} from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { AZUL_BORDE, AZUL_TITULO, FIRMA_DEFAULT, FONT_FAMILY, NAVY_TABLA, resolverValor } from "@/lib/anexo2Shared";
import { areaDesdeFuncion, bioTecnicoDefault, FIRMA_DEFAULT_ANEXO3, participacionTecnicoDefault, requisitoGrisDePerfil, type RequisitoGris } from "@/lib/anexo3Shared";

interface Anexo3PreviewProps {
  anexo2Filas: Anexo2Fila[];
  anexo3Filas: Anexo3Fila[];
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  proyectosPorFila?: Anexo3ProyectosMap;
  overrides?: Anexo3OverridesMap;
  tecnicoOverrides?: Anexo3TecnicoOverridesMap;
  firma?: Anexo3Firma;
  editable?: boolean;
  onOverrideChange?: (rowIndex: number, proyectoId: string, field: keyof Anexo3FilaOverride, value: string) => void;
  onTecnicoOverrideChange?: (tecnicoId: string, field: keyof Anexo3TecnicoOverride, value: string) => void;
  onFirmaChange?: (field: keyof Anexo3Firma, value: string) => void;
}

const HEADERS = ["Personal", "Cliente – Fecha de entrega o Factura", "Proyecto", "Monto"];
const COL_WIDTHS = ["18%", "22%", "48%", "12%"];
const GRIS_REQUISITO = "#D0CECE";

const FS = {
  titulo1: "24px",
  titulo2: "21px",
  body: "15px",
  tabla: "11px",
};

const PAGE_BREAK_STYLE: CSSProperties = { breakBefore: "page", pageBreakBefore: "always" };

interface FilaConProyecto {
  rowIndex: number;
  proyectoId: string;
  proyecto?: Proyecto;
  tecnico?: Tecnico;
}

export default function Anexo3Preview({
  anexo2Filas,
  anexo3Filas,
  tecnicos,
  proyectos,
  asignaciones,
  proyectosPorFila = {},
  overrides = {},
  tecnicoOverrides = {},
  firma = {},
  editable = false,
  onOverrideChange,
  onTecnicoOverrideChange,
  onFirmaChange,
}: Anexo3PreviewProps) {
  if (anexo2Filas.length === 0) return null;

  const f = { ...FIRMA_DEFAULT_ANEXO3, ...firma };
  const encabezado = FIRMA_DEFAULT; // letterhead reuses the same company header as Anexo 2

  const requisitoGris = (rowIndex: number) =>
    requisitoGrisDePerfil(
      rowIndex,
      anexo2Filas[rowIndex]?.funcion,
      anexo3Filas[rowIndex]?.personal,
      anexo3Filas[rowIndex]?.requisitoExperiencia,
    );

  const filasConProyecto: FilaConProyecto[] = [];
  anexo2Filas.forEach((_, rowIndex) => {
    const ids = proyectosPorFila[rowIndex] ?? [];
    ids.forEach((proyectoId) => {
      filasConProyecto.push({
        rowIndex,
        proyectoId,
        proyecto: proyectos.find((p) => p.id === proyectoId),
        tecnico: tecnicos.find((t) => t.id === asignaciones[rowIndex]),
      });
    });
  });

  const tecnicosAsignados = Array.from(new Set(Object.values(asignaciones)))
    .map((id) => tecnicos.find((t) => t.id === id))
    .filter((t): t is Tecnico => Boolean(t));

  const proyectosUnicos = Array.from(new Set(filasConProyecto.map((f) => f.proyectoId)))
    .map((id) => proyectos.find((p) => p.id === id))
    .filter((p): p is Proyecto => Boolean(p));

  return (
    <div
      id="anexo3-print-area"
      className="flex flex-col gap-5 rounded-md p-8"
      style={{ background: "#ffffff", color: "#000000", fontFamily: FONT_FAMILY, fontSize: FS.body }}
    >
      <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "#ccc" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served from /public, not optimizable content */}
        <img src="/coresolutions-logo.png" alt="CORESOLUTIONS" className="h-9 w-auto" />
        <div className="text-right leading-snug" style={{ color: "#333", fontSize: "11px" }}>
          <p>{encabezado.encabezadoDireccion}</p>
          <p>{encabezado.encabezadoTelefonos}</p>
          <p>{encabezado.encabezadoEmail}</p>
        </div>
      </div>

      <h1
        className="pb-1.5 font-bold"
        style={{ color: AZUL_TITULO, borderBottom: `1px solid ${AZUL_BORDE}`, fontSize: FS.titulo1 }}
      >
        ANEXO 3: EXPERIENCIA DEL PERSONAL TÉCNICO
      </h1>

      <EditableParagraph editable={editable} value={f.introGeneral} onChange={(v) => onFirmaChange?.("introGeneral", v)} />

      {/* Tabla consolidada */}
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
            {anexo2Filas.map((_, rowIndex) => (
              <TablaFilasDePerfil
                key={rowIndex}
                rowIndex={rowIndex}
                requisito={requisitoGris(rowIndex)}
                filas={filasConProyecto.filter((f) => f.rowIndex === rowIndex)}
                overrides={overrides}
                editable={editable}
                onOverrideChange={onOverrideChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Certificados por técnico */}
      {tecnicosAsignados.map((tecnico) => {
        const filasTecnico = filasConProyecto.filter((f) => f.tecnico?.id === tecnico.id);
        const areas = Array.from(
          new Set(
            Object.entries(asignaciones)
              .filter(([, id]) => id === tecnico.id)
              .map(([rowIndex]) => areaDesdeFuncion(anexo2Filas[Number(rowIndex)]?.funcion ?? "")),
          ),
        );
        const clientes = Array.from(
          new Set(filasTecnico.map((f) => f.proyecto?.cliente).filter((c): c is string => Boolean(c))),
        );
        const tOverride = tecnicoOverrides[tecnico.id] ?? {};
        const bioValor = resolverValor(tOverride.bio, bioTecnicoDefault(tecnico, areas));
        const participacionValor = resolverValor(tOverride.participacion, participacionTecnicoDefault(tecnico, clientes));

        return (
          <div key={tecnico.id} className="flex flex-col gap-3" style={PAGE_BREAK_STYLE}>
            <h2 className="text-center font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
              CERTIFICADO DE TRABAJO Y EXPERIENCIA
            </h2>
            <EditableParagraph
              editable={editable}
              value={bioValor}
              onChange={(v) => onTecnicoOverrideChange?.(tecnico.id, "bio", v)}
            />
            <EditableParagraph
              editable={editable}
              value={participacionValor}
              onChange={(v) => onTecnicoOverrideChange?.(tecnico.id, "participacion", v)}
            />
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
                  {Array.from(new Set(filasTecnico.map((f) => f.rowIndex))).map((rowIndex) => (
                    <TablaFilasDePerfil
                      key={rowIndex}
                      rowIndex={rowIndex}
                      requisito={requisitoGris(rowIndex)}
                      filas={filasTecnico.filter((f) => f.rowIndex === rowIndex)}
                      overrides={overrides}
                      editable={editable}
                      onOverrideChange={onOverrideChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <EditableParagraph editable value={f.ciudadFecha} small onChange={(v) => onFirmaChange?.("ciudadFecha", v)} />
            <FirmaBloque
              editable={editable}
              representanteNombre={f.representanteNombre}
              representanteCargo={f.representanteCargo}
              empresa={f.empresa}
              onChange={(field, v) => onFirmaChange?.(field, v)}
              conEspacio={false}
            />
          </div>
        );
      })}

      {/* Relación de dependencia */}
      <div style={PAGE_BREAK_STYLE}>
        <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
          Relación de dependencia
        </h2>
        <EditableParagraph
          editable={editable}
          value={f.relacionDependenciaTexto}
          onChange={(v) => onFirmaChange?.("relacionDependenciaTexto", v)}
        />
      </div>

      {/* Documentación de respaldo */}
      <div style={PAGE_BREAK_STYLE}>
        <h2 className="mb-2 font-bold" style={{ color: AZUL_TITULO, fontSize: FS.titulo2 }}>
          Documentación de respaldo
        </h2>
        <EditableParagraph
          editable={editable}
          value={f.documentacionRespaldoTexto}
          onChange={(v) => onFirmaChange?.("documentacionRespaldoTexto", v)}
        />
        <ol className="mt-2 flex flex-col gap-2" style={{ fontSize: FS.body }}>
          {proyectosUnicos.length === 0 ? (
            <p className="italic" style={{ color: "#888" }}>
              Aún no hay proyectos vinculados a ningún perfil.
            </p>
          ) : (
            proyectosUnicos.map((proyecto, i) => (
              <li key={proyecto.id}>
                <p>
                  {i + 1}. {proyecto.cliente} - {proyecto.descripcionCorta}
                </p>
                <p className="pl-4" style={{ fontSize: FS.tabla }}>
                  Acta de Entrega: {proyecto.archivoActaEntrega?.nombre || "(sin archivo)"}
                </p>
                <p className="pl-4" style={{ fontSize: FS.tabla }}>
                  Certificado de Participación: {proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"}
                </p>
              </li>
            ))
          )}
        </ol>
      </div>

      {/* Firma final */}
      <div className="flex flex-col gap-1" style={PAGE_BREAK_STYLE}>
        <p style={{ fontSize: FS.body }}>Para constancia de lo ofertado, suscribo este Anexo,</p>
        <div style={{ height: "80px" }} />
        <p style={{ fontSize: FS.body, color: "#999" }}>
          -------------------------------------------------------
        </p>
        <FirmaBloque
          editable={editable}
          representanteNombre={f.representanteNombre}
          representanteCargo={f.representanteCargo}
          empresa={f.empresa}
          onChange={(field, v) => onFirmaChange?.(field, v)}
          conEspacio={false}
        />
        <EditableParagraph editable value={f.ciudadFecha} small onChange={(v) => onFirmaChange?.("ciudadFecha", v)} />
      </div>
    </div>
  );
}

function TablaFilasDePerfil({
  rowIndex,
  requisito,
  filas,
  overrides,
  editable,
  onOverrideChange,
}: {
  rowIndex: number;
  requisito: RequisitoGris;
  filas: FilaConProyecto[];
  overrides: Anexo3OverridesMap;
  editable: boolean;
  onOverrideChange?: (rowIndex: number, proyectoId: string, field: keyof Anexo3FilaOverride, value: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={4} className="border px-2 py-1.5" style={{ background: GRIS_REQUISITO, borderColor: "#000" }}>
          <div className="font-bold">{requisito.titulo}</div>
          {requisito.requisito ? <div className="mt-1">{requisito.requisito}</div> : null}
        </td>
      </tr>
      {filas.length === 0 ? (
        <tr>
          <td colSpan={4} className="border px-2 py-2 italic" style={{ borderColor: "#000", color: "#888" }}>
            (sin proyectos vinculados a este perfil)
          </td>
        </tr>
      ) : (
        filas.map(({ proyectoId, proyecto, tecnico }) => {
          const key = `${rowIndex}:${proyectoId}`;
          const override = overrides[key] ?? {};
          const personalValor = resolverValor(override.personal, tecnico?.nombre ?? "");
          const clienteFechaValor = resolverValor(
            override.clienteFecha,
            proyecto
              ? `${proyecto.cliente}\nFecha de Acta de entrega:\n${proyecto.fechaActaEntrega ?? ""}`
              : "",
          );
          const proyectoValor = resolverValor(override.proyecto, proyecto?.descripcionProyecto ?? "");
          const montoValor = resolverValor(override.monto, proyecto?.monto ?? "");

          return (
            <tr key={proyectoId}>
              <EditableCell
                editable={editable}
                value={personalValor}
                onChange={(v) => onOverrideChange?.(rowIndex, proyectoId, "personal", v)}
              />
              <EditableCell
                editable={editable}
                value={clienteFechaValor}
                multiline
                onChange={(v) => onOverrideChange?.(rowIndex, proyectoId, "clienteFecha", v)}
              />
              <EditableCell
                editable={editable}
                value={proyectoValor}
                multiline
                onChange={(v) => onOverrideChange?.(rowIndex, proyectoId, "proyecto", v)}
              />
              <EditableCell
                editable={editable}
                value={montoValor}
                onChange={(v) => onOverrideChange?.(rowIndex, proyectoId, "monto", v)}
              />
            </tr>
          );
        })
      )}
    </>
  );
}

function FirmaBloque({
  editable,
  representanteNombre,
  representanteCargo,
  empresa,
  onChange,
}: {
  editable: boolean;
  representanteNombre: string;
  representanteCargo: string;
  empresa: string;
  onChange: (field: "representanteNombre" | "representanteCargo" | "empresa", value: string) => void;
  conEspacio?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <EditableParagraph editable={editable} value={representanteNombre} bold small onChange={(v) => onChange("representanteNombre", v)} />
      <EditableParagraph editable={editable} value={representanteCargo} small onChange={(v) => onChange("representanteCargo", v)} />
      <EditableParagraph editable={editable} value={empresa} small onChange={(v) => onChange("empresa", v)} />
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
      <td className="border px-2 py-2 align-top whitespace-pre-line" style={{ borderColor: "#000", fontSize: FS.tabla }}>
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
}: {
  editable: boolean;
  value: string;
  onChange: (value: string) => void;
  bold?: boolean;
  small?: boolean;
}) {
  const fontSize = small ? "11px" : FS.body;

  if (!editable) {
    return (
      <p className={`whitespace-pre-line ${small ? "" : "text-justify"} ${bold ? "font-bold" : ""}`} style={{ fontSize }}>
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
      style={{ color: "#000", background: "#f3f4f6", border: "1px solid #999", fontSize }}
    />
  );
}
