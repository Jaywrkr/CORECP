import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ExtractionResult } from "@/types/extraction";
import { buscarCoincidenciaTT2 } from "./cpcTT2";
import { formatFechaLarga } from "./formatFechaLarga";

// Documento standalone, deliberadamente sin el membrete/plantilla formal de
// Coresolutions que usan los Anexos — paleta y tono propios, tipo reporte
// ejecutivo, cubriendo TODO el proceso (no personal técnico/experiencia,
// que están en el Anexo 2 y el Anexo 3).
const ACCENT = "4F46E5";
const INK = "0F172A";
const MUTED = "64748B";
const GREEN = "16A34A";
const RED = "DC2626";

interface GenerarResumenDocxParams {
  result: ExtractionResult;
  numeroProceso?: string;
  nombreProyecto?: string | null;
}

let contadorSeccion = 0;

function tituloSeccion(icono: string, texto: string): Paragraph {
  contadorSeccion += 1;
  return new Paragraph({
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text: `${contadorSeccion}. ${icono}  ${texto}`, bold: true, color: INK, size: 24 })],
  });
}

function datoParrafo(label: string, valor: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: valor || "No especificado", size: 20, italics: !valor, color: valor ? INK : MUTED }),
    ],
  });
}

function listaParrafos(items: string[], vacio: string): Paragraph[] {
  if (items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: vacio, italics: true, size: 20, color: MUTED })] })];
  }
  return items.map((item) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: item, size: 20 })] }));
}

function checklistParrafos(items: string[], vacio: string): Paragraph[] {
  if (items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: vacio, italics: true, size: 20, color: MUTED })] })];
  }
  return items.map((item) => new Paragraph({ children: [new TextRun({ text: `☐  ${item}`, size: 20 })] }));
}

function alertaParrafos(label: string, requerido: boolean, detalle: string): Paragraph[] {
  const color = requerido ? RED : GREEN;
  return [
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun({ text: requerido ? "● Sí — " : "● No — ", bold: true, color, size: 22 }),
        new TextRun({ text: label, bold: true, color: INK, size: 22 }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: detalle, size: 20, color: MUTED })] }),
  ];
}

export async function generarResumenDocx({ result, numeroProceso, nombreProyecto }: GenerarResumenDocxParams): Promise<Blob> {
  const { fechasClave, identificacion, alertas, informacionGeneral: info, resumenEjecutivo: r } = result;

  const codigosCpc = alertas?.codigosCpc ?? [];
  const coincidenciasTT2 = codigosCpc.map((codigo) => ({ codigo, match: buscarCoincidenciaTT2(codigo) })).filter((c) => c.match);
  const requiereTT2 = coincidenciasTT2.length > 0;

  contadorSeccion = 0;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "RESUMEN EJECUTIVO Y CHECKLIST DE CUMPLIMIENTO", bold: true, color: ACCENT, size: 18 })],
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
  );
  if (r?.objetivo) {
    children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: r.objetivo, italics: true, color: MUTED, size: 20 })] }));
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Generado el ${formatFechaLarga()}`, color: MUTED, size: 16, italics: true })],
    }),
  );

  children.push(tituloSeccion("🏢", "Información general"));
  children.push(
    datoParrafo("Entidad", r?.entidadContratante || identificacion.cliente),
    ...(numeroProceso ? [datoParrafo("Proceso", numeroProceso)] : []),
    datoParrafo("Modalidad", info?.modalidadContratacion ?? ""),
    datoParrafo("Objeto", identificacion.descripcion),
    datoParrafo("Presupuesto referencial", info?.presupuestoReferencial ?? ""),
    datoParrafo("Plazo de ejecución", info?.plazoEjecucion ?? ""),
    datoParrafo("Forma de pago", info?.formaDePago ?? ""),
    datoParrafo("Anticipo", info?.anticipo ?? ""),
    datoParrafo("Vigencia de la oferta", info?.vigenciaOferta ?? ""),
    datoParrafo("Lugar de entrega / ejecución", info?.lugarEntrega ?? ""),
  );

  children.push(tituloSeccion("📅", "Cronograma"));
  children.push(
    datoParrafo("Presentación de oferta", fechasClave.presentacionOferta),
    datoParrafo("Puja / subasta inversa", fechasClave.puja),
    datoParrafo("Adjudicación", fechasClave.adjudicacion),
  );

  children.push(tituloSeccion("📦", "Alcance del proyecto"));
  children.push(new Paragraph({ children: [new TextRun({ text: "Equipos / bienes", bold: true, size: 20 })] }));
  children.push(...checklistParrafos(r?.alcanceEquipos ?? [], "No se detectaron bienes/equipos en el alcance."));
  children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Servicios incluidos", bold: true, size: 20 })] }));
  children.push(...listaParrafos(r?.alcanceServicios ?? [], "No se detectaron servicios en el alcance."));

  if ((r?.requisitosClave.length ?? 0) > 0) {
    children.push(tituloSeccion("🔑", "Requisitos técnicos clave"));
    for (const req of r?.requisitosClave ?? []) {
      children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: req.titulo, bold: true, size: 22 })] }));
      for (const punto of req.puntos) {
        children.push(new Paragraph({ children: [new TextRun({ text: `✔  ${punto}`, size: 20 })] }));
      }
      if (req.referencia) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Referencia: ${req.referencia}`, italics: true, size: 16, color: MUTED })] }));
      }
    }
  }

  if ((r?.infraestructuraExistente.length ?? 0) > 0) {
    children.push(tituloSeccion("🖥️", "Infraestructura existente"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: "La entidad ya cuenta con lo siguiente — no ofertarlo de más:", size: 20, color: MUTED })] }),
    );
    children.push(...listaParrafos(r?.infraestructuraExistente ?? [], ""));
  }

  children.push(tituloSeccion("🛡️", "Garantías y multas"));
  children.push(new Paragraph({ children: [new TextRun({ text: "Garantías exigidas", bold: true, size: 20 })] }));
  children.push(...listaParrafos(info?.garantias ?? [], "No se detectaron garantías exigidas en el pliego."));
  children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Multas", bold: true, size: 20 })] }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: info?.multas || "No se detectaron condiciones de multas en el pliego.",
          size: 20,
          italics: !info?.multas,
          color: info?.multas ? INK : MUTED,
        }),
      ],
    }),
  );

  children.push(tituloSeccion("✅", "Requisitos habilitantes"));
  children.push(...listaParrafos(info?.requisitosHabilitantes ?? [], "No se detectaron requisitos habilitantes específicos en el pliego."));

  children.push(tituloSeccion("⚖️", "Criterios de evaluación de ofertas"));
  children.push(...listaParrafos(info?.criteriosEvaluacion ?? [], "No se detectó una metodología de evaluación explícita en el pliego."));

  children.push(tituloSeccion("📄", "Documentación requerida"));
  children.push(...listaParrafos(r?.documentacionRequerida ?? [], "No se detectaron documentos de sustento específicos en el pliego."));

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

  children.push(tituloSeccion("📋", "Checklist de cumplimiento"));
  children.push(...checklistParrafos(r?.checklist ?? [], "No se generó un checklist específico para este proceso."));

  children.push(tituloSeccion("🗒️", "Observaciones importantes"));
  children.push(...listaParrafos(r?.observaciones ?? [], "No hay observaciones adicionales."));

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: "Este resumen cubre el proceso en general — no incluye el detalle de personal técnico ni su experiencia (Anexo 2 y Anexo 3), ni especificaciones técnicas de producto/marca. Generado automáticamente a partir del análisis del proceso; revisa cada punto antes de presentar la oferta.",
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
