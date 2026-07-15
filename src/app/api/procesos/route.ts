import { NextRequest, NextResponse } from "next/server";
import { deleteProceso, listProcesos, readProceso, writeProceso } from "@/lib/procesosStore";
import { generarNombreProyecto } from "@/lib/generarNombreProyecto";
import type { Anexo2OverridesMap, ExtractionResult } from "@/types/extraction";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const numero = req.nextUrl.searchParams.get("numero")?.trim();

  if (!numero) {
    // No número given: return the menu of every stored proceso instead.
    try {
      const procesos = await listProcesos();
      return NextResponse.json({ procesos });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      return NextResponse.json(
        { error: `No se pudo listar los procesos guardados: ${message}` },
        { status: 500 },
      );
    }
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
    const anexo2Overrides =
      typeof b.anexo2Overrides === "object" && b.anexo2Overrides !== null
        ? (b.anexo2Overrides as Anexo2OverridesMap)
        : undefined;

    if (!numeroProceso || !result || typeof result !== "object") {
      return NextResponse.json(
        { error: "Falta numeroProceso o el resultado a guardar." },
        { status: 400 },
      );
    }

    const nombreProyecto = generarNombreProyecto(
      result.identificacion?.cliente ?? "",
      result.identificacion?.descripcion ?? "",
    );

    const proceso = {
      numeroProceso,
      nombreProyecto,
      result,
      documentos,
      anexo2Overrides,
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
