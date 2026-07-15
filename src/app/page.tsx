"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import DocumentTabs from "@/components/DocumentTabs";
import RequisitosPanel from "@/components/RequisitosPanel";
import TecnicosManager from "@/components/TecnicosManager";
import ProcesosManager from "@/components/ProcesosManager";
import { extractPdfText } from "@/lib/extractPdfText";
import { detectProcessCode } from "@/lib/detectProcessCode";
import type { ExtractionResult, ExtractionStatus } from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import type { ProcesoCache } from "@/types/proceso";

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
  const [showProcesos, setShowProcesos] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<number, string>>({});

  const [numeroProceso, setNumeroProceso] = useState("");
  const [nombreProyecto, setNombreProyecto] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null);

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

  const runExtraction = useCallback(
    async (docs: File[], options?: { forceRefresh?: boolean }) => {
      if (docs.length === 0) {
        setStatus("idle");
        setResult(null);
        setError(null);
        setProgressLabel(null);
        setAsignaciones({});
        setFromCache(false);
        setCacheUpdatedAt(null);
        setNombreProyecto(null);
        return;
      }

      setStatus("uploading");
      setError(null);
      setResult(null);
      setAsignaciones({});
      setFromCache(false);
      setCacheUpdatedAt(null);
      setNombreProyecto(null);

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

        // Prefer whatever número de proceso the user already entered; only
        // auto-detect (and pre-fill the field) when they haven't set one.
        let numero = numeroProceso.trim();
        if (!numero) {
          for (const doc of extracted) {
            const guess = detectProcessCode(doc.text);
            if (guess) {
              numero = guess;
              setNumeroProceso(guess);
              break;
            }
          }
        }

        if (numero && !options?.forceRefresh) {
          setProgressLabel("Buscando un análisis previo para este proceso…");
          try {
            const cacheRes = await fetch(`/api/procesos?numero=${encodeURIComponent(numero)}`);
            const cacheData: { proceso?: ProcesoCache } | null = await cacheRes.json().catch(() => null);
            if (cacheRes.ok && cacheData?.proceso) {
              setResult(cacheData.proceso.result);
              setFromCache(true);
              setCacheUpdatedAt(cacheData.proceso.actualizadoEn);
              setNombreProyecto(cacheData.proceso.nombreProyecto);
              setStatus("done");
              setProgressLabel(null);
              return;
            }
          } catch {
            // Cache lookup failing shouldn't block a fresh analysis — fall through.
          }
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

        if (numero) {
          // Best-effort cache write — a failure here shouldn't affect the
          // result already shown to the user.
          fetch("/api/procesos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              numeroProceso: numero,
              result: data,
              documentos: extracted.map((d) => d.filename),
            }),
          })
            .then((res) => res.json())
            .then((saved: { proceso?: ProcesoCache }) => {
              if (saved?.proceso?.nombreProyecto) setNombreProyecto(saved.proceso.nombreProyecto);
            })
            .catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido al procesar los documentos.");
        setStatus("error");
      } finally {
        setProgressLabel(null);
      }
    },
    [numeroProceso],
  );

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
    setNumeroProceso("");
    setNombreProyecto(null);
    setFromCache(false);
    setCacheUpdatedAt(null);
  }, []);

  const handleOpenProceso = useCallback((proceso: ProcesoCache) => {
    setDocuments([]);
    setActiveIndex(0);
    setError(null);
    setProgressLabel(null);
    setAsignaciones({});
    setNumeroProceso(proceso.numeroProceso);
    setNombreProyecto(proceso.nombreProyecto);
    setResult(proceso.result);
    setFromCache(true);
    setCacheUpdatedAt(proceso.actualizadoEn);
    setStatus("done");
  }, []);

  const handleRetry = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents);
  }, [documents, runExtraction]);

  const handleForceReanalyze = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents, { forceRefresh: true });
  }, [documents, runExtraction]);

  const isBusy = status === "uploading" || status === "extracting";
  const activeFile = documents[activeIndex] ?? null;
  const hasContent = documents.length > 0 || result !== null;

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
            onClick={() => setShowProcesos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Procesos
          </button>
          <button
            onClick={() => setShowTecnicos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Técnicos
          </button>
          {documents.length > 0 && (
            <UploadZone onFilesSelected={handleFilesSelected} disabled={isBusy} compact />
          )}
          {hasContent && (
            <button
              onClick={handleReset}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Empezar de nuevo
            </button>
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

      {showProcesos && (
        <ProcesosManager onClose={() => setShowProcesos(false)} onOpenProceso={handleOpenProceso} />
      )}

      {hasContent && (
        <div
          className="flex flex-wrap items-center gap-3 border-b px-6 py-2.5"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Número de proceso
            <input
              value={numeroProceso}
              onChange={(e) => setNumeroProceso(e.target.value)}
              disabled={isBusy}
              placeholder="ej. SIE-EERSSA-2026-023"
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
            />
          </label>

          {nombreProyecto && (
            <span
              className="rounded px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              title="Nombre de proyecto generado automáticamente: CLIENTE-AÑOMESDIA-DESCRIPCIÓN"
            >
              {nombreProyecto}
            </span>
          )}

          {fromCache && (
            <>
              <span
                className="rounded px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
              >
                Cargado desde caché{cacheUpdatedAt ? ` · ${new Date(cacheUpdatedAt).toLocaleString("es-EC")}` : ""} — no se usó IA
              </span>
              <button
                onClick={handleForceReanalyze}
                disabled={isBusy}
                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Reanalizar con IA
              </button>
            </>
          )}
        </div>
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
                {result && !documents.length ? (
                  <p className="mb-4 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Este proceso se cargó desde el caché — el PDF original no se guarda, solo el
                    resultado. Sube el pliego de nuevo si necesitas visualizarlo.
                  </p>
                ) : null}
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
