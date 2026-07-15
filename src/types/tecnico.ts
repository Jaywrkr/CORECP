export interface DocumentoArchivo {
  url: string;
  nombre: string;
}

// Un "documento" (ej. Senescyt) puede estar compuesto de varios archivos
// (varias páginas escaneadas por separado) — se agrupan bajo el mismo tipo.
export type DocumentosTecnico = Record<string, DocumentoArchivo[]>;

export interface Tecnico {
  id: string;
  nombre: string;
  cedula: string;
  rol: string;
  tituloAcademico: string;
  cuartoNivelTitulo?: string;
  nivelEstudio: string;
  fechaContrato?: string;
  fechaIngreso?: string;
  certificaciones: string[];
  notas?: string;
  documentos?: DocumentosTecnico;
}

export type TecnicoInput = Omit<Tecnico, "id">;
