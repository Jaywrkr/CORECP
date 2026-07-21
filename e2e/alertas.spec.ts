import { test, expect } from "@playwright/test";
import { fixtureTecnico, mockExtractApi, mockProcesosApi, mockTecnicosApi, SAMPLE_PDF } from "./mocks";

// Nota: el botón "Resumen del proceso" (vista previa) fue removido
// temporalmente (ver RequisitosPanel.tsx) — solo queda la sección inline de
// alertas, que es lo que estas pruebas cubren.
test.describe("Alertas del proceso", () => {
  test("muestra las tres alertas con su detalle, incluida la coincidencia CPC/TT2", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByText("Alertas del proceso")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Cronograma de implementación").first()).toBeVisible();
    await expect(page.getByText("El oferente debe presentar un cronograma")).toBeVisible();

    await expect(page.getByText("Transferencia de tecnología (TT2)")).toBeVisible();
    await expect(page.getByText(/CPC 452300044 coincide con la Tabla 2 de SERCOP/)).toBeVisible();

    await expect(page.getByText("Entrega de manuales")).toBeVisible();
    await expect(page.getByText("físico y digital")).toBeVisible();
  });
});
