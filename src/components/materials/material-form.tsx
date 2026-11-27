"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { createMaterialAction, updateMaterialAction } from "@/app/actions/materials";
import { CField, CForm, CSelect, CTextArea, FieldError } from "@/components/content/form-kit";
import { SubmitButton } from "@/components/ui/action-form";
import { ACCESS_LABEL, GRADES, formatSize } from "@/lib/materials/rules";

export interface MaterialFormValues {
  id?: string; title?: string; subjectId?: string; description?: string; grade?: number | null; access?: string; published?: boolean; sizeBytes?: number | null;
}

const MAX_BYTES = 10 * 1024 * 1024;

/** The PDF goes straight to Vercel Blob (token from /api/materials/upload); the form submits only the returned url. */
function PdfField({ editing, sizeBytes }: { editing: boolean; sizeBytes?: number | null }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setErr(null);
    setUrl("");
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { setErr("Yalnız PDF faylı qəbul olunur."); return; }
    if (file.size > MAX_BYTES) { setErr("Fayl 10 MB-dan böyük ola bilməz."); return; }
    setBusy(true);
    try {
      const blob = await upload(`materials/${Date.now()}.pdf`, file, { access: "public", handleUploadUrl: "/api/materials/upload", contentType: "application/pdf" });
      setUrl(blob.url);
    } catch (e) {
      setErr(e instanceof Error && e.message && !/fetch|network/i.test(e.message) ? e.message : "Yükləmə alınmadı. Faylı yoxlayıb yenidən cəhd edin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor="pdf-file" className="mb-1.5 block text-sm font-semibold">PDF faylı</label>
      {editing && !url && <p className="mb-2 text-sm text-muted">Cari fayl saxlanılıb{sizeBytes ? ` (${formatSize(sizeBytes)})` : ""}. Dəyişmək üçün yeni PDF seçin.</p>}
      <input
        id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={(e) => void pick(e.target.files?.[0])}
        className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
      />
      <input type="hidden" name="fileUrl" value={url} />
      <p className="mt-1.5 text-xs text-muted">Yalnız PDF, ən çoxu 10 MB.</p>
      {busy && <p role="status" className="mt-1.5 text-sm text-muted">Yüklənir…</p>}
      {url && !busy && <p role="status" className="mt-1.5 text-sm font-medium text-success">Fayl yükləndi. Saxla düyməsinə basın.</p>}
      {err && <p role="alert" className="mt-1.5 text-sm font-medium text-danger">{err}</p>}
      <FieldError name="file" />
    </div>
  );
}

export function MaterialForm({ area, subjects, values = {} }: { area: "muellim" | "idare"; subjects: { id: string; name: string }[]; values?: MaterialFormValues }) {
  const editing = !!values.id;
  return (
    <CForm action={editing ? updateMaterialAction : createMaterialAction} className="space-y-5">
      <input type="hidden" name="area" value={area} />
      {editing && <input type="hidden" name="id" value={values.id} />}
      <CField name="title" label="Başlıq" defaultValue={values.title} maxLength={200} placeholder="Məsələn: Triqonometriya düsturları (cədvəl)" />
      <div className="grid gap-5 sm:grid-cols-2">
        <CSelect name="subjectId" label="Fənn" defaultValue={values.subjectId ?? ""} options={[{ value: "", label: "Fənn seçin" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
        <CSelect name="grade" label="Sinif" defaultValue={values.grade ? String(values.grade) : ""} options={[{ value: "", label: "Bütün siniflər" }, ...GRADES.map((g) => ({ value: String(g), label: `${g}-ci sinif` }))]} />
      </div>
      <CTextArea name="description" label="Təsvir (könüllü)" defaultValue={values.description} rows={4} maxLength={2000} hint="Materialın nə olduğunu və kimə lazım olduğunu qısa yazın." />
      <CSelect
        name="access" label="Kim yükləyə bilər" defaultValue={values.access ?? "public"}
        hint="“Yalnız qeydiyyatlı” seçilsə, daxil olmayan ziyarətçi əvvəlcə giriş səhifəsinə yönləndirilir."
        options={[{ value: "public", label: ACCESS_LABEL.public }, { value: "members", label: ACCESS_LABEL.members }]}
      />
      <PdfField editing={editing} sizeBytes={values.sizeBytes} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="published" defaultChecked={values.published ?? true} className="h-4 w-4 accent-[var(--gold-500)]" /> Saytda göstərilsin
      </label>
      <SubmitButton pendingText="Saxlanılır…">{editing ? "Dəyişiklikləri saxla" : "Materialı əlavə et"}</SubmitButton>
    </CForm>
  );
}
