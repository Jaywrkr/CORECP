"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  file: File;
}

export default function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const goToPage = (target: number) => {
    setPageNumber(target);
    pageRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const el = document.getElementById("pdf-viewer-container");
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(280, entry.contentRect.width - 32));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
          {file.name}
        </div>
        {numPages && (
          <div className="flex shrink-0 items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <button
              onClick={() => goToPage(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="rounded px-2 py-1 transition-colors hover:bg-white/5 disabled:opacity-30"
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className="tabular-nums">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="rounded px-2 py-1 transition-colors hover:bg-white/5 disabled:opacity-30"
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div id="pdf-viewer-container" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loadError ? (
          <div
            className="rounded-md border p-4 text-sm"
            style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            No se pudo mostrar el PDF: {loadError}
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setLoadError(err.message)}
            loading={
              <div className="flex h-40 items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                Cargando documento…
              </div>
            }
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                <div key={p} ref={(el) => { pageRefs.current[p] = el; }}>
                  <Page pageNumber={p} width={containerWidth} renderAnnotationLayer={false} />
                </div>
              ))}
          </Document>
        )}
      </div>
    </div>
  );
}
