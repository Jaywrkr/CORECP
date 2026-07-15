"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function UploadZone({ onFilesSelected, disabled, compact }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf");
      if (pdfFiles.length === 0) return;
      onFilesSelected(pdfFiles);
    },
    [onFilesSelected],
  );

  if (compact) {
    return (
      <button
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        + Agregar otro pliego
      </button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center transition-colors"
      style={{
        borderColor: isDragging ? "var(--accent)" : "var(--border)",
        background: isDragging ? "var(--accent-soft)" : "var(--bg-elevated)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
      role="button"
      tabIndex={0}
      aria-label="Subir uno o más pliegos en PDF"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Arrastra uno o más pliegos PDF aquí o haz clic para seleccionarlos
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Puedes subir varios documentos del mismo proceso · Se procesan en memoria, no se almacenan
        </p>
      </div>
    </div>
  );
}
