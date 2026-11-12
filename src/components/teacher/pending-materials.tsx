"use client";

import { upload } from "@vercel/blob/client";
import { FileText, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 20;
const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

interface Item { key: string; title: string; url: string; size: number }

/**
 * PDFs for a lesson that does not exist yet. Each file is uploaded to Blob as soon as it is chosen; the form
 * then submits their addresses (matTitle / matUrl / matSize) and createLesson attaches them to the new lesson.
 */
export function PendingMaterials({ enabled }: { enabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    if (files.length === 0) return;
    if (items.length + files.length > MAX_FILES) return setError(`Ən çox ${MAX_FILES} PDF əlavə etmək olar.`);
    for (const f of files) {
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setError(`“${f.name}” PDF deyil.`);
      if (f.size > MAX_BYTES) return setError(`“${f.name}” 10 MB-dan böyükdür.`);
    }
    setBusy(true);
    try {
      for (const f of files) {
        const blob = await upload("materials/new.pdf", f, { access: "public", handleUploadUrl: "/api/materials/upload", contentType: "application/pdf" });
        setItems((cur) => [...cur, { key: blob.url, title: f.name.replace(/\.pdf$/i, "").slice(0, 120), url: blob.url, size: f.size }]);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? `Yükləmə alınmadı: ${err.message}` : "Yükləmə alınmadı. Bir az sonra yenidən yoxlayın.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
      <legend className="px-2 text-sm font-semibold">PDF materiallar (ixtiyari)</legend>
      <p className="text-sm text-muted">Lüğət, düsturlar, qaydalar. Şagirdlər bunları videonun altında görəcək. Yalnız PDF, hər biri maksimum 10 MB.</p>

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-3 px-3 py-2">
              <FileText size={16} className="shrink-0 text-accent-ink" />
              <input
                aria-label="Material adı"
                maxLength={120}
                value={it.title}
                onChange={(e) => setItems((cur) => cur.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm"
              />
              <span className="shrink-0 text-xs text-muted">{formatSize(it.size)}</span>
              <button type="button" aria-label="Sil" onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
                <X size={16} />
              </button>
              <input type="hidden" name="matTitle" value={it.title} />
              <input type="hidden" name="matUrl" value={it.url} />
              <input type="hidden" name="matSize" value={it.size} />
            </li>
          ))}
        </ul>
      )}

      {enabled ? (
        <div>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple onChange={onPick} disabled={busy} className="sr-only" id="pending-pdf" />
          <label htmlFor="pending-pdf" className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-2 ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <Paperclip size={16} /> {busy ? "Yüklənir…" : "PDF seç"}
          </label>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Fayl yükləmə bu mühitdə qoşulmayıb (Vercel Blob açarı yoxdur).</p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
