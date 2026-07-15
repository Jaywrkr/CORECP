import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readTecnicos, writeTecnicos } from "@/lib/tecnicosStore";
import type { Tecnico } from "@/types/tecnico";

export const runtime = "nodejs";

function parseTecnicoInput(body: unknown): Omit<Tecnico, "id"> | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  const cedula = typeof b.cedula === "string" ? b.cedula.trim() : "";
  if (!nombre || !cedula) return null;

  const rol = typeof b.rol === "string" && b.rol.trim() ? b.rol.trim() : "Técnico";
  const tituloAcademico = typeof b.tituloAcademico === "string" ? b.tituloAcademico.trim() : "";
  const cuartoNivelTitulo = typeof b.cuartoNivelTitulo === "string" ? b.cuartoNivelTitulo.trim() || undefined : undefined;
  const nivelEstudio = typeof b.nivelEstudio === "string" ? b.nivelEstudio.trim() : "";
  const fechaContrato = typeof b.fechaContrato === "string" ? b.fechaContrato.trim() || undefined : undefined;
  const fechaIngreso = typeof b.fechaIngreso === "string" ? b.fechaIngreso.trim() || undefined : undefined;
  const certificaciones = Array.isArray(b.certificaciones)
    ? b.certificaciones.filter((c): c is string => typeof c === "string" && c.trim().length > 0).map((c) => c.trim())
    : [];
  const notas = typeof b.notas === "string" ? b.notas.trim() || undefined : undefined;

  return {
    nombre,
    cedula,
    rol,
    tituloAcademico,
    cuartoNivelTitulo,
    nivelEstudio,
    fechaContrato,
    fechaIngreso,
    certificaciones,
    notas,
  };
}

export async function GET() {
  try {
    const tecnicos = await readTecnicos();
    return NextResponse.json({ tecnicos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo leer la lista de técnicos: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseTecnicoInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Nombre y cédula son obligatorios." },
        { status: 400 },
      );
    }

    const tecnicos = await readTecnicos();
    const nuevo: Tecnico = { id: randomUUID(), ...input };
    tecnicos.push(nuevo);
    await writeTecnicos(tecnicos);

    return NextResponse.json({ tecnicos }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el técnico: ${message}` },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null || typeof (body as { id?: unknown }).id !== "string") {
      return NextResponse.json({ error: "Falta el id del técnico a actualizar." }, { status: 400 });
    }
    const id = (body as { id: string }).id;

    const input = parseTecnicoInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Nombre y cédula son obligatorios." },
        { status: 400 },
      );
    }

    const tecnicos = await readTecnicos();
    const index = tecnicos.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el técnico." }, { status: 404 });
    }

    tecnicos[index] = { id, ...input };
    await writeTecnicos(tecnicos);

    return NextResponse.json({ tecnicos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo actualizar el técnico: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta el id del técnico a eliminar." }, { status: 400 });
    }

    const tecnicos = await readTecnicos();
    const next = tecnicos.filter((t) => t.id !== id);
    await writeTecnicos(next);

    return NextResponse.json({ tecnicos: next });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar el técnico: ${message}` },
      { status: 500 },
    );
  }
}
