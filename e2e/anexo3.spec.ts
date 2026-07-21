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

// Nota: las vistas previas de Anexo 2/3 y Resumen fueron removidas
// temporalmente (ver RequisitosPanel.tsx) — estas pruebas cubren el panel
// inline de vinculación de proyectos (Bloque C) que sigue en pantalla.
test.describe("Anexo 3 — vinculación de proyectos (panel inline)", () => {
  test("vincula proyectos a un perfil y muestra el técnico asignado como chip", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, [fixtureProyecto(), fixtureProyecto({ id: "p2", cliente: "ETAPA EP." })]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByTestId("anexo3-row-0")).toBeVisible({ timeout: 15_000 });

    await page.locator("table select").first().selectOption("t1");
    await expect(page.getByTestId("anexo3-row-0").getByText("Patricio Gavilanes")).toBeVisible();

    const row = page.getByTestId("anexo3-row-0");
    await row.locator('label:has-text("EMOV EP.")').click();
    await row.locator('label:has-text("ETAPA EP.")').click();

    await expect(row.locator('label:has-text("EMOV EP.") input')).toBeChecked();
    await expect(row.locator('label:has-text("ETAPA EP.") input')).toBeChecked();
  });

  test("una fila sin proyectos en el roster muestra el mensaje de aviso, no rota el panel", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, []);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByTestId("anexo3-row-0")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('Aún no hay proyectos en el roster')).toBeVisible();
  });

  test("dos perfiles vinculan proyectos de forma independiente", async ({ page }) => {
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

    const row0 = page.getByTestId("anexo3-row-0");
    const row1 = page.getByTestId("anexo3-row-1");
    await row0.locator('label:has-text("EMOV EP.")').click();
    await row1.locator('label:has-text("GAD MUNICIPAL")').click();

    await expect(row0.getByText("Patricio Gavilanes")).toBeVisible();
    await expect(row1.getByText("Diego Rojas")).toBeVisible();

    // Row 0 should not have GAD MUNICIPAL checked, and row 1 should not have EMOV EP. checked.
    await expect(row0.locator('label:has-text("GAD MUNICIPAL") input')).not.toBeChecked();
    await expect(row1.locator('label:has-text("EMOV EP.") input')).not.toBeChecked();
  });
});
