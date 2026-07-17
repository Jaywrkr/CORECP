import { test, expect } from "@playwright/test";
import { mockExtractApi, mockExtractionResult, mockProcesosApi, mockTecnicosApi, SAMPLE_PDF } from "./mocks";

test.describe("Flujo de análisis manual", () => {
  test("subir un PDF no analiza automáticamente — hay que presionar Analizar", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);

    await expect(page.getByText('Presiona "Analizar" para procesar los documentos con IA.')).toBeVisible();
    await expect(page.getByRole("button", { name: "Analizar" })).toBeVisible();

    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Vista previa Anexo 2" })).toBeVisible({ timeout: 15_000 });
  });

  test("un proceso ya analizado se carga desde caché sin volver a llamar a la IA", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);

    let extractCalls = 0;
    await page.route("**/api/extract", (route) => {
      extractCalls += 1;
      return route.fulfill({ json: mockExtractionResult });
    });

    // detectProcessCode can't find a código in the fixture PDF's text, so set
    // the número de proceso by hand to make the cache lookup deterministic.
    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByPlaceholder("ej. SIE-EERSSA-2026-023").fill("TEST-CACHE-001");
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByText("Guardado")).toBeVisible({ timeout: 15_000 });
    expect(extractCalls).toBe(1);

    // Start a fresh analysis session for the same número de proceso.
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByPlaceholder("ej. SIE-EERSSA-2026-023").fill("TEST-CACHE-001");
    await page.getByRole("button", { name: "Analizar" }).click();

    await expect(page.getByText(/Cargado desde caché/)).toBeVisible({ timeout: 15_000 });
    expect(extractCalls).toBe(1);
  });

  test('"Volver" guarda el análisis pendiente antes de salir', async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByText("Guardado")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "← Volver" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('"Volver" advierte si el guardado falló, y respeta la cancelación', async ({ page }) => {
    mockTecnicosApi(page);
    await mockExtractApi(page);
    await page.route("**/api/procesos**", (route) => route.fulfill({ status: 500, json: { error: "fail" } }));

    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByText("Error al guardar")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "← Volver" }).click();
    await expect.poll(() => dialogMessage).toContain("No se pudo guardar");
    await expect(page).toHaveURL(/\/analizar/);
  });
});
