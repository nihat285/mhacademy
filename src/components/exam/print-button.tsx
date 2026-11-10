"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
      <Printer size={16} /> Çap et / PDF yüklə
    </button>
  );
}
