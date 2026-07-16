import { test, expect } from "@playwright/test";
import { fixtureTecnico, mockProcesosApi, mockTecnicosApi } from "./mocks";

test.describe("Gestión de técnicos", () => {
  test("agrega un técnico con todos los campos y lo muestra en la lista", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, []);

    await page.goto("/");
    await page.getByRole("button", { name: "Técnicos" }).click();

    await page.getByLabel("Nombre completo *").fill("Marcelo López Sanmartín");
    await page.getByLabel("Cédula *").fill("0104789664");
    await page.getByLabel("Título académico (tercer nivel)").fill("Ingeniero en Electrónica y Telecomunicaciones");
    await page.getByLabel("Cuarto nivel de título (maestría)").fill("Magíster en Telecomunicaciones");
    await page.getByLabel("Fecha de ingreso").fill("2018-09-03");
    await page.getByRole("button", { name: "Agregar técnico" }).click();

    await expect(page.getByText("Marcelo López Sanmartín")).toBeVisible();
    await expect(page.getByText("Magíster en Telecomunicaciones")).toBeVisible();
    await expect(page.getByText("Ingreso: 2018-09-03")).toBeVisible();
  });

  test("sube y previsualiza un documento Senescyt de varios archivos", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);

    await page.goto("/");
    await page.getByRole("button", { name: "Técnicos" }).click();

    await expect(page.getByText("Subir Senescyt")).toBeVisible();
    await page.setInputFiles('input[type="file"][accept*="pdf"]', "e2e/fixtures/sample.pdf");

    await expect(page.getByText(/Ver Senescyt \(1\)/)).toBeVisible();
    await page.getByText(/Ver Senescyt/).click();
    await expect(page.locator("iframe, img").first()).toBeVisible();
  });
});
