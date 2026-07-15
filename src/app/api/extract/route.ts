import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Eres un asistente experto en licitaciones y compras públicas en Ecuador, especializado en analizar pliegos para extraer requisitos de personal técnico.

Tu tarea: leer el texto de un pliego de compras públicas y extraer TODA la información relevante para completar dos anexos administrativos:

- Anexo 2: Personal Técnico (Función, Nombre, Nivel de estudio, Titulación académica)
- Anexo 3: Experiencia del Personal Técnico (Personal, Cliente - Fecha de Acta/Factura, Proyecto, Monto)

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

Reglas:
- Genera una fila en "anexo2Sugerido" por cada perfil de especialista distinto que el pliego solicite.
- Genera una fila correspondiente en "anexo3Sugerido" por cada perfil (mismo orden que anexo2Sugerido cuando sea posible).
- Si no encuentras información para alguna categoría de "requisitos", devuelve un arreglo vacío para esa categoría, nunca omitas la clave.
- No inventes información que no esté en el texto del pliego.
- No incluyas explicaciones, solo el JSON.`;

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
      personal: toStringArray(req.personal),
      nivelAcademico: toStringArray(req.nivelAcademico),
      titulacion: toStringArray(req.titulacion),
      certificaciones: toStringArray(req.certificaciones),
      experiencia: toStringArray(req.experiencia),
      otros: toStringArray(req.otros),
    },
    anexo2Sugerido: anexo2,
    anexo3Sugerido: anexo3,
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

    const { text } = (body ?? {}) as { text?: unknown };

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        {
          error:
            "No se recibió texto del pliego. Es posible que el PDF sea un documento escaneado (imagen) sin texto seleccionable.",
        },
        { status: 422 },
      );
    }

    const pdfText = text.trim();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta configurar ANTHROPIC_API_KEY en el servidor." },
        { status: 500 },
      );
    }

    const client = new Anthropic({ apiKey });

    const MAX_CHARS = 400_000;
    const truncated = pdfText.length > MAX_CHARS;
    const textForModel = truncated ? pdfText.slice(0, MAX_CHARS) : pdfText;

    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analiza el siguiente pliego de compras públicas y extrae los requisitos según las instrucciones.${
              truncated ? " (Nota: el documento fue truncado por su extensión; analiza el contenido disponible.)" : ""
            }\n\n<pliego>\n${textForModel}\n</pliego>`,
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
        { error: "El modelo rechazó procesar este documento." },
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
