"use client";

import { upload } from "@vercel/blob/client";
import { Camera, Trash2, User } from "lucide-react";
import { useRef, useState } from "react";

const MAX_SIDE = 900;

/** Downscales to at most MAX_SIDE px and re-encodes as JPEG, so a 6 MB phone photo becomes ~150 KB. */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  if (!blob) throw new Error("encode");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/** Profile photo picker. Submits the final image address in a hidden `name` field. */
export function PhotoUpload({ name, defaultValue, enabled }: { name: string; defaultValue: string; enabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Yalnız şəkil faylı seçin (JPG, PNG, WebP).");
    setBusy(true);
    try {
      let small: File;
      try {
        small = await shrink(file);
      } catch {
        return setError("Şəkil oxuna bilmədi. JPG və ya PNG formatında seçin.");
      }
      const blob = await upload("photos/profile.jpg", small, { access: "public", handleUploadUrl: "/api/materials/upload", contentType: "image/jpeg" });
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error && err.message ? `Yükləmə alınmadı: ${err.message}` : "Yükləmə alınmadı. Bir az sonra yenidən yoxlayın.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold">Şəkil</span>
      <div className="flex items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profil şəkli" className="h-24 w-24 rounded-2xl border border-border object-cover" />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-2xl border border-dashed border-border-strong text-muted"><User size={32} /></span>
        )}
        <div className="grid gap-2">
          {enabled ? (
            <>
              <input ref={inputRef} id={`${name}-file`} type="file" accept="image/*" onChange={onPick} disabled={busy} className="sr-only" />
              <label htmlFor={`${name}-file`} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-2 ${busy ? "pointer-events-none opacity-60" : ""}`}>
                <Camera size={16} /> {busy ? "Yüklənir…" : url ? "Şəkli dəyiş" : "Şəkil seç"}
              </label>
            </>
          ) : (
            <p className="max-w-xs text-sm text-muted">Şəkil yükləmə bu mühitdə qoşulmayıb (Vercel Blob açarı yoxdur).</p>
          )}
          {url && !busy && (
            <button type="button" onClick={() => setUrl("")} className="inline-flex items-center gap-2 text-sm font-semibold text-danger hover:underline">
              <Trash2 size={14} /> Şəkli sil
            </button>
          )}
          <p className="text-xs text-muted">JPG, PNG və ya WebP. Şəkil avtomatik kiçildilir. Yadda saxla düyməsini basmağı unutmayın.</p>
        </div>
      </div>
      <input type="hidden" name={name} value={url} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
