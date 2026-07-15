"use client";

import { Suspense } from "react";
import AnalizarContent from "./AnalizarContent";

export default function AnalizarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          Cargando…
        </div>
      }
    >
      <AnalizarContent />
    </Suspense>
  );
}
