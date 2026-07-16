import type { Page } from "@playwright/test";
import type { ExtractionResult } from "../src/types/extraction";
import type { Tecnico } from "../src/types/tecnico";
import type { ProcesoCache } from "../src/types/proceso";

export const mockExtractionResult: ExtractionResult = {
  requisitos: {
    personal: ["1 Especialista en Estructuras"],
    nivelAcademico: ["Tercer nivel"],
    titulacion: ["Ingeniería Civil"],
    certificaciones: ["PMP"],
    experiencia: ["3 años en 2 proyectos similares"],
    otros: [],
  },
  fechasClave: { presentacionOferta: "", puja: "", adjudicacion: "" },
  identificacion: { cliente: "ETAPA", descripcion: "MANTENIMIENTO ESTRUCTURAL" },
  anexo2Sugerido: [
    {
      funcion: "Especialista en Estructuras",
      nivelEstudio: "Tercer nivel",
      titulacionAcademica: "Ingeniería Civil, Ingeniería Estructural o afines",
    },
  ],
  anexo3Sugerido: [
    {
      personal: "Especialista en Estructuras",
      requisitoExperiencia: "Experiencia mínima de 3 años en al menos 2 proyectos similares.",
    },
  ],
};

export const mockExtractionResultDosPerfiles: ExtractionResult = {
  ...mockExtractionResult,
  anexo2Sugerido: [
    {
      funcion: "Especialista en Estructuras",
      nivelEstudio: "Tercer nivel",
      titulacionAcademica: "Ingeniería Civil",
    },
    {
      funcion: "Especialista en Suelos",
      nivelEstudio: "Tercer nivel",
      titulacionAcademica: "Ingeniería Civil",
    },
  ],
};

export function fixtureTecnico(overrides: Partial<Tecnico> = {}): Tecnico {
  return {
    id: "t1",
    nombre: "Patricio Gavilanes",
    cedula: "0102343431",
    rol: "Técnico",
    tituloAcademico: "Ingeniero Civil",
    nivelEstudio: "Tercer Nivel",
    certificaciones: ["PMP"],
    ...overrides,
  };
}

const TEST_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export async function mockExtractApi(page: Page, result: ExtractionResult = mockExtractionResult) {
  await page.route("**/api/extract", (route) => route.fulfill({ json: result }));
}

export function mockTecnicosApi(page: Page, initial: Tecnico[] = []) {
  let current = [...initial];

  page.route("**/api/tecnicos", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { tecnicos: current } });
    if (req.method() === "POST") {
      const body = JSON.parse(req.postData() || "{}") as Partial<Tecnico>;
      const nuevo: Tecnico = { ...(body as Tecnico), id: `t${current.length + 1}` };
      current = [...current, nuevo];
      return route.fulfill({ json: { tecnicos: current }, status: 201 });
    }
    if (req.method() === "PUT") {
      const body = JSON.parse(req.postData() || "{}") as Tecnico;
      current = current.map((t) => (t.id === body.id ? { ...t, ...body } : t));
      return route.fulfill({ json: { tecnicos: current } });
    }
    if (req.method() === "DELETE") {
      const id = new URL(req.url()).searchParams.get("id");
      current = current.filter((t) => t.id !== id);
      return route.fulfill({ json: { tecnicos: current } });
    }
    return route.continue();
  });

  page.route("**/api/tecnicos/documento**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const targetId = current[0]?.id;
      if (targetId) {
        current = current.map((t) =>
          t.id === targetId
            ? {
                ...t,
                documentos: {
                  ...(t.documentos ?? {}),
                  Senescyt: [
                    ...((t.documentos ?? {}).Senescyt ?? []),
                    { url: TEST_IMAGE_DATA_URL, nombre: "senescyt.png" },
                  ],
                },
              }
            : t,
        );
      }
      return route.fulfill({ json: { tecnicos: current } });
    }
    if (req.method() === "DELETE") {
      const id = new URL(req.url()).searchParams.get("id");
      current = current.map((t) => (t.id === id ? { ...t, documentos: {} } : t));
      return route.fulfill({ json: { tecnicos: current } });
    }
    return route.continue();
  });

  return {
    get: () => current,
  };
}

export function mockProcesosApi(page: Page) {
  const store = new Map<string, ProcesoCache>();

  page.route("**/api/procesos**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const numero = url.searchParams.get("numero");

    if (req.method() === "GET" && !numero) {
      return route.fulfill({ json: { procesos: Array.from(store.values()) } });
    }
    if (req.method() === "GET" && numero) {
      return route.fulfill({ json: { proceso: store.get(numero) ?? null } });
    }
    if (req.method() === "POST") {
      const body = JSON.parse(req.postData() || "{}") as Partial<ProcesoCache>;
      const proceso: ProcesoCache = {
        numeroProceso: body.numeroProceso ?? "",
        nombreProyecto: body.numeroProceso ?? "",
        result: body.result as ExtractionResult,
        documentos: body.documentos ?? [],
        anexo2Overrides: body.anexo2Overrides,
        anexo2Firma: body.anexo2Firma,
        actualizadoEn: new Date().toISOString(),
      };
      store.set(proceso.numeroProceso, proceso);
      return route.fulfill({ json: { proceso }, status: 201 });
    }
    if (req.method() === "DELETE" && numero) {
      store.delete(numero);
      return route.fulfill({ json: { ok: true } });
    }
    return route.continue();
  });

  return {
    get: (numero: string) => store.get(numero),
  };
}

export const SAMPLE_PDF = "e2e/fixtures/sample.pdf";
