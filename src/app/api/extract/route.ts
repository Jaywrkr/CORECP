import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Anexo2Fila, Anexo3Fila, ExtractionResult } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dos prompts, dos llamadas en paralelo (ver POST) en vez de una sola: pedirle
// a Claude anexos + alertas + resumen ejecutivo completo en una sola respuesta
// generaba demasiado texto y, con pliegos grandes, superaba el límite de 60s
// de la función serverless (timeouts 504 reales en producción). Separar en
// dos llamadas más chicas y correrlas con Promise.all reduce el tiempo total
// al máximo de las dos en vez de la suma, sin perder ningún campo.

const SYSTEM_PROMPT_ANEXOS = `Eres un asistente experto en licitaciones y compras públicas en Ecuador, especializado en analizar pliegos para extraer requisitos de personal técnico.

Puedes recibir uno o más documentos en la misma solicitud (por ejemplo: el mismo pliego dividido en partes, distintas secciones de un mismo proceso, o pliegos de procesos relacionados). Cada documento viene delimitado con su nombre de archivo.

Tu tarea: leer TODOS los documentos recibidos y producir UN SOLO resultado consolidado (nunca un resultado por documento) con:

- La identificación del proceso: entidad contratante (cliente) y una descripción corta del objeto de contratación.
- Las fechas y horas clave del proceso: presentación de ofertas, puja (subasta inversa) y adjudicación.
- La información relevante para completar dos anexos administrativos:
  - Anexo 2: Personal Técnico (Función, Nombre, Nivel de estudio, Titulación académica)
  - Anexo 3: Experiencia del Personal Técnico (Personal, Cliente - Fecha de Acta/Factura, Proyecto, Monto)

Reglas para la identificación del proceso:
- "cliente" es la entidad contratante (institución pública que convoca el proceso), en pocas palabras, ej: "ETAPA EP", "EERSSA", "Municipio de Cuenca". Si no se identifica con certeza, usa un nombre corto razonable a partir del texto o "" si es imposible determinarlo.
- "descripcion" es un resumen muy corto (2 a 5 palabras) del objeto de contratación, en mayúsculas, ej: "STORAGE Y VMS", "MANTENIMIENTO VIAL", "CONSULTORIA ESTRUCTURAL". No repitas el nombre del cliente dentro de la descripción.

Reglas para las fechas clave:
- Busca la fecha Y hora (cuando el documento la indique) de: (a) fecha límite para presentar la oferta, (b) fecha de la puja o subasta inversa, (c) fecha de adjudicación.
- Incluye el texto tal como aparece en el documento (fecha, hora y cualquier aclaración como zona horaria o "hora de Ecuador continental"), de forma legible, ej: "15 de marzo de 2026, 10:00" o "Hasta las 17:00 del 20/03/2026".
- Si una fecha no aparece en ningún documento, devuelve un string vacío "" para ese campo — no inventes ni asumas fechas.
- Si distintos documentos mencionan fechas distintas para el mismo hito (p. ej. una fecha fue reprogramada), usa la más reciente/actualizada mencionada.

Reglas de consolidación (muy importantes):
- Si un mismo requisito, perfil o certificación aparece en más de un documento — o se repite dentro del mismo documento — inclúyelo UNA SOLA VEZ en el resultado, aunque esté redactado con palabras distintas pero signifique lo mismo. Usa la redacción más clara y completa entre las variantes.
- Nunca dupliques filas de Anexo 2 o Anexo 3 para el mismo perfil/función.
- Si los documentos piden perfiles distintos, inclúyelos todos, pero sin duplicar los que se repitan entre documentos.
- El objetivo es que el usuario NO se pierda entre información redundante: prioriza una lista corta, clara y sin repeticiones por encima de una lista exhaustiva con duplicados.
- No inventes información que no esté en el texto de los documentos.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto adicional, sin bloques de código) con exactamente esta forma:

{
  "requisitos": {
    "personal": ["string describiendo cargo/especialidad y cantidad requerida"],
    "nivelAcademico": ["string describiendo el nivel académico exigido"],
    "titulacion": ["string describiendo la titulación específica requerida"],
    "certificaciones": ["string describiendo certificaciones técnicas exigidas"],
    "experiencia": ["string describiendo experiencia mínima requerida: años, cantidad de proyectos, tipo de proyecto"],
    "otros": ["string con cualquier otro requisito relevante para el personal técnico"]
  },
  "fechasClave": {
    "presentacionOferta": "fecha y hora límite para presentar la oferta, o \\"\\" si no aparece",
    "puja": "fecha y hora de la puja/subasta inversa, o \\"\\" si no aparece",
    "adjudicacion": "fecha de adjudicación, o \\"\\" si no aparece"
  },
  "identificacion": {
    "cliente": "entidad contratante, ej. ETAPA EP",
    "descripcion": "resumen corto del objeto de contratación en mayúsculas, ej. STORAGE Y VMS"
  },
  "anexo2Sugerido": [
    {
      "funcion": "cargo o especialidad del perfil, ej. Especialista en Estructuras",
      "nivelEstudio": "ej. Tercer Nivel",
      "titulacionAcademica": "ej. Ingeniería Civil"
    }
  ],
  "anexo3Sugerido": [
    {
      "personal": "cargo o especialidad correspondiente al mismo perfil de anexo2Sugerido",
      "requisitoExperiencia": "texto sugerido del requisito de experiencia a cumplir, ej: 'Se deberá acreditar experiencia de haber participado como técnico en al menos un (1) proyecto, ejecutado en mínimo un (1) año, como especialista en...'"
    }
  ]
}

Reglas de formato:
- Genera una fila en "anexo2Sugerido" por cada perfil de especialista distinto (consolidado entre todos los documentos).
- Genera una fila correspondiente en "anexo3Sugerido" por cada perfil (mismo orden que anexo2Sugerido cuando sea posible).
- Si no encuentras información para alguna categoría de "requisitos", devuelve un arreglo vacío para esa categoría, nunca omitas la clave.
- "fechasClave" siempre debe incluir las tres claves (presentacionOferta, puja, adjudicacion), usando "" cuando no se encuentre esa fecha.
- "identificacion" siempre debe incluir "cliente" y "descripcion", usando "" cuando no se pueda determinar.
- No incluyas explicaciones, solo el JSON.`;

const SYSTEM_PROMPT_RESUMEN = `Eres un asistente experto en licitaciones y compras públicas en Ecuador, especializado en analizar pliegos (y sus aclaraciones/actas de preguntas y respuestas) para preparar un resumen ejecutivo del proceso completo — presupuesto, plazos, alcance, reglas de participación y obligaciones del oferente. NO analizas aquí el personal técnico ni su experiencia (eso lo cubre otro proceso aparte).

Puedes recibir uno o más documentos en la misma solicitud (el mismo pliego dividido en partes, o pliegos/aclaraciones de un mismo proceso). Cada documento viene delimitado con su nombre de archivo, y dentro de cada documento cada página está marcada con una línea "--- Página N ---" antes de su contenido. Lee TODOS y produce UN SOLO resultado consolidado.

Regla de citación (OBLIGATORIA, aplica a TODO el resultado): cada dato que extraigas debe venir acompañado de su cita — nombre del documento y número de página tomados literalmente de las marcas "--- Página N ---", y la sección/cláusula/numeral del pliego si el texto de esa página lo indica (ej. "Sección 5.2", "Numeral 3.1", "Pregunta 4"). Nunca omitas la cita si el dato viene de un documento — solo se permite no citar cuando el campo queda vacío porque no se encontró información. Formato de cita: "nombre-archivo.pdf, página N" o "nombre-archivo.pdf, página N, sección X" cuando el pliego tenga una sección identificable. Agrega esta cita entre paréntesis al final de cada dato/string que extraigas (presupuesto, plazos, garantías, multas, requisitos habilitantes, criterios de evaluación, alcance, infraestructura existente, documentación requerida, checklist, observaciones, y el detalle de cada alerta) — sé lo más específico posible, nunca inventes una página o sección que no puedas verificar en el texto.

Regla de autosuficiencia (OBLIGATORIA, tan importante como la de citación): quien lea el resumen NO debe tener que abrir el pliego original para entender de qué se trata. La cita es una forma de VERIFICAR el dato, nunca un reemplazo del dato. Está PROHIBIDO escribir algo como "Tal como se indica en el documento de Preguntas y Respuestas", "Ver aclaración 3", "Según lo establecido en el pliego" o cualquier frase que remita al lector al documento sin decir qué dice el documento. Cada punto, observación, ítem de checklist o requisito debe explicar el contenido real y completo por sí mismo — la cita va SIEMPRE al final, además del contenido, nunca en lugar de él. Ejemplo INCORRECTO: "Se debe cumplir lo indicado en la Pregunta 2 del acta de aclaraciones." Ejemplo CORRECTO: "Los procesadores deben cumplir como mínimo el número de núcleos, frecuencia y caché exigidos en el pliego original; se aceptan equivalentes que igualen o superen ese rendimiento (aclaraciones.pdf, página 2, Pregunta 2)."

Tu tarea es producir:

1) Tres alertas puntuales sobre obligaciones del oferente: si el pliego exige presentar un cronograma de implementación, qué código(s) CPC identifican el objeto de contratación (para verificar si aplica transferencia de tecnología nivel TT2), y si hay que entregar manuales de uso.

Reglas para las alertas:
- "codigosCpc": todos los códigos CPC (numéricos, típicamente de 7 a 11 dígitos) que el pliego use para identificar el/los bien(es) o servicio(s) contratados — busca términos como "Código CPC", "CPC N9", "Clasificador Central de Productos". Arreglo vacío si el pliego no menciona ningún código CPC.
- "cronograma": "requerido" es true si el pliego pide al OFERENTE (no a la entidad contratante) presentar un cronograma de implementación/ejecución del proyecto como parte de la oferta. "detalle" es una cita breve o paráfrasis del texto que lo exige, terminando con la referencia de documento y página (ej. "Se exige cronograma de implementación como parte de la oferta técnica. (pliego.pdf, página 12, sección 4.3)"), o "" si no se encontró.
- "manuales": "requerido" es true si el pliego exige entregar manuales de uso/manejo del producto (en cualquier formato). "detalle" describe el formato exigido si se indica (ej. "físico y digital"), terminando con la referencia de documento y página, o "" si no se encontró o no especifica formato.

2) Información general del proceso: presupuesto, plazos, forma de pago, garantías, multas y las reglas de participación/calificación de ofertas. Cada valor no vacío debe terminar con su referencia de documento y página, ej. "$45.320,00 sin IVA (pliego.pdf, página 3)".

Reglas para la información general del proceso:
- "presupuestoReferencial": el monto del presupuesto referencial del proceso, con el texto tal como aparece + referencia, o "" si no aparece.
- "plazoEjecucion": plazo de ejecución/entrega del contrato + referencia, o "" si no aparece.
- "formaDePago": condiciones de pago + referencia, o "" si no aparece.
- "anticipo": porcentaje o condición del anticipo + referencia, o "" si no aplica o no aparece.
- "vigenciaOferta": tiempo que la oferta debe mantenerse vigente + referencia, o "" si no aparece.
- "lugarEntrega": lugar de entrega/ejecución de los bienes/servicios + referencia, o "" si no aparece.
- "modalidadContratacion": el procedimiento de contratación (ej. "Subasta Inversa Electrónica", "Menor Cuantía", "Licitación", "Cotización", "Ínfima Cuantía", "Régimen Especial") + referencia, o "" si no se identifica.
- "garantias": arreglo con las garantías que el oferente/adjudicatario debe rendir, cada una con su referencia (ej. "Garantía de fiel cumplimiento del contrato (pliego.pdf, página 8, sección 6.1)"). Arreglo vacío si no aparecen.
- "multas": condiciones de multas por atraso o incumplimiento + referencia, o "" si no aparece.
- "requisitosHabilitantes": arreglo con los requisitos para poder participar/ser habilitado, cada uno con su referencia. Arreglo vacío si no se detectan.
- "criteriosEvaluacion": arreglo con los criterios o metodología de evaluación/calificación de las ofertas, cada uno con su referencia. Arreglo vacío si no se detectan.

3) Un resumen ejecutivo y checklist de cumplimiento de TODO el proceso: alcance del proyecto (equipos y servicios), infraestructura que la entidad ya posee (para no ofertarla de más), requisitos técnicos clave agrupados por tema (con su referencia dentro del pliego o de aclaraciones/acta de preguntas y respuestas si el documento las tiene), documentación que hay que sustentar, un checklist final verificable y observaciones importantes de cierre.

Reglas para el resumen ejecutivo (clave "resumenEjecutivo"):
- Si los documentos incluyen una o más "Actas de Preguntas y Respuestas" o aclaraciones del proceso, dales prioridad: muchas veces flexibilizan o aclaran cómo se puede demostrar el cumplimiento de un requisito del pliego original (sin reducir el requisito mínimo) — captura eso en "requisitosClave" y en "observaciones", citando el documento de aclaración (no solo el pliego original).
- "objetivo": una frase breve sobre el propósito de este resumen, ej. "Facilitar la preparación de la oferta resaltando los requisitos obligatorios, aclaraciones emitidas por la entidad y puntos que deben verificarse antes de la presentación." (este campo no necesita referencia, es un resumen tuyo, no una cita).
- "entidadContratante": el nombre completo de la entidad contratante + referencia.
- "alcanceEquipos": arreglo con los equipos/bienes principales del alcance, cada uno con su referencia. Arreglo vacío si el proceso no incluye bienes.
- "alcanceServicios": arreglo con los servicios incluidos en el alcance, cada uno con su referencia. Arreglo vacío si no aplica.
- "infraestructuraExistente": arreglo con la infraestructura que la entidad YA POSEE, cada ítem con su referencia. Arreglo vacío si no se menciona.
- "requisitosClave": arreglo de objetos { "titulo", "puntos": string[], "referencia" } — agrupa por tema los requisitos técnicos y aclaraciones más importantes para preparar la oferta. El campo "referencia" es OBLIGATORIO siempre que el grupo venga de un documento (formato "nombre-archivo.pdf, página N" o "nombre-archivo.pdf, página N, sección X" — usa el nombre real del documento y el número de página de la marca "--- Página N ---" más cercana al texto del que sacaste el punto; si el grupo mezcla puntos de varias páginas, cita todas, ej. "pliego.pdf, páginas 5 y 12"). Solo puede quedar "" si realmente no puedes ubicar ninguna página (evítalo). Cubre equipos, compatibilidad, marcas, licenciamiento, sistema operativo, etc., lo que sea relevante en ESTE pliego. Máximo 6 grupos, y máximo 4 puntos por grupo — prioriza lo más importante.
- "documentacionRequerida": arreglo con los documentos que hay que adjuntar para sustentar el cumplimiento de requisitos técnicos, cada uno con su referencia. No incluyas documentos de personal técnico.
- "checklist": arreglo de 5 a 12 ítems concretos y verificables que el oferente debe confirmar antes de presentar la oferta, cada uno con su referencia.
- "observaciones": arreglo de 2 a 5 notas importantes de cierre, cada una con su referencia.
- Si un documento no aporta información para alguna de estas claves, usa arreglos vacíos o "" — nunca inventes contenido ni una referencia que no esté en los documentos.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto adicional, sin bloques de código) con exactamente esta forma:

{
  "alertas": {
    "codigosCpc": ["código CPC tal como aparece en el documento"],
    "cronograma": { "requerido": true, "detalle": "cita o paráfrasis breve del requisito terminando en (documento.pdf, página N), o \\"\\" si no aplica" },
    "manuales": { "requerido": true, "detalle": "formato exigido terminando en (documento.pdf, página N), o \\"\\" si no aplica o no se especifica" }
  },
  "informacionGeneral": {
    "presupuestoReferencial": "ej. $45.320,00 sin IVA (pliego.pdf, página 3), o \\"\\"",
    "plazoEjecucion": "",
    "formaDePago": "",
    "anticipo": "",
    "vigenciaOferta": "",
    "lugarEntrega": "",
    "modalidadContratacion": "",
    "garantias": [],
    "multas": "",
    "requisitosHabilitantes": [],
    "criteriosEvaluacion": []
  },
  "resumenEjecutivo": {
    "objetivo": "",
    "entidadContratante": "",
    "alcanceEquipos": [],
    "alcanceServicios": [],
    "infraestructuraExistente": [],
    "requisitosClave": [
      { "titulo": "ej. Procesadores", "puntos": ["punto 1", "punto 2"], "referencia": "ej. pliego.pdf, página 7, sección 4.2" }
    ],
    "documentacionRequerida": [],
    "checklist": [],
    "observaciones": []
  }
}

No incluyas explicaciones, solo el JSON.`;

interface InputDocument {
  filename: string;
  text: string;
}

function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No se encontró un objeto JSON en la respuesta.");
  }
  const candidate = text.slice(start, end + 1);
  return JSON.parse(candidate);
}

function normalizeForDedup(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const trimmed = raw.trim();
    const key = normalizeForDedup(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function dedupeAnexo2(rows: Anexo2Fila[]): Anexo2Fila[] {
  const seen = new Set<string>();
  const out: Anexo2Fila[] = [];
  for (const row of rows) {
    const key = [row.funcion, row.nivelEstudio, row.titulacionAcademica].map(normalizeForDedup).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function dedupeAnexo3(rows: Anexo3Fila[]): Anexo3Fila[] {
  const seen = new Set<string>();
  const out: Anexo3Fila[] = [];
  for (const row of rows) {
    const key = [row.personal, row.requisitoExperiencia].map(normalizeForDedup).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const toTrimmedString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function normalizeAnexos(data: unknown): Pick<ExtractionResult, "requisitos" | "fechasClave" | "identificacion" | "anexo2Sugerido" | "anexo3Sugerido"> {
  if (typeof data !== "object" || data === null) {
    throw new Error("La respuesta no tiene el formato esperado.");
  }
  const obj = data as Record<string, unknown>;
  const req = (obj.requisitos ?? {}) as Record<string, unknown>;
  const fechas = (obj.fechasClave ?? {}) as Record<string, unknown>;
  const identificacion = (obj.identificacion ?? {}) as Record<string, unknown>;

  const anexo2 = Array.isArray(obj.anexo2Sugerido)
    ? obj.anexo2Sugerido.map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
          funcion: typeof r.funcion === "string" ? r.funcion : "",
          nivelEstudio: typeof r.nivelEstudio === "string" ? r.nivelEstudio : "",
          titulacionAcademica:
            typeof r.titulacionAcademica === "string" ? r.titulacionAcademica : "",
        };
      })
    : [];

  const anexo3 = Array.isArray(obj.anexo3Sugerido)
    ? obj.anexo3Sugerido.map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
          personal: typeof r.personal === "string" ? r.personal : "",
          requisitoExperiencia:
            typeof r.requisitoExperiencia === "string" ? r.requisitoExperiencia : "",
        };
      })
    : [];

  return {
    requisitos: {
      personal: dedupeStrings(toStringArray(req.personal)),
      nivelAcademico: dedupeStrings(toStringArray(req.nivelAcademico)),
      titulacion: dedupeStrings(toStringArray(req.titulacion)),
      certificaciones: dedupeStrings(toStringArray(req.certificaciones)),
      experiencia: dedupeStrings(toStringArray(req.experiencia)),
      otros: dedupeStrings(toStringArray(req.otros)),
    },
    fechasClave: {
      presentacionOferta: toTrimmedString(fechas.presentacionOferta),
      puja: toTrimmedString(fechas.puja),
      adjudicacion: toTrimmedString(fechas.adjudicacion),
    },
    identificacion: {
      cliente: toTrimmedString(identificacion.cliente),
      descripcion: toTrimmedString(identificacion.descripcion),
    },
    anexo2Sugerido: dedupeAnexo2(anexo2),
    anexo3Sugerido: dedupeAnexo3(anexo3),
  };
}

function normalizeResumen(data: unknown): Pick<ExtractionResult, "alertas" | "informacionGeneral" | "resumenEjecutivo"> {
  if (typeof data !== "object" || data === null) {
    throw new Error("La respuesta no tiene el formato esperado.");
  }
  const obj = data as Record<string, unknown>;

  const alertasRaw = (obj.alertas ?? {}) as Record<string, unknown>;
  const toAlerta = (v: unknown): { requerido: boolean; detalle: string } => {
    const a = (v ?? {}) as Record<string, unknown>;
    return {
      requerido: a.requerido === true,
      detalle: toTrimmedString(a.detalle),
    };
  };

  const infoGeneralRaw = (obj.informacionGeneral ?? {}) as Record<string, unknown>;
  const resumenRaw = (obj.resumenEjecutivo ?? {}) as Record<string, unknown>;
  const requisitosClaveRaw = Array.isArray(resumenRaw.requisitosClave) ? resumenRaw.requisitosClave : [];
  const requisitosClave = requisitosClaveRaw
    .map((r) => {
      const item = (r ?? {}) as Record<string, unknown>;
      return {
        titulo: toTrimmedString(item.titulo),
        puntos: dedupeStrings(toStringArray(item.puntos)),
        referencia: toTrimmedString(item.referencia),
      };
    })
    .filter((r) => r.titulo || r.puntos.length > 0);

  return {
    alertas: {
      codigosCpc: dedupeStrings(toStringArray(alertasRaw.codigosCpc)),
      cronograma: toAlerta(alertasRaw.cronograma),
      manuales: toAlerta(alertasRaw.manuales),
    },
    informacionGeneral: {
      presupuestoReferencial: toTrimmedString(infoGeneralRaw.presupuestoReferencial),
      plazoEjecucion: toTrimmedString(infoGeneralRaw.plazoEjecucion),
      formaDePago: toTrimmedString(infoGeneralRaw.formaDePago),
      anticipo: toTrimmedString(infoGeneralRaw.anticipo),
      vigenciaOferta: toTrimmedString(infoGeneralRaw.vigenciaOferta),
      lugarEntrega: toTrimmedString(infoGeneralRaw.lugarEntrega),
      modalidadContratacion: toTrimmedString(infoGeneralRaw.modalidadContratacion),
      garantias: dedupeStrings(toStringArray(infoGeneralRaw.garantias)),
      multas: toTrimmedString(infoGeneralRaw.multas),
      requisitosHabilitantes: dedupeStrings(toStringArray(infoGeneralRaw.requisitosHabilitantes)),
      criteriosEvaluacion: dedupeStrings(toStringArray(infoGeneralRaw.criteriosEvaluacion)),
    },
    resumenEjecutivo: {
      objetivo: toTrimmedString(resumenRaw.objetivo),
      entidadContratante: toTrimmedString(resumenRaw.entidadContratante),
      alcanceEquipos: dedupeStrings(toStringArray(resumenRaw.alcanceEquipos)),
      alcanceServicios: dedupeStrings(toStringArray(resumenRaw.alcanceServicios)),
      infraestructuraExistente: dedupeStrings(toStringArray(resumenRaw.infraestructuraExistente)),
      requisitosClave,
      documentacionRequerida: dedupeStrings(toStringArray(resumenRaw.documentacionRequerida)),
      checklist: dedupeStrings(toStringArray(resumenRaw.checklist)),
      observaciones: dedupeStrings(toStringArray(resumenRaw.observaciones)),
    },
  };
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  instruction: string,
  documentBlocks: string[],
  maxTokens: number,
): Promise<unknown> {
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${instruction}\n\n${documentBlocks.join("\n\n")}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("El modelo rechazó procesar estos documentos.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("La respuesta se cortó por longitud — el pliego es muy extenso para procesarlo de una vez.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("La API no devolvió una respuesta de texto válida.");
  }

  return extractJson(textBlock.text);
}

const RESUMEN_VACIO: Pick<ExtractionResult, "alertas" | "informacionGeneral" | "resumenEjecutivo"> = {
  alertas: {
    codigosCpc: [],
    cronograma: { requerido: false, detalle: "" },
    manuales: { requerido: false, detalle: "" },
  },
  informacionGeneral: {
    presupuestoReferencial: "",
    plazoEjecucion: "",
    formaDePago: "",
    anticipo: "",
    vigenciaOferta: "",
    lugarEntrega: "",
    modalidadContratacion: "",
    garantias: [],
    multas: "",
    requisitosHabilitantes: [],
    criteriosEvaluacion: [],
  },
  resumenEjecutivo: {
    objetivo: "",
    entidadContratante: "",
    alcanceEquipos: [],
    alcanceServicios: [],
    infraestructuraExistente: [],
    requisitosClave: [],
    documentacionRequerida: [],
    checklist: [],
    observaciones: [],
  },
};

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no tiene un cuerpo JSON válido." },
        { status: 400 },
      );
    }

    const { documents } = (body ?? {}) as { documents?: unknown };

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se recibió texto de ningún documento. Es posible que el PDF sea un documento escaneado (imagen) sin texto seleccionable.",
        },
        { status: 422 },
      );
    }

    const validDocuments: InputDocument[] = documents
      .map((d) => {
        const doc = (d ?? {}) as Record<string, unknown>;
        return {
          filename: typeof doc.filename === "string" ? doc.filename : "documento.pdf",
          text: typeof doc.text === "string" ? doc.text.trim() : "",
        };
      })
      .filter((d) => d.text.length > 0);

    if (validDocuments.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se recibió texto de ningún documento. Es posible que el PDF sea un documento escaneado (imagen) sin texto seleccionable.",
        },
        { status: 422 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta configurar ANTHROPIC_API_KEY en el servidor." },
        { status: 500 },
      );
    }

    const client = new Anthropic({ apiKey });

    // Claude Sonnet 5 has a 1M-token context window, so a generous per-request
    // character budget shared across all documents is safe.
    const MAX_TOTAL_CHARS = 700_000;
    let remaining = MAX_TOTAL_CHARS;
    let anyTruncated = false;
    const documentBlocks = validDocuments.map((doc) => {
      let text = doc.text;
      if (text.length > remaining) {
        text = text.slice(0, Math.max(0, remaining));
        anyTruncated = true;
      }
      remaining = Math.max(0, remaining - text.length);
      return `<documento nombre="${doc.filename.replace(/"/g, "'")}">\n${text}\n</documento>`;
    });

    const isMultiple = validDocuments.length > 1;
    const truncNote = anyTruncated
      ? " (Nota: parte del contenido fue truncado por su extensión total; analiza el contenido disponible.)"
      : "";
    const instructionAnexos = isMultiple
      ? `Analiza los siguientes ${validDocuments.length} documentos de compras públicas y extrae el personal técnico y los anexos según las instrucciones.${truncNote}`
      : `Analiza el siguiente pliego de compras públicas y extrae el personal técnico y los anexos según las instrucciones.${truncNote}`;
    const instructionResumen = isMultiple
      ? `Analiza los siguientes ${validDocuments.length} documentos de compras públicas y arma el resumen ejecutivo del proceso según las instrucciones.${truncNote}`
      : `Analiza el siguiente pliego de compras públicas y arma el resumen ejecutivo del proceso según las instrucciones.${truncNote}`;

    // Las dos llamadas son independientes a propósito: el resumen ejecutivo
    // (alertas/informacionGeneral/resumenEjecutivo) es una funcionalidad
    // nueva y más propensa a fallar (respuesta más larga, más arreglos). Si
    // falla, NO debe tumbar el análisis de personal técnico/Anexo 2/Anexo 3,
    // que es lo esencial y ya funcionaba de forma confiable — el resumen
    // simplemente queda vacío y el usuario puede reintentarlo por separado.
    const [anexosSettled, resumenSettled] = await Promise.allSettled([
      callClaude(client, SYSTEM_PROMPT_ANEXOS, instructionAnexos, documentBlocks, 8000),
      callClaude(client, SYSTEM_PROMPT_RESUMEN, instructionResumen, documentBlocks, 8000),
    ]);

    if (anexosSettled.status === "rejected") {
      const message = anexosSettled.reason instanceof Error ? anexosSettled.reason.message : "Error desconocido";
      return NextResponse.json(
        { error: `Error al comunicarse con la API de Claude: ${message}` },
        { status: 502 },
      );
    }

    let anexosParte: ReturnType<typeof normalizeAnexos>;
    try {
      anexosParte = normalizeAnexos(anexosSettled.value);
    } catch {
      return NextResponse.json(
        { error: "La respuesta de la API no tiene la estructura esperada." },
        { status: 502 },
      );
    }

    let resumenParte: ReturnType<typeof normalizeResumen> = RESUMEN_VACIO;
    if (resumenSettled.status === "fulfilled") {
      try {
        resumenParte = normalizeResumen(resumenSettled.value);
      } catch (err) {
        console.error("Resumen ejecutivo con estructura inesperada (no bloqueante):", err);
      }
    } else {
      console.error("Resumen ejecutivo falló (no bloqueante):", resumenSettled.reason);
    }

    const result: ExtractionResult = { ...anexosParte, ...resumenParte };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error inesperado procesando la solicitud: ${message}` },
      { status: 500 },
    );
  }
}
