import type { DocumentoArchivo } from "./tecnico";

export interface Proyecto {
  id: string;
  cliente: string;
  descripcionCorta: string;
  descripcionProyecto: string;
  fechaActaEntrega?: string;
  monto?: string;
  archivoActaEntrega?: DocumentoArchivo;
  archivoCertificadoParticipacion?: DocumentoArchivo;
}

export type ProyectoInput = Omit<Proyecto, "id">;
