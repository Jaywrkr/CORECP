import type { Anexo2Firma, Anexo2OverridesMap, ExtractionResult } from "./extraction";

export interface ProcesoCache {
  numeroProceso: string;
  nombreProyecto: string;
  result: ExtractionResult;
  documentos: string[];
  anexo2Overrides?: Anexo2OverridesMap;
  anexo2Firma?: Anexo2Firma;
  actualizadoEn: string;
}

export type ProcesoResumen = Pick<
  ProcesoCache,
  "numeroProceso" | "nombreProyecto" | "documentos" | "actualizadoEn"
>;
