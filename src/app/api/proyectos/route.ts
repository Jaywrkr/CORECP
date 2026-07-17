import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readProyectos, writeProyectos } from "@/lib/proyectosStore";
import type { Proyecto } from "@/types/proyecto";

export const runtime = "nodejs";

function parseProyectoInput(body: unknown): Omit<Proyecto, "id"> | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const cliente = typeof b.cliente === "string" ? b.cliente.trim() : "";
  const descripcionCorta = typeof b.descripcionCorta === "string" ? b.descripcionCorta.trim() : "";
  if (!cliente || !descripcionCorta) return null;

  const descripcionProyecto = typeof b.descripcionProyecto === "string" ? b.descripcionProyecto.trim() : "";
  const fechaActaEntrega = typeof b.fechaActaEntrega === "string" ? b.fechaActaEntrega.trim() || undefined : undefined;
  const monto = typeof b.monto === "string" ? b.monto.trim() || undefined : undefined;

  return { cliente, descripcionCorta, descripcionProyecto, fechaActaEntrega, monto };
}

export async function GET() {
  try {
    const proyectos = await readProyectos();
    return NextResponse.json({ proyectos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo leer la lista de proyectos: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseProyectoInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Cliente y descripción corta son obligatorios." },
        { status: 400 },
      );
    }

    const proyectos = await readProyectos();
    const nuevo: Proyecto = { id: randomUUID(), ...input };
    proyectos.push(nuevo);
    await writeProyectos(proyectos);

    return NextResponse.json({ proyectos }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el proyecto: ${message}` },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null || typeof (body as { id?: unknown }).id !== "string") {
      return NextResponse.json({ error: "Falta el id del proyecto a actualizar." }, { status: 400 });
    }
    const id = (body as { id: string }).id;

    const input = parseProyectoInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Cliente y descripción corta son obligatorios." },
        { status: 400 },
      );
    }

    const proyectos = await readProyectos();
    const index = proyectos.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No se encontró el proyecto." }, { status: 404 });
    }

    proyectos[index] = { ...proyectos[index], ...input, id };
    await writeProyectos(proyectos);

    return NextResponse.json({ proyectos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo actualizar el proyecto: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta el id del proyecto a eliminar." }, { status: 400 });
    }

    const proyectos = await readProyectos();
    const next = proyectos.filter((p) => p.id !== id);
    await writeProyectos(next);

    return NextResponse.json({ proyectos: next });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo eliminar el proyecto: ${message}` },
      { status: 500 },
    );
  }
}
