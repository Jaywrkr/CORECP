import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Anexo2Fila, Anexo3Fila, ExtractionResult } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Eres un asistente experto en licitaciones y compras públicas en Ecuador, especializado en analizar pliegos para extraer requisitos de personal técnico.

Puedes recibir uno o más documentos en la misma solicitud (por ejemplo: el mismo pliego dividido en partes, distintas secciones de un mismo proceso, o pliegos de procesos relacionados). Cada documento viene delimitado con su nombre de archivo.

Tu tarea: leer TODOS los documentos recibidos y producir UN SOLO resultado consolidado (nunca un resultado por documento) con la información relevante para completar dos anexos administrativos:

- Anexo 2: Personal Técnico (Función, Nombre, Nivel de estudio, Titulación académica)
- Anexo 3: Experiencia del Personal Técnico (Personal, Cliente - Fecha de Acta/Factura, Proyecto, Monto)

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
- No incluyas explicaciones, solo el JSON.`;

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

function normalizeResult(data: unknown): ExtractionResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("La respuesta no tiene el formato esperado.");
  }
  const obj = data as Record<string, unknown>;
  const req = (obj.requisitos ?? {}) as Record<string, unknown>;

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

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
    anexo2Sugerido: dedupeAnexo2(anexo2),
    anexo3Sugerido: dedupeAnexo3(anexo3),
  };
}

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
    const instruction = isMultiple
      ? `Analiza los siguientes ${validDocuments.length} documentos de compras públicas y extrae UN SOLO resultado consolidado según las instrucciones.${
          anyTruncated ? " (Nota: parte del contenido fue truncado por su extensión total; analiza el contenido disponible.)" : ""
        }`
      : `Analiza el siguiente pliego de compras públicas y extrae los requisitos según las instrucciones.${
          anyTruncated ? " (Nota: el documento fue truncado por su extensión; analiza el contenido disponible.)" : ""
        }`;

    let response;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${instruction}\n\n${documentBlocks.join("\n\n")}`,
          },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      return NextResponse.json(
        { error: `Error al comunicarse con la API de Claude: ${message}` },
        { status: 502 },
      );
    }

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "El modelo rechazó procesar estos documentos." },
        { status: 422 },
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "La API no devolvió una respuesta de texto válida." },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: "La respuesta de la API no pudo interpretarse como JSON válido." },
        { status: 502 },
      );
    }

    let result: ExtractionResult;
    try {
      result = normalizeResult(parsed);
    } catch {
      return NextResponse.json(
        { error: "La respuesta de la API no tiene la estructura esperada." },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error inesperado procesando la solicitud: ${message}` },
      { status: 500 },
    );
  }
}
