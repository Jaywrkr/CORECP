import { NextRequest, NextResponse } from "next/server";
import { readTecnicos, writeTecnicos } from "@/lib/tecnicosStore";
import { eliminarArchivoDocumentoTecnico, guardarArchivosDocumentoTecnico } from "@/lib/tecnicoDocumentosStore";

export const runtime = "nodejs";

const MAX_BYTES_POR_ARCHIVO = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const id = formData?.get("id");
    const tipo = formData?.get("tipo");
    const files = formData?.getAll("files").filter((f): f is File => f instanceof File) ?? [];

    if (typeof id !== "string" || !id || typeof tipo !== "string" || !tipo.trim() || files.length === 0) {
      return NextResponse.json(
        { error: "Falta el id del técnico, el tipo de documento o los archivos a subir." },
        { status: 400 },
      );
    }

    const tooBig = files.find((f) => f.size > MAX_BYTES_POR_ARCHIVO);
    if (tooBig) {
      return NextResponse.json(
        { error: `El archivo "${tooBig.name}" supera el máximo de 8MB.` },
        { status: 413 },
      );
    }

    const tecnicos = await readTecnicos();
    const index = tecnicos.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el técnico." }, { status: 404 });
    }

    const subidos = await guardarArchivosDocumentoTecnico(id, tipo, files);
    const documentosPrevios = tecnicos[index].documentos ?? {};
    tecnicos[index] = {
      ...tecnicos[index],
      documentos: {
        ...documentosPrevios,
        [tipo]: [...(documentosPrevios[tipo] ?? []), ...subidos],
      },
    };
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
    const tipo = req.nextUrl.searchParams.get("tipo");
    const url = req.nextUrl.searchParams.get("url");
    if (!id || !tipo) {
      return NextResponse.json(
        { error: "Falta el id del técnico o el tipo de documento." },
        { status: 400 },
      );
    }

    const tecnicos = await readTecnicos();
    const index = tecnicos.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el técnico." }, { status: 404 });
    }

    const documentos = { ...(tecnicos[index].documentos ?? {}) };
    const archivos = documentos[tipo] ?? [];

    if (url) {
      // Remove a single file from the group.
      const archivo = archivos.find((a) => a.url === url);
      if (archivo) await eliminarArchivoDocumentoTecnico(archivo.url);
      const restantes = archivos.filter((a) => a.url !== url);
      if (restantes.length > 0) {
        documentos[tipo] = restantes;
      } else {
        delete documentos[tipo];
      }
    } else {
      // Remove the whole group.
      await Promise.all(archivos.map((a) => eliminarArchivoDocumentoTecnico(a.url)));
      delete documentos[tipo];
    }

    tecnicos[index] = { ...tecnicos[index], documentos };
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
