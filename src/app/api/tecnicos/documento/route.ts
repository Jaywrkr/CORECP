import { NextRequest, NextResponse } from "next/server";
import { readTecnicos, writeTecnicos } from "@/lib/tecnicosStore";
import { eliminarDocumentoTecnico, guardarDocumentoTecnico } from "@/lib/tecnicoDocumentosStore";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const id = formData?.get("id");
    const file = formData?.get("file");

    if (typeof id !== "string" || !id || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Falta el id del técnico o el archivo a subir." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el máximo de 8MB." }, { status: 413 });
    }

    const tecnicos = await readTecnicos();
    const index = tecnicos.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el técnico." }, { status: 404 });
    }

    const previousUrl = tecnicos[index].documentoUrl;
    const { url, nombre } = await guardarDocumentoTecnico(id, file);
    if (previousUrl && previousUrl !== url) {
      await eliminarDocumentoTecnico(previousUrl);
    }

    tecnicos[index] = { ...tecnicos[index], documentoUrl: url, documentoNombre: nombre };
    await writeTecnicos(tecnicos);

    return NextResponse.json({ tecnicos });
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
    if (!id) {
      return NextResponse.json({ error: "Falta el id del técnico." }, { status: 400 });
    }

    const tecnicos = await readTecnicos();
    const index = tecnicos.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el técnico." }, { status: 404 });
    }

    const url = tecnicos[index].documentoUrl;
    if (url) await eliminarDocumentoTecnico(url);

    tecnicos[index] = { ...tecnicos[index], documentoUrl: undefined, documentoNombre: undefined };
    await writeTecnicos(tecnicos);

    return NextResponse.json({ tecnicos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar el documento: ${message}` },
      { status: 500 },
    );
  }
}
