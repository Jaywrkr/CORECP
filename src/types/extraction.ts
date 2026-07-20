export interface RequisitosDetectados {
  personal: string[];
  nivelAcademico: string[];
  titulacion: string[];
  certificaciones: string[];
  experiencia: string[];
  otros: string[];
}

export interface Anexo2Fila {
  funcion: string;
  nombre?: string;
  nivelEstudio: string;
  titulacionAcademica: string;
}

export interface Anexo3Fila {
  personal: string;
  clienteFechaActaFactura?: string;
  proyecto?: string;
  monto?: string;
  requisitoExperiencia: string;
}

export interface FechasClave {
  presentacionOferta: string;
  puja: string;
  adjudicacion: string;
}

export interface Identificacion {
  cliente: string;
  descripcion: string;
}

// Alerta booleana con el fragmento de texto del pliego que la sustenta, para
// que el usuario pueda verificarla sin tener que releer todo el documento.
export interface AlertaDetectada {
  requerido: boolean;
  detalle: string;
}

// Tres alertas puntuales que conviene ver de un vistazo al abrir un proceso:
// si hay que presentar un cronograma de implementación, si aplica el nivel
// TT2 de transferencia de tecnología (según los códigos CPC que mencione el
// pliego, comparados contra la Tabla 2 de SERCOP) y si hay que entregar
// manuales físicos/digitales.
export interface AlertasProceso {
  codigosCpc: string[];
  cronograma: AlertaDetectada;
  manuales: AlertaDetectada;
}

export interface ExtractionResult {
  requisitos: RequisitosDetectados;
  fechasClave: FechasClave;
  identificacion: Identificacion;
  anexo2Sugerido: Anexo2Fila[];
  anexo3Sugerido: Anexo3Fila[];
  alertas?: AlertasProceso;
}

export type ExtractionStatus = "idle" | "uploading" | "extracting" | "done" | "error";

// Manual overrides for the Anexo 2 preview/document — let the user correct
// any cell by hand regardless of what the AI extracted or which técnico was
// assigned, keyed by anexo2Sugerido row index.
export interface Anexo2Overrides {
  funcion?: string;
  nombre?: string;
  nivelEstudio?: string;
  titulacionAcademica?: string;
}

export type Anexo2OverridesMap = Record<number, Anexo2Overrides>;

// Textos fijos del documento (portada, párrafos introductorios, firma) que
// también se pueden editar a mano en "Editar todo", separados de las filas
// de la tabla porque aplican al documento completo, no a un perfil puntual.
export interface Anexo2Firma {
  encabezadoDireccion?: string;
  encabezadoTelefonos?: string;
  encabezadoEmail?: string;
  introEmpresa?: string;
  introTitulos?: string;
  introCertificaciones?: string;
  representanteNombre?: string;
  representanteCargo?: string;
  empresa?: string;
  ciudadFecha?: string;
}

// Qué proyectos (del roster de Proyectos) demuestran la experiencia de cada
// fila del Anexo 2/3 — un mismo perfil puede acreditarse con varios
// proyectos, cada uno como una fila propia en la tabla del Anexo 3.
export type Anexo3ProyectosMap = Record<number, string[]>;

// Override manual de una fila (perfil + proyecto puntual) de la tabla del
// Anexo 3, clave `${rowIndex}:${proyectoId}`.
export interface Anexo3FilaOverride {
  personal?: string;
  clienteFecha?: string;
  proyecto?: string;
  monto?: string;
}
export type Anexo3OverridesMap = Record<string, Anexo3FilaOverride>;

// Texto editable del bloque "CERTIFICADO DE TRABAJO Y EXPERIENCIA" propio de
// cada técnico, clave = id del técnico.
export interface Anexo3TecnicoOverride {
  bio?: string;
  participacion?: string;
}
export type Anexo3TecnicoOverridesMap = Record<string, Anexo3TecnicoOverride>;

export interface Anexo3Firma {
  introGeneral?: string;
  relacionDependenciaTexto?: string;
  documentacionRespaldoTexto?: string;
  representanteNombre?: string;
  representanteCargo?: string;
  empresa?: string;
  ciudadFecha?: string;
}
