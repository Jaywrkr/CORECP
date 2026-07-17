import { AlignmentType, BorderStyle, Document, Header, ImageRun, Packer, Paragraph, Table, TableRow, TextRun, WidthType } from "docx";
import type { Anexo2Fila, Anexo2Firma, Anexo2OverridesMap } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import { FIRMA_DEFAULT, nivelEstudioLineas, resolverValor, titulacionLineas } from "./anexo2Shared";
import {
  celdaDatoDocx,
  celdaEncabezadoDocx,
  construirGaleriaDocx,
  fetchComoBuffer,
  parrafoJustificadoDocx,
  tituloSeccionDocx,
} from "./docxHelpers";

export { descargarBlob } from "./docxHelpers";

const AZUL_TITULO = "1F4E79";
const AZUL_BORDE = "5B9BD5";
const NAVY_TABLA = "44546A";

interface GenerarAnexo2DocxParams {
  filas: Anexo2Fila[];
  tecnicos: Tecnico[];
  asignaciones: Record<number, string>;
  overrides?: Anexo2OverridesMap;
  firma?: Anexo2Firma;
}

export async function generarAnexo2Docx({
  filas,
  tecnicos,
  asignaciones,
  overrides = {},
  firma = {},
}: GenerarAnexo2DocxParams): Promise<Blob> {
  const f = { ...FIRMA_DEFAULT, ...firma };
  const logoBuffer = await fetchComoBuffer("/coresolutions-logo.png");

  const header = new Header({
    children: [
      new Paragraph({
        children: logoBuffer
          ? [new ImageRun({ type: "png", data: logoBuffer, transformation: { width: 140, height: 27 } })]
          : [],
      }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: f.encabezadoDireccion, size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: f.encabezadoTelefonos, size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: f.encabezadoEmail, size: 16 })] }),
    ],
  });

  const tabla = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celdaEncabezadoDocx("Nro", 5, NAVY_TABLA),
          celdaEncabezadoDocx("Función", 24, NAVY_TABLA),
          celdaEncabezadoDocx("Nombre", 19, NAVY_TABLA),
          celdaEncabezadoDocx("Nivel de estudio", 21, NAVY_TABLA),
          celdaEncabezadoDocx("Titulación académica", 31, NAVY_TABLA),
        ],
      }),
      ...filas.map((row, i) => {
        const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
        const overrideRow = overrides[i] ?? {};
        const funcionValor = resolverValor(overrideRow.funcion, row.funcion ?? "");
        const nombreValor = resolverValor(overrideRow.nombre, tecnico ? `${i + 1}.1 ${tecnico.nombre}` : "");
        const nivelValor = resolverValor(overrideRow.nivelEstudio, nivelEstudioLineas(tecnico).join("\n"));
        const tituloValor = resolverValor(overrideRow.titulacionAcademica, titulacionLineas(tecnico).join("\n"));

        return new TableRow({
          children: [
            celdaDatoDocx(String(i + 1), 5),
            celdaDatoDocx(funcionValor, 24),
            celdaDatoDocx(nombreValor, 19),
            celdaDatoDocx(nivelValor, 21),
            celdaDatoDocx(tituloValor, 31),
          ],
        });
      }),
    ],
  });

  const seccionesGaleria: Paragraph[] = [];
  for (let i = 0; i < filas.length; i++) {
    const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
    seccionesGaleria.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: tecnico ? tecnico.nombre : `Perfil ${i + 1}`, bold: true, size: 22 })],
      }),
    );
    const galeria = await construirGaleriaDocx(
      tecnico?.documentos?.["Senescyt"] ?? [],
      tecnico ? "Sin documento Senescyt subido para este técnico." : "Técnico no asignado.",
    );
    seccionesGaleria.push(...galeria);
  }

  const seccionesCertificaciones: Paragraph[] = [];
  for (let i = 0; i < filas.length; i++) {
    const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
    seccionesCertificaciones.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: tecnico ? tecnico.nombre : `Perfil ${i + 1}`, bold: true, size: 22 })],
      }),
    );
    const galeria = await construirGaleriaDocx(
      tecnico?.documentos?.["Certificaciones"] ?? [],
      tecnico ? "Sin certificaciones subidas para este técnico." : "Técnico no asignado.",
    );
    seccionesCertificaciones.push(...galeria);
  }

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        properties: {},
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, space: 1, color: AZUL_BORDE } },
            spacing: { before: 240, after: 240 },
            children: [new TextRun({ text: "ANEXO 2: PERSONAL TÉCNICO", bold: true, color: AZUL_TITULO, size: 36 })],
          }),
          parrafoJustificadoDocx(f.introEmpresa),
          tituloSeccionDocx("Cumplimiento de personal técnico mínimo", AZUL_TITULO),
          parrafoJustificadoDocx(
            "A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo requerido en los términos de referencia:",
          ),
          tabla,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccionDocx("Títulos profesionales y formación académica", AZUL_TITULO),
          parrafoJustificadoDocx(f.introTitulos),
          ...seccionesGaleria,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccionDocx("Certificaciones de consultores y especialistas técnicos", AZUL_TITULO),
          parrafoJustificadoDocx(f.introCertificaciones),
          ...seccionesCertificaciones,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Para constancia de lo ofertado, suscribo este Anexo,", size: 22 })] }),
          new Paragraph({ spacing: { after: 400 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: "-------------------------------------------------------", size: 22, color: "999999" })] }),
          new Paragraph({ children: [new TextRun({ text: f.representanteNombre, bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: f.representanteCargo, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: f.empresa, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: f.ciudadFecha, size: 22 })] }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
