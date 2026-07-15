"use client";

interface DocumentTabsProps {
  files: File[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export default function DocumentTabs({ files, activeIndex, onSelect, onRemove, disabled }: DocumentTabsProps) {
  if (files.length <= 1) return null;

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-3 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      {files.map((file, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}`}
            className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors"
            style={{
              borderColor: isActive ? "var(--accent)" : "var(--border-subtle)",
              background: isActive ? "var(--accent-soft)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            <button
              onClick={() => onSelect(i)}
              className="max-w-[160px] truncate"
              title={file.name}
            >
              {file.name}
            </button>
            <button
              onClick={() => !disabled && onRemove(i)}
              disabled={disabled}
              aria-label={`Quitar ${file.name}`}
              className="shrink-0 leading-none disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: "var(--text-tertiary)" }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
