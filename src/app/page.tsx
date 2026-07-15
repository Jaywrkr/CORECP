"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import RequisitosPanel from "@/components/RequisitosPanel";
import type { ExtractionResult, ExtractionStatus } from "@/types/extraction";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
      Cargando visor de PDF…
    </div>
  ),
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExtraction = useCallback(async (pdfFile: File) => {
    setStatus("uploading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      setStatus("extracting");
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al procesar el documento.");
      }

      setResult(data as ExtractionResult);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al procesar el documento.");
      setStatus("error");
    }
  }, []);

  const handleFileSelected = useCallback(
    (selected: File) => {
      setFile(selected);
      void runExtraction(selected);
    },
    [runExtraction],
  );

  const handleRetry = useCallback(() => {
    if (file) void runExtraction(file);
  }, [file, runExtraction]);

  const isBusy = status === "uploading" || status === "extracting";

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex shrink-0 items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{ background: "var(--accent-soft)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2">
              <path
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Extractor de Anexos — Compras Públicas
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Coresolutions · Fase 1: extracción y visualización
            </p>
          </div>
        </div>
        {file && (
          <button
            onClick={() => {
              setFile(null);
              setStatus("idle");
              setResult(null);
              setError(null);
            }}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Cargar otro pliego
          </button>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Columna izquierda: PDF */}
        <section
          className="flex min-h-[50vh] flex-1 flex-col border-b lg:min-h-0 lg:w-1/2 lg:border-r lg:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          {!file ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-md">
                <UploadZone onFileSelected={handleFileSelected} disabled={isBusy} />
              </div>
            </div>
          ) : (
            <PdfViewer key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />
          )}
        </section>

        {/* Columna derecha: requisitos */}
        <section
          className="flex min-h-[50vh] flex-1 flex-col overflow-y-auto lg:min-h-0 lg:w-1/2"
          style={{ background: "var(--bg-panel)" }}
        >
          <RequisitosPanel status={status} result={result} error={error} onRetry={handleRetry} />
        </section>
      </main>
    </div>
  );
}
