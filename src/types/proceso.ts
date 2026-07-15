import type { ExtractionResult } from "./extraction";

export interface ProcesoCache {
  numeroProceso: string;
  nombreProyecto: string;
  result: ExtractionResult;
  documentos: string[];
  actualizadoEn: string;
}

export type ProcesoResumen = Pick<
  ProcesoCache,
  "numeroProceso" | "nombreProyecto" | "documentos" | "actualizadoEn"
>;
