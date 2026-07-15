"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import DocumentTabs from "@/components/DocumentTabs";
import RequisitosPanel from "@/components/RequisitosPanel";
import TecnicosManager from "@/components/TecnicosManager";
import { extractPdfText } from "@/lib/extractPdfText";
import type { ExtractionResult, ExtractionStatus } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
      Cargando visor de PDF…
    </div>
  ),
});

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function Home() {
  const [documents, setDocuments] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [showTecnicos, setShowTecnicos] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/tecnicos")
      .then((res) => res.json())
      .then((data) => setTecnicos(Array.isArray(data?.tecnicos) ? data.tecnicos : []))
      .catch(() => setTecnicos([]));
  }, []);

  const handleAssignTecnico = useCallback((rowIndex: number, tecnicoId: string) => {
    setAsignaciones((prev) => {
      if (!tecnicoId) {
        const next = { ...prev };
        delete next[rowIndex];
        return next;
      }
      return { ...prev, [rowIndex]: tecnicoId };
    });
  }, []);

  const runExtraction = useCallback(async (docs: File[]) => {
    if (docs.length === 0) {
      setStatus("idle");
      setResult(null);
      setError(null);
      setProgressLabel(null);
      setAsignaciones({});
      return;
    }

    setStatus("uploading");
    setError(null);
    setResult(null);
    setAsignaciones({});

    try {
      // Extract text for every document in the browser first — sending only
      // the text (not the raw PDF bytes) keeps the request well under
      // hosting body-size limits and avoids uploading the files at all.
      const extracted: { filename: string; text: string }[] = [];
      for (let i = 0; i < docs.length; i++) {
        setProgressLabel(
          docs.length > 1 ? `Leyendo documento ${i + 1} de ${docs.length}…` : "Leyendo el texto del PDF…",
        );
        let text: string;
        try {
          text = await extractPdfText(docs[i]);
        } catch {
          throw new Error(
            `No se pudo leer "${docs[i].name}". Verifica que el archivo no esté dañado o protegido.`,
          );
        }
        if (text) {
          extracted.push({ filename: docs[i].name, text });
        }
      }

      if (extracted.length === 0) {
        throw new Error(
          "No se pudo extraer texto de ningún documento. Es posible que sean escaneos (imágenes) sin texto seleccionable.",
        );
      }

      setProgressLabel(null);
      setStatus("extracting");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: extracted }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `El servidor respondió de forma inesperada (código ${res.status}). Intenta de nuevo.`,
        );
      }

      if (!res.ok) {
        const message = (data as { error?: string } | null)?.error;
        throw new Error(message || "Error al procesar los documentos.");
      }

      setResult(data as ExtractionResult);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al procesar los documentos.");
      setStatus("error");
    } finally {
      setProgressLabel(null);
    }
  }, []);

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      const existingKeys = new Set(documents.map(fileKey));
      const merged = [...documents, ...newFiles.filter((f) => !existingKeys.has(fileKey(f)))];
      if (merged.length === documents.length) return;
      setDocuments(merged);
      void runExtraction(merged);
    },
    [documents, runExtraction],
  );

  const handleRemoveDocument = useCallback(
    (index: number) => {
      const next = documents.filter((_, i) => i !== index);
      setDocuments(next);
      setActiveIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
      void runExtraction(next);
    },
    [documents, runExtraction],
  );

  const handleReset = useCallback(() => {
    setDocuments([]);
    setActiveIndex(0);
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgressLabel(null);
    setAsignaciones({});
  }, []);

  const handleRetry = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents);
  }, [documents, runExtraction]);

  const isBusy = status === "uploading" || status === "extracting";
  const activeFile = documents[activeIndex] ?? null;

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTecnicos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Técnicos
          </button>
          {documents.length > 0 && (
            <>
              <UploadZone onFilesSelected={handleFilesSelected} disabled={isBusy} compact />
              <button
                onClick={handleReset}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Empezar de nuevo
              </button>
            </>
          )}
        </div>
      </header>

      {showTecnicos && (
        <TecnicosManager
          onClose={() => setShowTecnicos(false)}
          tecnicos={tecnicos}
          onTecnicosChange={setTecnicos}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Columna izquierda: PDF(s) */}
        <section
          className="flex min-h-[50vh] flex-1 flex-col border-b lg:min-h-0 lg:w-1/2 lg:border-r lg:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          {!activeFile ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-md">
                <UploadZone onFilesSelected={handleFilesSelected} disabled={isBusy} />
              </div>
            </div>
          ) : (
            <>
              <DocumentTabs
                files={documents}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
                onRemove={handleRemoveDocument}
                disabled={isBusy}
              />
              <PdfViewer key={fileKey(activeFile)} file={activeFile} />
            </>
          )}
        </section>

        {/* Columna derecha: requisitos consolidados */}
        <section
          className="flex min-h-[50vh] flex-1 flex-col overflow-y-auto lg:min-h-0 lg:w-1/2"
          style={{ background: "var(--bg-panel)" }}
        >
          <RequisitosPanel
            status={status}
            result={result}
            error={error}
            onRetry={handleRetry}
            documentCount={documents.length}
            progressLabel={progressLabel}
            tecnicos={tecnicos}
            asignaciones={asignaciones}
            onAssignTecnico={handleAssignTecnico}
          />
        </section>
      </main>
    </div>
  );
}
