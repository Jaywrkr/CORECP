export interface Tecnico {
  id: string;
  nombre: string;
  cedula: string;
  tituloAcademico: string;
  nivelEstudio: string;
  certificaciones: string[];
  notas?: string;
}

export type TecnicoInput = Omit<Tecnico, "id">;
