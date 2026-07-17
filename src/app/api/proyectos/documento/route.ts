import { NextRequest, NextResponse } from "next/server";
import { readProyectos, writeProyectos } from "@/lib/proyectosStore";
import { eliminarArchivoProyecto, guardarArchivoProyecto } from "@/lib/proyectoDocumentosStore";
import type { Proyecto } from "@/types/proyecto";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

const CAMPO_POR_TIPO: Record<string, keyof Pick<Proyecto, "archivoActaEntrega" | "archivoCertificadoParticipacion">> = {
  acta: "archivoActaEntrega",
  certificado: "archivoCertificadoParticipacion",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const id = formData?.get("id");
    const tipo = formData?.get("tipo");
    const file = formData?.get("file");

    if (typeof id !== "string" || !id || typeof tipo !== "string" || !(tipo in CAMPO_POR_TIPO) || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Falta el id del proyecto, el tipo de documento (acta o certificado) o el archivo." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el máximo de 8MB." }, { status: 413 });
    }

    const proyectos = await readProyectos();
    const index = proyectos.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el proyecto." }, { status: 404 });
    }

    const campo = CAMPO_POR_TIPO[tipo];
    const previo = proyectos[index][campo];
    const archivo = await guardarArchivoProyecto(id, tipo, file);
    if (previo && previo.url !== archivo.url) {
      await eliminarArchivoProyecto(previo.url);
    }

    proyectos[index] = { ...proyectos[index], [campo]: archivo };
    await writeProyectos(proyectos);

    return NextResponse.json({ proyectos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el documento: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const tipo = req.nextUrl.searchParams.get("tipo");
    if (!id || !tipo || !(tipo in CAMPO_POR_TIPO)) {
      return NextResponse.json(
        { error: "Falta el id del proyecto o el tipo de documento (acta o certificado)." },
        { status: 400 },
      );
    }

    const proyectos = await readProyectos();
    const index = proyectos.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el proyecto." }, { status: 404 });
    }

    const campo = CAMPO_POR_TIPO[tipo];
    const previo = proyectos[index][campo];
    if (previo) await eliminarArchivoProyecto(previo.url);

    proyectos[index] = { ...proyectos[index], [campo]: undefined };
    await writeProyectos(proyectos);

    return NextResponse.json({ proyectos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar el documento: ${message}` },
      { status: 500 },
    );
  }
}
