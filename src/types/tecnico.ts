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
}

export type TecnicoInput = Omit<Tecnico, "id">;
