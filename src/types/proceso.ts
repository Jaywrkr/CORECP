import type { ExtractionResult } from "./extraction";

export interface ProcesoCache {
  numeroProceso: string;
  result: ExtractionResult;
  documentos: string[];
  actualizadoEn: string;
}
