import type {
  Anexo2Firma,
  Anexo2OverridesMap,
  Anexo3Firma,
  Anexo3OverridesMap,
  Anexo3ProyectosMap,
  Anexo3TecnicoOverridesMap,
  ExtractionResult,
} from "./extraction";

export interface ProcesoCache {
  numeroProceso: string;
  nombreProyecto: string;
  result: ExtractionResult;
  documentos: string[];
  anexo2Overrides?: Anexo2OverridesMap;
  anexo2Firma?: Anexo2Firma;
  anexo3Proyectos?: Anexo3ProyectosMap;
  anexo3Overrides?: Anexo3OverridesMap;
  anexo3TecnicoOverrides?: Anexo3TecnicoOverridesMap;
  anexo3Firma?: Anexo3Firma;
  actualizadoEn: string;
}

export type ProcesoResumen = Pick<
  ProcesoCache,
  "numeroProceso" | "nombreProyecto" | "documentos" | "actualizadoEn"
>;
