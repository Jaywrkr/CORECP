"use client";

import type { Anexo2Fila } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";

interface Anexo2PreviewProps {
  filas: Anexo2Fila[];
  tecnicos: Tecnico[];
  asignaciones: Record<number, string>;
}

const HEADERS = ["Nro", "Función", "Nombre", "Nivel de estudio", "Titulación académica"];

function nivelEstudioLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push("Tercer nivel con título");
  if (tecnico.cuartoNivelTitulo) lineas.push("Cuarto nivel con título");
  return lineas;
}

function titulacionLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push(tecnico.tituloAcademico);
  if (tecnico.cuartoNivelTitulo) lineas.push(tecnico.cuartoNivelTitulo);
  return lineas;
}

export default function Anexo2Preview({ filas, tecnicos, asignaciones }: Anexo2PreviewProps) {
  if (filas.length === 0) return null;

  return (
    <div className="rounded-lg p-6" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
      <h2 className="mb-3 text-lg font-semibold" style={{ color: "#5b9bd5" }}>
        Cumplimiento de personal técnico mínimo
      </h2>
      <p className="mb-4 text-sm" style={{ color: "#e5e7eb" }}>
        A continuación, indicamos el personal técnico de CORESOLUTIONS, con lo cual se cumple lo
        requerido en los términos de referencia:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm" style={{ color: "#e5e7eb" }}>
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="border px-3 py-2 text-left font-semibold"
                  style={{ background: "#a9c6e8", color: "#1f2d3d", borderColor: "#333" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((row, i) => {
              const tecnico = tecnicos.find((t) => t.id === asignaciones[i]);
              const nivelLineas = nivelEstudioLineas(tecnico);
              const tituloLineas = titulacionLineas(tecnico);
              return (
                <tr key={i}>
                  <td className="border px-3 py-3 align-top" style={{ borderColor: "#333" }}>
                    {i + 1}
                  </td>
                  <td className="border px-3 py-3 align-top whitespace-pre-line" style={{ borderColor: "#333" }}>
                    {row.funcion || ""}
                  </td>
                  <td className="border px-3 py-3 align-top" style={{ borderColor: "#333" }}>
                    {tecnico ? `${i + 1}.1 ${tecnico.nombre}` : ""}
                  </td>
                  <td className="border px-3 py-3 align-top" style={{ borderColor: "#333" }}>
                    {nivelLineas.map((linea, li) => (
                      <div key={li}>{linea}</div>
                    ))}
                  </td>
                  <td className="border px-3 py-3 align-top" style={{ borderColor: "#333" }}>
                    {tituloLineas.map((linea, li) => (
                      <div key={li}>{linea}</div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
