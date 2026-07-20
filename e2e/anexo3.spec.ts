import { test, expect } from "@playwright/test";
import {
  fixtureProyecto,
  fixtureTecnico,
  mockExtractApi,
  mockExtractionResultDosPerfiles,
  mockProcesosApi,
  mockProyectosApi,
  mockTecnicosApi,
  SAMPLE_PDF,
} from "./mocks";

test.describe("Anexo 3 — vinculación de proyectos y vista previa", () => {
  test("vincula proyectos a un perfil y los muestra en la tabla de la vista previa", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, [fixtureProyecto(), fixtureProyecto({ id: "p2", cliente: "ETAPA EP." })]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Vista previa Anexo 3" })).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").first().selectOption("t1");
    await page.getByText("EMOV EP.", { exact: true }).click();
    await page.getByText("ETAPA EP.", { exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: "Vista previa Anexo 3" }).click();
    await expect(page.locator("#anexo3-print-area")).toBeVisible();

    await expect(page.locator("#anexo3-print-area").getByText("EMOV EP.").first()).toBeVisible();
    await expect(page.locator("#anexo3-print-area").getByText("ETAPA EP.").first()).toBeVisible();
    await expect(page.getByText("CERTIFICADO DE TRABAJO Y EXPERIENCIA")).toBeVisible();
    await expect(page.getByText("Documentación de respaldo")).toBeVisible();
  });

  test("una fila sin proyectos vinculados se muestra vacía, no rota la vista previa", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, []);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Vista previa Anexo 3" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Vista previa Anexo 3" }).click();
    await expect(page.getByText("(sin proyectos vinculados a este perfil)")).toBeVisible();
  });

  test("el certificado por técnico agrupa correctamente cuando hay dos perfiles", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico(), fixtureTecnico({ id: "t2", nombre: "Diego Rojas", cedula: "0103789780" })]);
    mockProyectosApi(page, [fixtureProyecto(), fixtureProyecto({ id: "p2", cliente: "GAD MUNICIPAL" })]);
    await mockExtractApi(page, mockExtractionResultDosPerfiles);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.locator("table select").first()).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").first().selectOption("t1");
    await page.locator("table select").nth(1).selectOption("t2");
    await page.waitForTimeout(200);

    // Link EMOV EP. to Patricio's row (first perfil card) and GAD MUNICIPAL to
    // Diego's row (second perfil card) — each row renders the same checkbox
    // list, so scope by the row's data-testid.
    await page.getByTestId("anexo3-row-0").getByText("EMOV EP.", { exact: true }).click();
    await page.getByTestId("anexo3-row-1").getByText("GAD MUNICIPAL", { exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: "Vista previa Anexo 3" }).click();
    const certificados = page.getByText("CERTIFICADO DE TRABAJO Y EXPERIENCIA");
    await expect(certificados).toHaveCount(2);
  });

  test("regresión: Descargar PDF no recorta el documento al recuadro del modal", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, [fixtureProyecto()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await page.locator("table select").selectOption("t1");
    await page.getByText("EMOV EP.", { exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Vista previa Anexo 3" }).click();
    await expect(page.locator("#anexo3-print-area")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    const viewport = page.viewportSize();
    const box = await page.locator("#anexo3-print-area").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan((viewport?.width ?? 0) * 0.9);

    await expect(page.getByRole("heading", { name: "Vista previa — Anexo 3" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "ANEXO 3: EXPERIENCIA DEL PERSONAL TÉCNICO", exact: true })).toBeVisible();

    await page.emulateMedia({ media: "screen" });
  });

  test("Descargar Word del Anexo 3 genera un .docx descargable", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, [fixtureProyecto()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await page.locator("table select").selectOption("t1");
    await page.getByText("EMOV EP.", { exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Vista previa Anexo 3" }).click();

    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: "Descargar Word" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Anexo_3_Experiencia_Personal_Tecnico.docx");
  });
});
