"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import UploadZone from "@/components/UploadZone";
import DocumentTabs from "@/components/DocumentTabs";
import RequisitosPanel from "@/components/RequisitosPanel";
import TecnicosManager from "@/components/TecnicosManager";
import ProyectosManager from "@/components/ProyectosManager";
import { extractPdfText } from "@/lib/extractPdfText";
import { detectProcessCode } from "@/lib/detectProcessCode";
import { generarNombreProyecto } from "@/lib/generarNombreProyecto";
import type {
  Anexo2Firma,
  Anexo2OverridesMap,
  Anexo3Firma,
  Anexo3OverridesMap,
  Anexo3ProyectosMap,
  Anexo3TecnicoOverridesMap,
  ExtractionResult,
  ExtractionStatus,
} from "@/types/extraction";
import type { Tecnico } from "@/types/tecnico";
import type { Proyecto } from "@/types/proyecto";
import type { ProcesoCache } from "@/types/proceso";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
      Cargando visor de PDF…
    </div>
  ),
});

type SaveState = "idle" | "saving" | "saved" | "error";

interface AnexoExtras {
  anexo2Overrides: Anexo2OverridesMap;
  anexo2Firma: Anexo2Firma;
  anexo3Proyectos: Anexo3ProyectosMap;
  anexo3Overrides: Anexo3OverridesMap;
  anexo3TecnicoOverrides: Anexo3TecnicoOverridesMap;
  anexo3Firma: Anexo3Firma;
}

const EXTRAS_VACIAS: AnexoExtras = {
  anexo2Overrides: {},
  anexo2Firma: {},
  anexo3Proyectos: {},
  anexo3Overrides: {},
  anexo3TecnicoOverrides: {},
  anexo3Firma: {},
};

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function AnalizarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const numeroFromUrl = searchParams.get("numero");

  const [documents, setDocuments] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [showTecnicos, setShowTecnicos] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [showProyectos, setShowProyectos] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<number, string>>({});

  const [anexo3Proyectos, setAnexo3Proyectos] = useState<Anexo3ProyectosMap>({});

  const [numeroProceso, setNumeroProceso] = useState(() => numeroFromUrl ?? "");
  const [nombreProyecto, setNombreProyecto] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadingProceso, setLoadingProceso] = useState(() => Boolean(numeroFromUrl));

  const lastAnalysisRef = useRef<{ cacheKey: string; documentos: string[] } | null>(null);
  const extrasRef = useRef<AnexoExtras>(EXTRAS_VACIAS);

  useEffect(() => {
    fetch("/api/tecnicos")
      .then((res) => res.json())
      .then((data) => setTecnicos(Array.isArray(data?.tecnicos) ? data.tecnicos : []))
      .catch(() => setTecnicos([]));
    fetch("/api/proyectos")
      .then((res) => res.json())
      .then((data) => setProyectos(Array.isArray(data?.proyectos) ? data.proyectos : []))
      .catch(() => setProyectos([]));
  }, []);

  // Load a previously saved proceso when arriving via /analizar?numero=...
  useEffect(() => {
    if (!numeroFromUrl) return;
    let cancelled = false;
    fetch(`/api/procesos?numero=${encodeURIComponent(numeroFromUrl)}`)
      .then((res) => res.json())
      .then((data: { proceso?: ProcesoCache; error?: string }) => {
        if (cancelled) return;
        if (!data?.proceso) {
          setError(`No se encontró el proceso "${numeroFromUrl}". Puede haber sido eliminado.`);
          return;
        }
        lastAnalysisRef.current = {
          cacheKey: data.proceso.numeroProceso,
          documentos: data.proceso.documentos,
        };
        const extras: AnexoExtras = {
          anexo2Overrides: data.proceso.anexo2Overrides ?? {},
          anexo2Firma: data.proceso.anexo2Firma ?? {},
          anexo3Proyectos: data.proceso.anexo3Proyectos ?? {},
          anexo3Overrides: data.proceso.anexo3Overrides ?? {},
          anexo3TecnicoOverrides: data.proceso.anexo3TecnicoOverrides ?? {},
          anexo3Firma: data.proceso.anexo3Firma ?? {},
        };
        extrasRef.current = extras;
        setNumeroProceso(data.proceso.numeroProceso);
        setNombreProyecto(data.proceso.nombreProyecto);
        setResult(data.proceso.result);
        setFromCache(true);
        setCacheUpdatedAt(data.proceso.actualizadoEn);
        setAnexo3Proyectos(extras.anexo3Proyectos);
        setSaveState("saved");
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el proceso guardado.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProceso(false);
      });
    return () => {
      cancelled = true;
    };
  }, [numeroFromUrl]);

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

  const guardarResultado = useCallback(
    async (
      cacheKey: string,
      extractionResult: ExtractionResult,
      documentos: string[],
      overrides?: Partial<AnexoExtras>,
    ) => {
      const extras = { ...extrasRef.current, ...overrides };
      setSaveState("saving");
      try {
        const res = await fetch("/api/procesos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numeroProceso: cacheKey, result: extractionResult, documentos, ...extras }),
        });
        const data: { proceso?: ProcesoCache; error?: string } = await res.json();
        if (!res.ok || !data.proceso) throw new Error(data.error || "No se pudo guardar el análisis.");
        setNombreProyecto(data.proceso.nombreProyecto);
        lastAnalysisRef.current = { cacheKey, documentos };
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [],
  );

  const resetAnalysisState = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgressLabel(null);
    setAsignaciones({});
    extrasRef.current = EXTRAS_VACIAS;
    setAnexo3Proyectos({});
    setFromCache(false);
    setCacheUpdatedAt(null);
    setNombreProyecto(null);
    setSaveState("idle");
    lastAnalysisRef.current = null;
  }, []);

  const runExtraction = useCallback(
    async (docs: File[], options?: { forceRefresh?: boolean }) => {
      if (docs.length === 0) return;

      setStatus("uploading");
      setError(null);
      setResult(null);
      setAsignaciones({});
      extrasRef.current = EXTRAS_VACIAS;
      setAnexo3Proyectos({});
      setFromCache(false);
      setCacheUpdatedAt(null);
      setNombreProyecto(null);
      setSaveState("idle");

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
              const extras: AnexoExtras = {
                anexo2Overrides: cacheData.proceso.anexo2Overrides ?? {},
                anexo2Firma: cacheData.proceso.anexo2Firma ?? {},
                anexo3Proyectos: cacheData.proceso.anexo3Proyectos ?? {},
                anexo3Overrides: cacheData.proceso.anexo3Overrides ?? {},
                anexo3TecnicoOverrides: cacheData.proceso.anexo3TecnicoOverrides ?? {},
                anexo3Firma: cacheData.proceso.anexo3Firma ?? {},
              };
              extrasRef.current = extras;
              setResult(cacheData.proceso.result);
              setFromCache(true);
              setCacheUpdatedAt(cacheData.proceso.actualizadoEn);
              setNombreProyecto(cacheData.proceso.nombreProyecto);
              setAnexo3Proyectos(extras.anexo3Proyectos);
              setSaveState("saved");
              lastAnalysisRef.current = {
                cacheKey: cacheData.proceso.numeroProceso,
                documentos: cacheData.proceso.documentos,
              };
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

        const extractionResult = data as ExtractionResult;
        setResult(extractionResult);
        setStatus("done");

        // Always generate the CLIENTE-AÑOMESDIA-DESCRIPCION project name from
        // the analysis itself — it must not depend on an official número de
        // proceso being detected, since many pliegos won't have one.
        const autoNombre = generarNombreProyecto(
          extractionResult.identificacion?.cliente ?? "",
          extractionResult.identificacion?.descripcion ?? "",
        );
        setNombreProyecto(autoNombre);

        // When there's no official número de proceso, use the generated name
        // as the storage key so the analysis still gets saved and shows up
        // in the process menu.
        const cacheKey = numero || autoNombre;
        if (!numero) setNumeroProceso(cacheKey);

        void guardarResultado(cacheKey, extractionResult, extracted.map((d) => d.filename));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido al procesar los documentos.");
        setStatus("error");
      } finally {
        setProgressLabel(null);
      }
    },
    [numeroProceso, guardarResultado],
  );

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      const existingKeys = new Set(documents.map(fileKey));
      const merged = [...documents, ...newFiles.filter((f) => !existingKeys.has(fileKey(f)))];
      if (merged.length === documents.length) return;
      setDocuments(merged);
      resetAnalysisState();
    },
    [documents, resetAnalysisState],
  );

  const handleRemoveDocument = useCallback(
    (index: number) => {
      const next = documents.filter((_, i) => i !== index);
      setDocuments(next);
      setActiveIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
      resetAnalysisState();
    },
    [documents, resetAnalysisState],
  );

  const handleAnalyze = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents);
  }, [documents, runExtraction]);

  const handleReset = useCallback(() => {
    setDocuments([]);
    setActiveIndex(0);
    setNumeroProceso("");
    resetAnalysisState();
  }, [resetAnalysisState]);

  const handleRetry = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents);
  }, [documents, runExtraction]);

  const handleForceReanalyze = useCallback(() => {
    if (documents.length > 0) void runExtraction(documents, { forceRefresh: true });
  }, [documents, runExtraction]);

  const handleRetrySave = useCallback(() => {
    if (result && lastAnalysisRef.current) {
      void guardarResultado(lastAnalysisRef.current.cacheKey, result, lastAnalysisRef.current.documentos);
    }
  }, [result, guardarResultado]);

  const handleAnexo3ProyectosChange = useCallback(
    (rowIndex: number, proyectoIds: string[]) => {
      setAnexo3Proyectos((prev) => {
        const next = { ...prev, [rowIndex]: proyectoIds };
        if (result && lastAnalysisRef.current) {
          void guardarResultado(lastAnalysisRef.current.cacheKey, result, lastAnalysisRef.current.documentos, {
            anexo3Proyectos: next,
          });
        }
        return next;
      });
    },
    [result, guardarResultado],
  );

  const isBusy = status === "uploading" || status === "extracting";

  const handleBack = useCallback(async () => {
    if (isBusy) return;
    if (!result || saveState === "saved") {
      router.push("/");
      return;
    }
    if (lastAnalysisRef.current) {
      const ok = await guardarResultado(lastAnalysisRef.current.cacheKey, result, lastAnalysisRef.current.documentos);
      if (ok) {
        router.push("/");
        return;
      }
    }
    const leaveAnyway = window.confirm(
      "No se pudo guardar este análisis en la base de datos todavía. Si sales ahora, se perderá. ¿Salir de todas formas?",
    );
    if (leaveAnyway) router.push("/");
  }, [isBusy, result, saveState, guardarResultado, router]);

  const activeFile = documents[activeIndex] ?? null;
  const hasContent = documents.length > 0 || result !== null;
  const canAnalyze = documents.length > 0 && (status === "idle" || status === "error");

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex shrink-0 items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Nuevo análisis
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Coresolutions · Fase 1: extracción y visualización
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProyectos(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Proyectos
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

      {showProyectos && (
        <ProyectosManager
          onClose={() => setShowProyectos(false)}
          proyectos={proyectos}
          onProyectosChange={setProyectos}
        />
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

          {canAnalyze && (
            <button
              onClick={handleAnalyze}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Analizar
            </button>
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

          {result && saveState === "saving" && (
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Guardando…
            </span>
          )}
          {result && saveState === "saved" && (
            <span className="text-[11px] font-medium" style={{ color: "var(--accent-hover)" }}>
              Guardado ✓
            </span>
          )}
          {result && saveState === "error" && (
            <button
              onClick={handleRetrySave}
              className="rounded px-2 py-0.5 text-[11px] font-medium hover:bg-white/5"
              style={{ color: "var(--danger)" }}
            >
              Error al guardar — reintentar
            </button>
          )}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Columna izquierda: PDF(s) */}
        <section
          className="flex min-h-[50vh] flex-1 flex-col border-b lg:min-h-0 lg:w-1/2 lg:border-r lg:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          {loadingProceso ? (
            <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
              Cargando proceso guardado…
            </div>
          ) : !activeFile ? (
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
            numeroProceso={numeroProceso}
            nombreProyecto={nombreProyecto}
            tecnicos={tecnicos}
            proyectos={proyectos}
            asignaciones={asignaciones}
            onAssignTecnico={handleAssignTecnico}
            anexo3Proyectos={anexo3Proyectos}
            onAnexo3ProyectosChange={handleAnexo3ProyectosChange}
          />
        </section>
      </main>
    </div>
  );
}
