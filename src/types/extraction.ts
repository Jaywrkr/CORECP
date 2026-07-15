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

export interface ExtractionResult {
  requisitos: RequisitosDetectados;
  fechasClave: FechasClave;
  identificacion: Identificacion;
  anexo2Sugerido: Anexo2Fila[];
  anexo3Sugerido: Anexo3Fila[];
}

export type ExtractionStatus = "idle" | "uploading" | "extracting" | "done" | "error";
