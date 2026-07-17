import { AlignmentType, ImageRun, Paragraph, ShadingType, TableCell, TextRun, VerticalAlign, WidthType } from "docx";
import type { DocumentoArchivo } from "@/types/tecnico";

export type TipoImagen = "png" | "jpg" | "gif" | "bmp";

export async function fetchComoBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export function extensionDeArchivo(nombre: string): TipoImagen | null {
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return null;
}

export function obtenerDimensionesImagen(buffer: ArrayBuffer, tipo: TipoImagen): Promise<{ width: number; height: number }> {
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

export function escalarImagen(width: number, height: number, maxWidth = 260): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function construirGaleriaDocx(archivos: DocumentoArchivo[], mensajeVacio: string): Promise<Paragraph[]> {
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
    const { width, height } = escalarImagen(dims.width, dims.height);
    parrafos.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new ImageRun({ type: tipo, data: buffer, transformation: { width, height } })],
      }),
    );
  }
  return parrafos;
}

export function celdaEncabezadoDocx(texto: string, width: number, navyTabla: string): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { fill: navyTabla, type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto, bold: true, color: "FFFFFF", size: 16 })],
      }),
    ],
  });
}

export function celdaDatoDocx(texto: string, width: number): TableCell {
  const lineas = texto.split("\n").filter(Boolean);
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: (lineas.length > 0 ? lineas : [""]).map(
      (linea) => new Paragraph({ children: [new TextRun({ text: linea, size: 16 })] }),
    ),
  });
}

export function tituloSeccionDocx(texto: string, azulTitulo: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: texto, bold: true, color: azulTitulo, size: 32 })],
  });
}

export function tituloSeccionCentradoDocx(texto: string, azulTitulo: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: texto, bold: true, color: azulTitulo, size: 32 })],
  });
}

export function parrafoJustificadoDocx(texto: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, size: 22 })],
  });
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
