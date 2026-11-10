"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = () => document.documentElement.dataset.theme ?? "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={next === "dark" ? "Qaranlıq rejimə keç" : "İşıqlı rejimə keç"}
      title={next === "dark" ? "Qaranlıq rejim" : "İşıqlı rejim"}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `mh-theme=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text transition hover:bg-surface-2"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
