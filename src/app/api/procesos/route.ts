import { NextRequest, NextResponse } from "next/server";
import { deleteProceso, readProceso, writeProceso } from "@/lib/procesosStore";
import type { ExtractionResult } from "@/types/extraction";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const numero = req.nextUrl.searchParams.get("numero")?.trim();
  if (!numero) {
    return NextResponse.json({ error: "Falta el número de proceso." }, { status: 400 });
  }

  try {
    const proceso = await readProceso(numero);
    return NextResponse.json({ proceso });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo leer el caché del proceso: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;

    const numeroProceso = typeof b.numeroProceso === "string" ? b.numeroProceso.trim() : "";
    const result = b.result as ExtractionResult | undefined;
    const documentos = Array.isArray(b.documentos)
      ? b.documentos.filter((d): d is string => typeof d === "string")
      : [];

    if (!numeroProceso || !result || typeof result !== "object") {
      return NextResponse.json(
        { error: "Falta numeroProceso o el resultado a guardar." },
        { status: 400 },
      );
    }

    const proceso = {
      numeroProceso,
      result,
      documentos,
      actualizadoEn: new Date().toISOString(),
    };

    await writeProceso(proceso);
    return NextResponse.json({ proceso }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el caché del proceso: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const numero = req.nextUrl.searchParams.get("numero")?.trim();
  if (!numero) {
    return NextResponse.json({ error: "Falta el número de proceso." }, { status: 400 });
  }

  try {
    await deleteProceso(numero);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar el caché del proceso: ${message}` },
      { status: 500 },
    );
  }
}
