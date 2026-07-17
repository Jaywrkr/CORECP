import { test, expect } from "@playwright/test";
import { mockProcesosApi, mockTecnicosApi } from "./mocks";

test.describe("Página de inicio — buscador de procesos", () => {
  test("muestra el estado vacío cuando no hay procesos guardados", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);

    await page.goto("/");

    await expect(page.getByText("Aún no hay procesos analizados")).toBeVisible();
    await expect(page.getByRole("link", { name: "+ Nuevo proceso" })).toBeVisible();
  });

  test("el botón + Nuevo proceso navega a /analizar", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page);

    await page.goto("/");
    await page.getByRole("link", { name: "+ Nuevo proceso" }).click();

    await expect(page).toHaveURL(/\/analizar$/);
  });

  test("filtra la lista de procesos por nombre o número", async ({ page }) => {
    const procesos = mockProcesosApi(page);
    mockTecnicosApi(page);

    // Seed the store directly via the API mock's underlying map by hitting a
    // fake POST first (simplest way to seed data through the same mock).
    await page.route("**/api/procesos", async (route, request) => {
      if (request.method() === "GET" && !new URL(request.url()).searchParams.get("numero")) {
        return route.fulfill({
          json: {
            procesos: [
              { numeroProceso: "ETAPA-260101-STORAGE", nombreProyecto: "ETAPA-260101-STORAGE", documentos: [], actualizadoEn: new Date().toISOString() },
              { numeroProceso: "CENTROSUR-260202-REDES", nombreProyecto: "CENTROSUR-260202-REDES", documentos: [], actualizadoEn: new Date().toISOString() },
            ],
          },
        });
      }
      return route.continue();
    });
    void procesos;

    await page.goto("/");
    await expect(page.getByText("ETAPA-260101-STORAGE").first()).toBeVisible();
    await expect(page.getByText("CENTROSUR-260202-REDES").first()).toBeVisible();

    await page.getByPlaceholder("Buscar proceso por nombre o número…").fill("centrosur");
    await expect(page.getByText("CENTROSUR-260202-REDES").first()).toBeVisible();
    await expect(page.getByText("ETAPA-260101-STORAGE")).toHaveCount(0);
  });
});
