import { test, expect } from "@playwright/test";
import { fixtureTecnico, mockExtractApi, mockExtractionResult, mockProcesosApi, mockTecnicosApi, SAMPLE_PDF } from "./mocks";

// Nota: las vistas previas de Anexo 2/3 y Resumen fueron removidas
// temporalmente (ver RequisitosPanel.tsx) — estas pruebas cubren solo el
// comportamiento de la tabla de asignación inline que sigue en pantalla.
test.describe("Anexo 2 — asignación y coincidencia de título", () => {
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
});
