import { AlignmentType, Document, Header, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type {
  Anexo2Fila,
  Anexo3Fila,
  Anexo3Firma,
  Anexo3OverridesMap,
  Anexo3ProyectosMap,
  Anexo3TecnicoOverridesMap,
} from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { FIRMA_DEFAULT, resolverValor } from "./anexo2Shared";
import { areaDesdeFuncion, bioTecnicoDefault, FIRMA_DEFAULT_ANEXO3, participacionTecnicoDefault, requisitoGrisDePerfil, type RequisitoGris } from "./anexo3Shared";
import { celdaDatoDocx, celdaEncabezadoDocx, fetchComoBuffer, parrafoJustificadoDocx, tituloSeccionCentradoDocx, tituloSeccionDocx } from "./docxHelpers";

const AZUL_TITULO = "1F4E79";
const NAVY_TABLA = "44546A";
const GRIS_REQUISITO = "D0CECE";
const COL_WIDTHS = [18, 22, 48, 12];

interface GenerarAnexo3DocxParams {
  anexo2Filas: Anexo2Fila[];
  anexo3Filas: Anexo3Fila[];
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  proyectosPorFila?: Anexo3ProyectosMap;
  overrides?: Anexo3OverridesMap;
  tecnicoOverrides?: Anexo3TecnicoOverridesMap;
  firma?: Anexo3Firma;
}

interface FilaConProyecto {
  rowIndex: number;
  proyectoId: string;
  proyecto?: Proyecto;
  tecnico?: Tecnico;
}

function filaRequisito(requisito: RequisitoGris): TableRow {
  const parrafos = [
    new Paragraph({ children: [new TextRun({ text: requisito.titulo, size: 16, bold: true })] }),
  ];
  if (requisito.requisito) {
    parrafos.push(new Paragraph({ children: [new TextRun({ text: requisito.requisito, size: 16 })] }));
  }
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        shading: { fill: GRIS_REQUISITO, type: ShadingType.CLEAR, color: "auto" },
        children: parrafos,
      }),
    ],
  });
}

function filasDePerfil(
  rowIndex: number,
  requisito: RequisitoGris,
  filas: FilaConProyecto[],
  overrides: Anexo3OverridesMap,
): TableRow[] {
  const rows: TableRow[] = [filaRequisito(requisito)];
  if (filas.length === 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            children: [
              new Paragraph({ children: [new TextRun({ text: "(sin proyectos vinculados a este perfil)", italics: true, size: 16, color: "888888" })] }),
            ],
          }),
        ],
      }),
    );
    return rows;
  }

  for (const { proyectoId, proyecto, tecnico } of filas) {
    const key = `${rowIndex}:${proyectoId}`;
    const override = overrides[key] ?? {};
    const personalValor = resolverValor(override.personal, tecnico?.nombre ?? "");
    const clienteFechaValor = resolverValor(
      override.clienteFecha,
      proyecto ? `${proyecto.cliente}\nFecha de Acta de entrega:\n${proyecto.fechaActaEntrega ?? ""}` : "",
    );
    const proyectoValor = resolverValor(override.proyecto, proyecto?.descripcionProyecto ?? "");
    const montoValor = resolverValor(override.monto, proyecto?.monto ?? "");

    rows.push(
      new TableRow({
        children: [
          celdaDatoDocx(personalValor, COL_WIDTHS[0]),
          celdaDatoDocx(clienteFechaValor, COL_WIDTHS[1]),
          celdaDatoDocx(proyectoValor, COL_WIDTHS[2]),
          celdaDatoDocx(montoValor, COL_WIDTHS[3]),
        ],
      }),
    );
  }
  return rows;
}

function encabezadoTabla(): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [
      celdaEncabezadoDocx("Personal", COL_WIDTHS[0], NAVY_TABLA),
      celdaEncabezadoDocx("Cliente – Fecha de entrega o Factura", COL_WIDTHS[1], NAVY_TABLA),
      celdaEncabezadoDocx("Proyecto", COL_WIDTHS[2], NAVY_TABLA),
      celdaEncabezadoDocx("Monto", COL_WIDTHS[3], NAVY_TABLA),
    ],
  });
}

function firmaParrafos(nombre: string, cargo: string, empresa: string): Paragraph[] {
  return [
    new Paragraph({ children: [new TextRun({ text: nombre, bold: true, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: cargo, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: empresa, size: 22 })] }),
  ];
}

export async function generarAnexo3Docx({
  anexo2Filas,
  anexo3Filas,
  tecnicos,
  proyectos,
  asignaciones,
  proyectosPorFila = {},
  overrides = {},
  tecnicoOverrides = {},
  firma = {},
}: GenerarAnexo3DocxParams): Promise<Blob> {
  const f = { ...FIRMA_DEFAULT_ANEXO3, ...firma };
  const encabezado = FIRMA_DEFAULT;
  const logoBuffer = await fetchComoBuffer("/coresolutions-logo.png");

  const requisitoGris = (rowIndex: number) =>
    requisitoGrisDePerfil(
      rowIndex,
      anexo2Filas[rowIndex]?.funcion,
      anexo3Filas[rowIndex]?.personal,
      anexo3Filas[rowIndex]?.requisitoExperiencia,
    );

  const filasConProyecto: FilaConProyecto[] = [];
  anexo2Filas.forEach((_, rowIndex) => {
    (proyectosPorFila[rowIndex] ?? []).forEach((proyectoId) => {
      filasConProyecto.push({
        rowIndex,
        proyectoId,
        proyecto: proyectos.find((p) => p.id === proyectoId),
        tecnico: tecnicos.find((t) => t.id === asignaciones[rowIndex]),
      });
    });
  });

  const header = new Header({
    children: [
      new Paragraph({
        children: logoBuffer
          ? [new ImageRun({ type: "png", data: logoBuffer, transformation: { width: 140, height: 27 } })]
          : [],
      }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: encabezado.encabezadoDireccion, size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: encabezado.encabezadoTelefonos, size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: encabezado.encabezadoEmail, size: 16 })] }),
    ],
  });

  const tablaConsolidada = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      encabezadoTabla(),
      ...anexo2Filas.flatMap((_, rowIndex) =>
        filasDePerfil(rowIndex, requisitoGris(rowIndex), filasConProyecto.filter((f) => f.rowIndex === rowIndex), overrides),
      ),
    ],
  });

  const tecnicosAsignados = Array.from(new Set(Object.values(asignaciones)))
    .map((id) => tecnicos.find((t) => t.id === id))
    .filter((t): t is Tecnico => Boolean(t));

  const bloquesTecnicos: (Paragraph | Table)[] = [];
  for (const tecnico of tecnicosAsignados) {
    const filasTecnico = filasConProyecto.filter((f) => f.tecnico?.id === tecnico.id);
    const areas = Array.from(
      new Set(
        Object.entries(asignaciones)
          .filter(([, id]) => id === tecnico.id)
          .map(([rowIndex]) => areaDesdeFuncion(anexo2Filas[Number(rowIndex)]?.funcion ?? "")),
      ),
    );
    const clientes = Array.from(new Set(filasTecnico.map((f) => f.proyecto?.cliente).filter((c): c is string => Boolean(c))));
    const tOverride = tecnicoOverrides[tecnico.id] ?? {};
    const bioValor = resolverValor(tOverride.bio, bioTecnicoDefault(tecnico, areas));
    const participacionValor = resolverValor(tOverride.participacion, participacionTecnicoDefault(tecnico, clientes));
    const rowIndicesTecnico = Array.from(new Set(filasTecnico.map((f) => f.rowIndex)));

    bloquesTecnicos.push(
      new Paragraph({ pageBreakBefore: true, children: [] }),
      tituloSeccionCentradoDocx("CERTIFICADO DE TRABAJO Y EXPERIENCIA", AZUL_TITULO),
      parrafoJustificadoDocx(bioValor),
      parrafoJustificadoDocx(participacionValor),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          encabezadoTabla(),
          ...rowIndicesTecnico.flatMap((rowIndex) =>
            filasDePerfil(rowIndex, requisitoGris(rowIndex), filasTecnico.filter((f) => f.rowIndex === rowIndex), overrides),
          ),
        ],
      }),
      new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: f.ciudadFecha, size: 22 })] }),
      ...firmaParrafos(f.representanteNombre, f.representanteCargo, f.empresa),
    );
  }

  const proyectosUnicos = Array.from(new Set(filasConProyecto.map((f) => f.proyectoId)))
    .map((id) => proyectos.find((p) => p.id === id))
    .filter((p): p is Proyecto => Boolean(p));

  const documentacionRespaldo = proyectosUnicos.flatMap((proyecto, i) => [
    new Paragraph({
      spacing: { before: 120 },
      children: [new TextRun({ text: `${i + 1}. ${proyecto.cliente} - ${proyecto.descripcionCorta}`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Acta de Entrega: ${proyecto.archivoActaEntrega?.nombre || "(sin archivo)"}`, size: 20 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Certificado de Participación: ${proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"}`, size: 20 }),
      ],
    }),
  ]);

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        properties: {},
        children: [
          new Paragraph({
            spacing: { before: 240, after: 240 },
            children: [new TextRun({ text: "ANEXO 3: EXPERIENCIA DEL PERSONAL TÉCNICO", bold: true, color: AZUL_TITULO, size: 36 })],
          }),
          parrafoJustificadoDocx(f.introGeneral),
          tablaConsolidada,

          ...bloquesTecnicos,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccionDocx("Relación de dependencia", AZUL_TITULO),
          parrafoJustificadoDocx(f.relacionDependenciaTexto),

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccionDocx("Documentación de respaldo", AZUL_TITULO),
          parrafoJustificadoDocx(f.documentacionRespaldoTexto),
          ...documentacionRespaldo,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Para constancia de lo ofertado, suscribo este Anexo,", size: 22 })] }),
          new Paragraph({ spacing: { after: 400 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: "-------------------------------------------------------", size: 22, color: "999999" })] }),
          ...firmaParrafos(f.representanteNombre, f.representanteCargo, f.empresa),
          new Paragraph({ children: [new TextRun({ text: f.ciudadFecha, size: 22 })] }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
