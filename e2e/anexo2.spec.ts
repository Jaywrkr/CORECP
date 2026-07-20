import { test, expect } from "@playwright/test";
import {
  fixtureTecnico,
  mockExtractApi,
  mockExtractionResult,
  mockExtractionResultDosPerfiles,
  mockProcesosApi,
  mockTecnicosApi,
  SAMPLE_PDF,
} from "./mocks";

test.describe("Anexo 2 — asignación, coincidencia de título y vista previa", () => {
  test('no avisa "título no coincide" cuando el pliego acepta "afines"', async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico({ tituloAcademico: "Ingeniero Civil" })]);
    // mockExtractionResult's titulacionAcademica is "Ingeniería Civil, Ingeniería Estructural o afines"
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.locator("table select")).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").selectOption("t1");
    await expect(page.getByText("Título del técnico no coincide con el requerido")).toHaveCount(0);
  });

  test("avisa cuando el título realmente no coincide y el pliego no dice afines", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico({ tituloAcademico: "Ingeniero Comercial" })]);
    await mockExtractApi(page, {
      ...mockExtractionResult,
      anexo2Sugerido: [
        { funcion: "Especialista en Estructuras", nivelEstudio: "Tercer nivel", titulacionAcademica: "Ingeniería Civil" },
      ],
    });

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.locator("table select")).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").selectOption("t1");
    await expect(page.getByText("Título del técnico no coincide con el requerido")).toBeVisible();
  });

  test("regresión: un override vacío no tapa el nombre del técnico asignado después", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Vista previa Anexo 2" })).toBeVisible({ timeout: 15_000 });

    // Open the preview and edit mode WITHOUT assigning a técnico first, then
    // blur the empty "Nombre" cell — this is exactly how the reported bug
    // (blank override saved from an accidental blur) used to happen.
    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();
    await page.getByRole("button", { name: "Editar todo" }).click();
    const nombreTextarea = page.locator("table textarea").nth(1); // Función, Nombre, Nivel, Titulación
    await nombreTextarea.click();
    await nombreTextarea.blur();
    await page.getByRole("button", { name: "Terminar edición" }).click();
    await page.getByRole("button", { name: "Cerrar" }).click();

    // Now assign the técnico from the outer table, after the blank override exists.
    await page.locator("table select").selectOption("t1");
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();
    await expect(page.getByText("1.1 Patricio Gavilanes")).toBeVisible();
  });

  test("la vista previa respeta el orden y fuerza salto de página entre secciones", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico(), fixtureTecnico({ id: "t2", nombre: "Diego Rojas", cedula: "0103789780" })]);
    await mockExtractApi(page, mockExtractionResultDosPerfiles);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.locator("table select").first()).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").first().selectOption("t1");
    await page.locator("table select").nth(1).selectOption("t2");
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();
    await expect(page.getByRole("heading", { name: "ANEXO 2: PERSONAL TÉCNICO", exact: true })).toBeVisible();

    await expect(page.getByText("1.1 Patricio Gavilanes")).toBeVisible();
    await expect(page.getByText("2.1 Diego Rojas")).toBeVisible();

    const headingsInOrder = await page.locator("#anexo2-print-area h2").allTextContents();
    expect(headingsInOrder).toEqual([
      "Cumplimiento de personal técnico mínimo",
      "Títulos profesionales y formación académica",
      "Certificaciones de consultores y especialistas técnicos",
    ]);

    const pageBreakElements = await page.locator('#anexo2-print-area [style*="break-before"]').count();
    expect(pageBreakElements).toBe(3);
  });

  test("la fecha de firma es editable sin activar Editar todo", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await page.locator("table select").selectOption("t1");
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();

    // Only the date field should be a <textarea> while NOT in edit mode.
    await expect(page.locator("#anexo2-print-area textarea")).toHaveCount(1);
  });

  test("regresión: Descargar PDF no recorta el documento al recuadro del modal", async ({ page }) => {
    // El modal de vista previa usa `position: fixed` + `overflow: auto` para
    // mostrarse en pantalla. Si el CSS de impresión no neutraliza eso, Chrome
    // recorta el PDF al recuadro visible del modal (~90vh, ancho angosto de
    // la columna de /analizar) en vez de paginar el documento completo,
    // dando una página en blanco o con el texto desplazado.
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await page.locator("table select").selectOption("t1");
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();
    await expect(page.locator("#anexo2-print-area")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    // El área del documento debe ocupar todo el ancho de la página, no el
    // ancho angosto de la columna donde vive el modal en el layout normal.
    const viewport = page.viewportSize();
    const box = await page.locator("#anexo2-print-area").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan((viewport?.width ?? 0) * 0.9);

    // La UI del modal (botones, encabezado) no debe imprimirse.
    await expect(page.getByRole("heading", { name: "Vista previa — Anexo 2" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "ANEXO 2: PERSONAL TÉCNICO", exact: true })).toBeVisible();

    await page.emulateMedia({ media: "screen" });
  });

  test("Descargar Word genera un .docx descargable", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await page.locator("table select").selectOption("t1");
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Vista previa Anexo 2" }).click();

    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: "Descargar Word" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Anexo_2_Personal_Tecnico.docx");
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
