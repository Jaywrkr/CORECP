"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type !== "application/pdf") return;
      onFileSelected(file);
    },
    [onFileSelected],
  );

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
      aria-label="Subir pliego en PDF"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
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
          Arrastra el pliego PDF aquí o haz clic para seleccionarlo
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Solo archivos PDF · Se procesa en memoria, no se almacena
        </p>
      </div>
    </div>
  );
}
