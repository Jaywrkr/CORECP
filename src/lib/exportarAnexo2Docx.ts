import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { Anexo2Fila, Anexo2Firma, Anexo2OverridesMap } from "@/types/extraction";
import type { DocumentoArchivo, Tecnico } from "@/types/tecnico";
import { FIRMA_DEFAULT, nivelEstudioLineas, resolverValor, titulacionLineas } from "./anexo2Shared";

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

type TipoImagen = "png" | "jpg" | "gif" | "bmp";

async function fetchComoBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function extensionDeArchivo(nombre: string): TipoImagen | null {
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return null;
}

function obtenerDimensionesImagen(buffer: ArrayBuffer, tipo: TipoImagen): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const mime = tipo === "jpg" ? "image/jpeg" : `image/${tipo}`;
    const blobUrl = URL.createObjectURL(new Blob([buffer], { type: mime }));
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 200 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ width: 300, height: 200 });
    };
    img.src = blobUrl;
  });
}

function escalar(width: number, height: number, maxWidth = 260): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

async function construirGaleria(archivos: DocumentoArchivo[], mensajeVacio: string): Promise<Paragraph[]> {
  if (archivos.length === 0) {
    return [
      new Paragraph({
        children: [new TextRun({ text: mensajeVacio, italics: true, size: 18, color: "888888" })],
      }),
    ];
  }

  const parrafos: Paragraph[] = [];
  for (const archivo of archivos) {
    const tipo = extensionDeArchivo(archivo.nombre);
    if (!tipo) {
      parrafos.push(
        new Paragraph({
          children: [new TextRun({ text: `Ver archivo adjunto: ${archivo.nombre}`, italics: true, size: 20 })],
        }),
      );
      continue;
    }
    const buffer = await fetchComoBuffer(archivo.url);
    if (!buffer) {
      parrafos.push(
        new Paragraph({
          children: [
            new TextRun({ text: `No se pudo cargar: ${archivo.nombre}`, italics: true, size: 20, color: "CC0000" }),
          ],
        }),
      );
      continue;
    }
    const dims = await obtenerDimensionesImagen(buffer, tipo);
    const { width, height } = escalar(dims.width, dims.height);
    parrafos.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new ImageRun({ type: tipo, data: buffer, transformation: { width, height } })],
      }),
    );
  }
  return parrafos;
}

function celdaEncabezado(texto: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { fill: NAVY_TABLA, type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto, bold: true, color: "FFFFFF", size: 16 })],
      }),
    ],
  });
}

function celdaDato(texto: string, width: number): TableCell {
  const lineas = texto.split("\n").filter(Boolean);
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: (lineas.length > 0 ? lineas : [""]).map(
      (linea) => new Paragraph({ children: [new TextRun({ text: linea, size: 16 })] }),
    ),
  });
}

function tituloSeccion(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: texto, bold: true, color: AZUL_TITULO, size: 32 })],
  });
}

function parrafoJustificado(texto: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, size: 22 })],
  });
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
          celdaEncabezado("Nro", 5),
          celdaEncabezado("Función", 24),
          celdaEncabezado("Nombre", 19),
          celdaEncabezado("Nivel de estudio", 21),
          celdaEncabezado("Titulación académica", 31),
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
            celdaDato(String(i + 1), 5),
            celdaDato(funcionValor, 24),
            celdaDato(nombreValor, 19),
            celdaDato(nivelValor, 21),
            celdaDato(tituloValor, 31),
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
    const galeria = await construirGaleria(
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
    const galeria = await construirGaleria(
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
          parrafoJustificado(f.introEmpresa),
          tituloSeccion("Cumplimiento de personal técnico mínimo"),
          parrafoJustificado(
            "A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo requerido en los términos de referencia:",
          ),
          tabla,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccion("Títulos profesionales y formación académica"),
          parrafoJustificado(f.introTitulos),
          ...seccionesGaleria,

          new Paragraph({ pageBreakBefore: true, children: [] }),
          tituloSeccion("Certificaciones de consultores y especialistas técnicos"),
          parrafoJustificado(f.introCertificaciones),
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

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
