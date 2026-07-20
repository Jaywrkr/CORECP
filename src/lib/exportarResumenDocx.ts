import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableRow, TextRun, WidthType } from "docx";
import type { Anexo2Fila, Anexo3ProyectosMap, ExtractionResult } from "@/types/extraction";
import type { Proyecto } from "@/types/proyecto";
import type { Tecnico } from "@/types/tecnico";
import { AZUL_TITULO, FIRMA_DEFAULT } from "./anexo2Shared";
import { buscarCoincidenciaTT2 } from "./cpcTT2";
import { celdaDatoDocx, celdaEncabezadoDocx, parrafoJustificadoDocx, tituloSeccionDocx } from "./docxHelpers";

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
  return tecnico?.nombre || fila.nombre || "(sin asignar)";
}

function alertaParrafos(label: string, requerido: boolean, detalle: string): Paragraph[] {
  const parrafos = [
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun({ text: requerido ? "SÍ — " : "NO — ", bold: true, color: requerido ? "B3261E" : "1E7E34", size: 22 }),
        new TextRun({ text: label, bold: true, size: 22 }),
      ],
    }),
  ];
  if (detalle) {
    parrafos.push(new Paragraph({ children: [new TextRun({ text: detalle, size: 20, color: "555555" })] }));
  }
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
  const coincidenciasTT2 = codigosCpc
    .map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) }))
    .filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: FIRMA_DEFAULT.encabezadoDireccion, size: 16 })],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [new TextRun({ text: FIRMA_DEFAULT.encabezadoTelefonos, size: 16 })],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [new TextRun({ text: FIRMA_DEFAULT.encabezadoEmail, size: 16 })],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 240, after: 240 },
      children: [new TextRun({ text: "RESUMEN DEL PROCESO", bold: true, color: AZUL_TITULO, size: 36 })],
    }),
    new Paragraph({ children: [new TextRun({ text: `Cliente: ${identificacion.cliente || "—"}`, size: 22 })] }),
    new Paragraph({
      children: [new TextRun({ text: `Objeto de contratación: ${identificacion.descripcion || "—"}`, size: 22 })],
    }),
  );
  if (numeroProceso) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Número de proceso: ${numeroProceso}`, size: 22 })] }));
  }
  if (nombreProyecto) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Nombre de proyecto: ${nombreProyecto}`, size: 22 })] }));
  }

  children.push(
    tituloSeccionDocx("Fechas clave", AZUL_TITULO),
    parrafoJustificadoDocx(`Presentación de oferta: ${fechasClave.presentacionOferta || "No especificada"}`),
    parrafoJustificadoDocx(`Puja / subasta inversa: ${fechasClave.puja || "No especificada"}`),
    parrafoJustificadoDocx(`Adjudicación: ${fechasClave.adjudicacion || "No especificada"}`),
  );

  children.push(tituloSeccionDocx("Equipo técnico propuesto", AZUL_TITULO));
  if (anexo2Sugerido.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "No se detectaron perfiles de personal técnico.", italics: true, size: 20 })] }));
  } else {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              celdaEncabezadoDocx("Función", 30, AZUL_TITULO),
              celdaEncabezadoDocx("Técnico asignado", 25, AZUL_TITULO),
              celdaEncabezadoDocx("Nivel de estudio", 20, AZUL_TITULO),
              celdaEncabezadoDocx("Titulación académica", 25, AZUL_TITULO),
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

  children.push(tituloSeccionDocx("Requerimientos detectados", AZUL_TITULO));
  const hayRequisitos = CATEGORY_LABELS.some(({ key }) => requisitos[key].length > 0);
  if (!hayRequisitos) {
    children.push(new Paragraph({ children: [new TextRun({ text: "No se detectaron requisitos de personal técnico.", italics: true, size: 20 })] }));
  } else {
    for (const { key, label } of CATEGORY_LABELS) {
      const items = requisitos[key];
      if (items.length === 0) continue;
      children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: label, bold: true, size: 22 })] }));
      for (const item of items) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: item, size: 20 })] }));
      }
    }
  }

  children.push(tituloSeccionDocx("Entregables y obligaciones del oferente", AZUL_TITULO));
  children.push(
    ...alertaParrafos("Cronograma de implementación", alertas?.cronograma.requerido ?? false, alertas?.cronograma.detalle ?? ""),
    ...alertaParrafos(
      "Transferencia de tecnología — Nivel TT2",
      requiereTT2,
      codigosCpc.length === 0
        ? "No se detectó código CPC en el pliego — verificar manualmente."
        : requiereTT2
          ? `Código(s) CPC detectado(s) que coinciden con la Tabla 2 de SERCOP: ${coincidenciasTT2
              .map((c) => `${c.codigo} (${c.match?.descripcion})`)
              .join("; ")}. Verificar contra el listado oficial vigente de SERCOP antes de ofertar.`
          : `Código(s) CPC detectado(s): ${codigosCpc.join(", ")} — ninguno coincide con la Tabla 2 transcrita. Verificar contra el listado oficial de SERCOP.`,
    ),
    ...alertaParrafos("Entrega de manuales", alertas?.manuales.requerido ?? false, alertas?.manuales.detalle ?? ""),
  );

  children.push(tituloSeccionDocx("Documentación de respaldo (proyectos vinculados)", AZUL_TITULO));
  if (proyectosVinculados.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Aún no hay proyectos vinculados a ningún perfil del Anexo 3.", italics: true, size: 20 })],
      }),
    );
  } else {
    proyectosVinculados.forEach((proyecto, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${i + 1}. ${proyecto.cliente} - ${proyecto.descripcionCorta} — Acta: ${
                proyecto.archivoActaEntrega?.nombre || "(sin archivo)"
              }; Certificado: ${proyecto.archivoCertificadoParticipacion?.nombre || "(sin archivo)"}`,
              size: 20,
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
          text: "Este resumen no incluye especificaciones técnicas de producto/marca — consulta el pliego original para ese detalle. Generado automáticamente a partir del análisis del proceso; revisa cada punto antes de presentar la oferta.",
          italics: true,
          size: 18,
          color: "888888",
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
