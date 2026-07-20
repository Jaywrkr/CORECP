import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableRow, TextRun, WidthType } from "docx";
import type { Anexo2Fila, Anexo3ProyectosMap, ExtractionResult } from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { buscarCoincidenciaTT2 } from "./cpcTT2";
import { celdaDatoDocx, celdaEncabezadoDocx } from "./docxHelpers";
import { formatFechaLarga } from "./formatFechaLarga";

// Documento standalone, deliberadamente sin el membrete/plantilla formal de
// Coresolutions que usan los Anexos — paleta y tono propios, tipo dashboard,
// para que sea rápido de leer.
const ACCENT = "4F46E5";
const INK = "0F172A";
const MUTED = "64748B";
const GREEN = "16A34A";
const RED = "DC2626";

interface GenerarResumenDocxParams {
  result: ExtractionResult;
  numeroProceso?: string;
  nombreProyecto?: string | null;
  tecnicos: Tecnico[];
  proyectos: Proyecto[];
  asignaciones: Record<number, string>;
  anexo3Proyectos: Anexo3ProyectosMap;
}

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
  return tecnico?.nombre || fila.nombre || "Sin asignar";
}

function tituloSeccion(icono: string, texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text: `${icono}  ${texto}`, bold: true, color: INK, size: 24 })],
  });
}

function alertaParrafos(label: string, requerido: boolean, detalle: string): Paragraph[] {
  const color = requerido ? RED : GREEN;
  const parrafos = [
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun({ text: requerido ? "● Sí — " : "● No — ", bold: true, color, size: 22 }),
        new TextRun({ text: label, bold: true, color: INK, size: 22 }),
      ],
    }),
  ];
  parrafos.push(
    new Paragraph({
      children: [new TextRun({ text: detalle, size: 20, color: MUTED })],
    }),
  );
  return parrafos;
}

export async function generarResumenDocx({
  result,
  numeroProceso,
  nombreProyecto,
  tecnicos,
  proyectos,
  asignaciones,
  anexo3Proyectos,
}: GenerarResumenDocxParams): Promise<Blob> {
  const { requisitos, fechasClave, identificacion, anexo2Sugerido, alertas } = result;

  const proyectoIdsVinculados = Array.from(new Set(Object.values(anexo3Proyectos).flat()));
  const proyectosVinculados = proyectoIdsVinculados
    .map((id) => proyectos.find((p) => p.id === id))
    .filter((p): p is Proyecto => Boolean(p));

  const codigosCpc = alertas?.codigosCpc ?? [];
  const coincidenciasTT2 = codigosCpc.map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) })).filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "RESUMEN DEL PROCESO", bold: true, color: ACCENT, size: 18 })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: identificacion.descripcion || "Proceso sin descripción", bold: true, color: INK, size: 40 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: [identificacion.cliente || "Cliente no identificado", numeroProceso, nombreProyecto].filter(Boolean).join(" · "),
          color: MUTED,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Generado el ${formatFechaLarga()}`, color: MUTED, size: 16, italics: true })],
    }),
  );

  children.push(
    tituloSeccion("📅", "Fechas clave"),
    new Paragraph({ children: [new TextRun({ text: `Presentación de oferta: ${fechasClave.presentacionOferta || "No especificada"}`, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `Puja / subasta inversa: ${fechasClave.puja || "No especificada"}`, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `Adjudicación: ${fechasClave.adjudicacion || "No especificada"}`, size: 22 })] }),
  );

  children.push(tituloSeccion("👥", "Equipo técnico propuesto"));
  if (anexo2Sugerido.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "No se detectaron perfiles de personal técnico.", italics: true, size: 20, color: MUTED })] }));
  } else {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              celdaEncabezadoDocx("Función", 30, ACCENT),
              celdaEncabezadoDocx("Técnico asignado", 25, ACCENT),
              celdaEncabezadoDocx("Nivel de estudio", 20, ACCENT),
              celdaEncabezadoDocx("Titulación académica", 25, ACCENT),
            ],
          }),
          ...anexo2Sugerido.map(
            (fila, i) =>
              new TableRow({
                children: [
                  celdaDatoDocx(fila.funcion, 30),
                  celdaDatoDocx(nombreTecnicoAsignado(fila, i, tecnicos, asignaciones), 25),
                  celdaDatoDocx(fila.nivelEstudio, 20),
                  celdaDatoDocx(fila.titulacionAcademica, 25),
                ],
              }),
          ),
        ],
      }),
    );
  }

  children.push(tituloSeccion("📋", "Requerimientos detectados"));
  const hayRequisitos = CATEGORY_LABELS.some(({ key }) => requisitos[key].length > 0);
  if (!hayRequisitos) {
    children.push(new Paragraph({ children: [new TextRun({ text: "No se detectaron requisitos de personal técnico.", italics: true, size: 20, color: MUTED })] }));
  } else {
    for (const { key, label } of CATEGORY_LABELS) {
      const items = requisitos[key];
      if (items.length === 0) continue;
      children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: label, bold: true, color: INK, size: 22 })] }));
      for (const item of items) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: item, size: 20 })] }));
      }
    }
  }

  children.push(tituloSeccion("⚠️", "Entregables y obligaciones del oferente"));
  children.push(
    ...alertaParrafos("Cronograma de implementación", alertas?.cronograma.requerido ?? false, alertas?.cronograma.detalle || "No se detectó este requisito en el pliego."),
    ...alertaParrafos(
      "Transferencia de tecnología — TT2",
      requiereTT2,
      codigosCpc.length === 0
        ? "No se detectó código CPC en el pliego — verificar manualmente."
        : requiereTT2
          ? `CPC ${coincidenciasTT2.map((c) => `${c.codigo} (${c.match?.descripcion})`).join("; ")} coincide con la Tabla 2 de SERCOP. Verificar contra el listado oficial vigente antes de ofertar.`
          : `CPC ${codigosCpc.join(", ")} — ninguno coincide con la Tabla 2 transcrita. Verificar manualmente.`,
    ),
    ...alertaParrafos("Entrega de manuales", alertas?.manuales.requerido ?? false, alertas?.manuales.detalle || "No se detectó este requisito en el pliego."),
  );

  children.push(tituloSeccion("📎", "Documentación de respaldo"));
  if (proyectosVinculados.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Aún no hay proyectos vinculados a ningún perfil del Anexo 3.", italics: true, size: 20, color: MUTED })],
      }),
    );
  } else {
    proyectosVinculados.forEach((proyecto, i) => {
      children.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({ text: `${i + 1}. ${proyecto.cliente} — ${proyecto.descripcionCorta}`, bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Acta: ${proyecto.archivoActaEntrega?.nombre || "(sin archivo)"} · Certificado: ${
                proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"
              }`,
              size: 18,
              color: MUTED,
            }),
          ],
        }),
      );
    });
  }

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: "No incluye especificaciones técnicas de producto/marca — consulta el pliego original para ese detalle. Generado automáticamente a partir del análisis del proceso; revisa cada punto antes de presentar la oferta.",
          italics: true,
          size: 18,
          color: MUTED,
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
