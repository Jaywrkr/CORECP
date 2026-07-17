import { test, expect } from "@playwright/test";
import { fixtureProyecto, mockProcesosApi, mockProyectosApi, mockTecnicosApi } from "./mocks";

test.describe("Gestión de proyectos", () => {
  test("agrega un proyecto con sus campos y lo muestra en la lista", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);
    mockProyectosApi(page, []);

    await page.goto("/");
    await page.getByRole("button", { name: "Proyectos" }).click();

    await page.getByLabel("Cliente *").fill("ETAPA EP.");
    await page.getByLabel("Descripción corta (para el listado de documentación) *").fill("Adquisición de plataforma RISC.");
    await page.getByLabel("Monto").fill("$220.200");
    await page.getByLabel("Fecha de acta de entrega").fill("2023-04-10");
    await page.getByRole("button", { name: "Agregar proyecto" }).click();

    await expect(page.getByText("ETAPA EP.")).toBeVisible();
    await expect(page.getByText(/\$220\.200/)).toBeVisible();
  });

  test("sube y previsualiza el acta de entrega de un proyecto", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);
    mockProyectosApi(page, [fixtureProyecto()]);

    await page.goto("/");
    await page.getByRole("button", { name: "Proyectos" }).click();

    await expect(page.getByText("+ Subir acta de entrega")).toBeVisible();
    await page.setInputFiles('label:has-text("Subir acta de entrega") input[type="file"]', "e2e/fixtures/sample.pdf");

    await expect(page.getByText("Acta de entrega:").locator("..").getByText("Ver")).toBeVisible();
  });
});
