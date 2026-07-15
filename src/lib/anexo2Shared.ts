import type { Anexo2Firma } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import { formatFechaLarga } from "./formatFechaLarga";

// Colores y tipografía tomados directamente de la plantilla oficial
// (Anexo_2_personal_tecnico.docx) — compartidos entre la vista previa en
// pantalla y la exportación a Word para que ambas coincidan.
export const AZUL_TITULO = "#1F4E79";
export const AZUL_BORDE = "#5B9BD5";
export const NAVY_TABLA = "#44546A";
export const FONT_FAMILY = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";

export const FIRMA_DEFAULT: Required<Anexo2Firma> = {
  encabezadoDireccion: "Cuenca: Av. 3 de Noviembre 21-176 y Juan Pablo I",
  encabezadoTelefonos: "Teléfonos: +593 (07) 284-1495   (07) 284-3991",
  encabezadoEmail: "E-mail: gerencia@coresolutions.com.ec",
  introEmpresa:
    "Para asegurar que los servicios de implementación y soporte post-instalación sean oportunos y eficientes, CORESOLUTIONS cuenta con un equipo de consultores comerciales y especialistas técnicos certificados, para garantizar tiempos de respuesta oportunos, frente a requerimientos e incidentes críticos para resolución de problemas con profesionales expertos.",
  introTitulos:
    "Se indican a continuación los títulos académicos de los especialistas técnicos asignados al proyecto, según consulta realizada en https://www.senescyt.gob.ec/web/guest/consultas. Dicho documento incluye también la información correspondiente a certificados de riesgos laborales vigentes del personal técnico.",
  introCertificaciones:
    "A continuación, constan las certificaciones, con lo cual podemos garantizar el nivel de conocimientos requeridos y cumplir con lo solicitado en los pliegos.",
  representanteNombre: "ING. JUAN CARLOS JARAMILLO",
  representanteCargo: "REPRESENTANTE LEGAL",
  empresa: "CORESOLUTIONS S.A.",
  ciudadFecha: `Cuenca, ${formatFechaLarga()}`,
};

// Un override guardado como cadena vacía (ej. por un blur accidental en modo
// edición) no debe tapar para siempre el valor calculado — solo cuenta como
// "override" si el usuario realmente escribió algo.
export function resolverValor(override: string | undefined, calculado: string): string {
  return override && override.trim() ? override : calculado;
}

export function nivelEstudioLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push("Tercer nivel con título");
  if (tecnico.cuartoNivelTitulo) lineas.push("Cuarto nivel con título");
  return lineas;
}

export function titulacionLineas(tecnico?: Tecnico): string[] {
  if (!tecnico) return [];
  const lineas: string[] = [];
  if (tecnico.tituloAcademico) lineas.push(tecnico.tituloAcademico);
  if (tecnico.cuartoNivelTitulo) lineas.push(tecnico.cuartoNivelTitulo);
  return lineas;
}
