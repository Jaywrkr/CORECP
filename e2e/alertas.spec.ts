import { test, expect } from "@playwright/test";
import {
  fixtureProyecto,
  fixtureTecnico,
  mockExtractApi,
  mockProcesosApi,
  mockProyectosApi,
  mockTecnicosApi,
  SAMPLE_PDF,
} from "./mocks";

test.describe("Alertas del proceso y resumen consolidado", () => {
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

  test("el resumen del proceso consolida fechas, equipo, requisitos y entregables", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, [fixtureProyecto()]);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Resumen del proceso" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Resumen del proceso" }).click();
    await expect(page.locator("#resumen-print-area")).toBeVisible();

    await expect(page.locator("#resumen-print-area").getByText("RESUMEN DEL PROCESO")).toBeVisible();
    await expect(page.locator("#resumen-print-area").getByText("Fechas clave")).toBeVisible();
    await expect(page.locator("#resumen-print-area").getByText("Equipo técnico propuesto")).toBeVisible();
    await expect(page.locator("#resumen-print-area").getByText("Requerimientos detectados")).toBeVisible();
    await expect(page.locator("#resumen-print-area").getByText("Entregables y obligaciones del oferente")).toBeVisible();
    await expect(page.locator("#resumen-print-area").getByText("Especialista en Estructuras").first()).toBeVisible();
  });

  test("Descargar Word del resumen genera un .docx descargable", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, []);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Resumen del proceso" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Resumen del proceso" }).click();

    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: "Descargar Word" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Resumen_del_Proceso.docx");
  });

  test("regresión: Descargar PDF del resumen no recorta el documento al recuadro del modal", async ({ page }) => {
    mockProcesosApi(page);
    mockTecnicosApi(page, [fixtureTecnico()]);
    mockProyectosApi(page, []);
    await mockExtractApi(page);

    await page.goto("/analizar");
    await page.setInputFiles('input[type="file"]', SAMPLE_PDF);
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page.getByRole("button", { name: "Resumen del proceso" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Resumen del proceso" }).click();
    await expect(page.locator("#resumen-print-area")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    const viewport = page.viewportSize();
    const box = await page.locator("#resumen-print-area").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan((viewport?.width ?? 0) * 0.9);

    await expect(page.getByRole("heading", { name: "Resumen del proceso" })).toBeHidden();

    await page.emulateMedia({ media: "screen" });
  });
});
