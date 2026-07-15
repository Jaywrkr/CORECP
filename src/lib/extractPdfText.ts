import type { TextItem } from "pdfjs-dist/types/src/display/api";

/**
 * Extracts all selectable text from a PDF, page by page, entirely in the
 * browser. Doing this client-side keeps the raw PDF bytes off the wire —
 * only the (much smaller) plain text is sent to the server, avoiding
 * hosting-provider request body size limits for serverless functions.
 *
 * pdfjs-dist is loaded via a dynamic import so its browser-only APIs
 * (e.g. DOMMatrix) are never evaluated during Next.js's server-side
 * prerender of this ("use client") module graph.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => item.str)
      .join(" ");
    pageTexts.push(pageText);
  }

  await pdf.destroy();

  return pageTexts.join("\n\n").trim();
}
