"use client";

import { upload } from "@vercel/blob/client";
import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addLessonMaterial, deleteLessonMaterial } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";

const MAX_BYTES = 10 * 1024 * 1024;
const formatSize = (b: number | null) => (b == null ? "" : b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export interface MaterialRow { id: string; title: string; fileUrl: string; sizeBytes: number | null }

export function LessonMaterials({ lessonId, materials, enabled }: { lessonId: string; materials: MaterialRow[]; enabled: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("PDF faylı seçin.");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("Yalnız PDF faylı qəbul olunur.");
    if (file.size > MAX_BYTES) return setError("Fayl 10 MB-dan böyükdür.");
    const name = title.trim() || file.name.replace(/\.pdf$/i, "");
    setBusy(true);
    try {
      const blob = await upload(`materials/${lessonId}.pdf`, file, { access: "public", handleUploadUrl: "/api/materials/upload", contentType: "application/pdf" });
      const res = await addLessonMaterial({ lessonId, title: name, url: blob.url, size: file.size });
      if (res.error) return setError(res.error);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? `Yükləmə alınmadı: ${err.message}` : "Yükləmə alınmadı. Bir az sonra yenidən yoxlayın.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8 p-5 sm:p-7">
      <h2 className="font-sans text-lg font-bold">PDF materiallar</h2>
      <p className="mt-1 text-sm text-muted">Lüğət, düsturlar, qaydalar və s. Şagirdlər bunları videonun altında görəcək. Yalnız PDF, maksimum 10 MB.</p>

      {materials.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <FileText size={18} className="shrink-0 text-accent-ink" />
              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">{m.title}</a>
              <span className="shrink-0 text-xs text-muted">{formatSize(m.sizeBytes)}</span>
              <ConfirmButton action={async () => { const r = await deleteLessonMaterial(m.id); if (r.ok) router.refresh(); return r; }} title="Material silinsin?" description="PDF şagirdlərə artıq görünməyəcək." confirmLabel="Sil">Sil</ConfirmButton>
            </li>
          ))}
        </ul>
      )}

      {enabled ? (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-semibold">
            Ad (ixtiyari)
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="məs. Lüğət" className="h-10 rounded-xl border border-border-strong bg-surface px-3 text-sm font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            PDF faylı
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" required className="text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold" />
          </label>
          <Button type="submit" disabled={busy}><Upload size={16} /> {busy ? "Yüklənir…" : "Yüklə"}</Button>
          {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
        </form>
      ) : (
        <p className="mt-5 rounded-xl bg-surface-2 p-4 text-sm text-muted">Fayl yükləmə bu mühitdə qoşulmayıb. Saytda Vercel Blob qoşulandan sonra bu bölmə işləyəcək.</p>
      )}
    </Card>
  );
}
