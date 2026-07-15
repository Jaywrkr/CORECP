import type { Anexo2OverridesMap, ExtractionResult } from "./extraction";

export interface ProcesoCache {
  numeroProceso: string;
  nombreProyecto: string;
  result: ExtractionResult;
  documentos: string[];
  anexo2Overrides?: Anexo2OverridesMap;
  actualizadoEn: string;
}

export type ProcesoResumen = Pick<
  ProcesoCache,
  "numeroProceso" | "nombreProyecto" | "documentos" | "actualizadoEn"
>;
