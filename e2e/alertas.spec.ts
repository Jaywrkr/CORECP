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

  test("el resumen del proceso cubre todo el proceso: presupuesto, alcance, requisitos clave y checklist", async ({ page }) => {
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

    const area = page.locator("#resumen-print-area");
    await expect(area.getByText("Resumen ejecutivo y checklist de cumplimiento")).toBeVisible();
    await expect(area.getByText("Información general")).toBeVisible();
    await expect(area.getByText("$85.255,00")).toBeVisible();
    await expect(area.getByText("120 días").first()).toBeVisible();
    await expect(area.getByText("Cronograma", { exact: true })).toBeVisible();
    await expect(area.getByText("Alcance del proyecto")).toBeVisible();
    await expect(area.getByText("Librería de cintas LTO-9")).toBeVisible();
    await expect(area.getByText("Requisitos técnicos clave")).toBeVisible();
    await expect(area.getByText("Procesadores")).toBeVisible();
    await expect(area.getByText("Referencia: Pregunta 2")).toBeVisible();
    await expect(area.getByText("Infraestructura existente")).toBeVisible();
    await expect(area.getByText("Entregables y obligaciones del oferente")).toBeVisible();
    await expect(area.getByText("Checklist de cumplimiento").first()).toBeVisible();
    await expect(area.getByText("Observaciones importantes")).toBeVisible();

    // No debe traer el detalle de personal técnico/experiencia — eso es del Anexo 2/3.
    await expect(area.getByText("Equipo técnico propuesto")).toHaveCount(0);
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

    await expect(page.getByRole("heading", { name: "Resumen del proceso", exact: true })).toBeHidden();

    await page.emulateMedia({ media: "screen" });
  });
});
