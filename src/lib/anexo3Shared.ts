import type { Anexo3Firma } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import { formatFechaLarga } from "./formatFechaLarga";

export const FIRMA_DEFAULT_ANEXO3: Required<Anexo3Firma> = {
  introGeneral:
    "A continuación, presentamos la información que demuestra el cumplimiento de la experiencia del personal técnico solicitado:",
  relacionDependenciaTexto:
    "Para evidenciar la relación de dependencia con CORESOLUTIONS de los técnicos presentados, incluimos el reporte de consulta de los Fondos de Reserva del Instituto Ecuatoriano de Seguridad Social, en el que los especialistas técnicos asignados gozan de este beneficio. Adicionalmente, se adjunta el mecanizado del IESS correspondiente al personal técnico presentado, como respaldo de su relación laboral con la empresa.",
  documentacionRespaldoTexto:
    "Se adjunta la documentación que respalda los proyectos indicados en el cuadro anterior. Los documentos anexos incluyen las actas de entrega-recepción y los certificados de participación, según corresponda. A continuación, se detallan los nombres de los archivos adjuntos por proyecto:",
  representanteNombre: "ING. JUAN CARLOS JARAMILLO",
  representanteCargo: "REPRESENTANTE LEGAL",
  empresa: "CORESOLUTIONS S.A.",
  ciudadFecha: `Cuenca, ${formatFechaLarga()}`,
};

function formatFechaDesdeISO(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;
  const [, y, m, d] = match;
  return formatFechaLarga(new Date(Number(y), Number(m) - 1, Number(d)));
}

// La fila gris de la Tabla 3 tiene dos partes, como en el pliego: un título
// numerado con el nombre del perfil ("1.1.  Especialista técnico en...") y,
// debajo, el párrafo del requisito de experiencia ("Se deberá acreditar...").
export interface RequisitoGris {
  titulo: string;
  requisito: string;
}

function normalizarComparacion(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Arma las dos líneas de la fila gris respetando el formato del pliego. El
// título sale del nombre del perfil (personal / función del Anexo 2) y se
// numera "N.1." salvo que la IA ya lo haya numerado. El párrafo es el
// requisito de experiencia; se omite si está vacío o si solo repite el título
// (acoplando cuando algo no viene en el pliego).
export function requisitoGrisDePerfil(
  index: number,
  funcion: string | undefined,
  personal: string | undefined,
  requisitoExperiencia: string | undefined,
): RequisitoGris {
  const nombrePerfil = (personal?.trim() || funcion?.trim() || `Perfil ${index + 1}`).trim();
  const yaNumerado = /^\d+(\.\d+)*\.?\s/.test(nombrePerfil);
  const titulo = yaNumerado ? nombrePerfil : `${index + 1}.1.   ${nombrePerfil}`;

  const req = (requisitoExperiencia ?? "").trim();
  const requisito = req && normalizarComparacion(req) !== normalizarComparacion(nombrePerfil) ? req : "";

  return { titulo, requisito };
}

// A partir de "Especialista técnico en servidores IBM Power" devuelve
// "servidores IBM Power" para componer la frase "...instalación y
// configuración de {área}." del certificado de cada técnico.
export function areaDesdeFuncion(funcion: string): string {
  const limpio = funcion.replace(/^especialista(\s+técnico)?\s+en\s+/i, "").trim();
  return limpio || funcion;
}

export function bioTecnicoDefault(tecnico: Tecnico, areas: string[]): string {
  const fechaIso = tecnico.fechaIngreso || tecnico.fechaContrato || "";
  const fechaTexto = fechaIso ? formatFechaDesdeISO(fechaIso) : "[fecha de ingreso]";
  const areaTexto = areas.length > 0 ? areas.join(" y ") : "[área del proyecto]";
  return `Por medio de la presente certifico que, el ingeniero ${tecnico.nombre.toUpperCase()}, con C.I.: ${tecnico.cedula}, es empleado de CORESOLUTIONS S.A. desde el ${fechaTexto}, con el cargo ${tecnico.rol || "Especialista Técnico"}. Durante este período ha participado activamente en proyectos de instalación y configuración de ${areaTexto}.`;
}

export function participacionTecnicoDefault(tecnico: Tecnico, clientes: string[]): string {
  const lista = clientes.length > 0 ? clientes.join(", ") : "[proyectos]";
  return `Entre los proyectos en los que ha participado el ingeniero ${tecnico.nombre.toUpperCase()} constan los de ${lista}, entre otros.`;
}
