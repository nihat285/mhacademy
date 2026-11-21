"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { createPassageAction, linkQuestionsAction, updatePassageAction } from "@/app/actions/passages";
import { CField, CForm, CSelect, CTextArea, FieldError } from "@/components/content/form-kit";
import { SubmitButton } from "@/components/ui/action-form";

export interface PassageFormValues {
  id?: string; title?: string; subjectId?: string; body?: string; transcript?: string; maxPlays?: number | null; audioUrl?: string | null;
}

/** Uploads the audio through /api/passages/audio, then the form submits only the returned URL. */
function AudioField({ currentUrl, useBlob }: { currentUrl?: string | null; useBlob: boolean }) {
  const [url, setUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setErr(null);
    if (!file) { setUrl(""); return; }
    setBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024) { setUrl(""); setErr("Fayl 25 MB limitini aşır."); return; }
      if (useBlob) {
        const ext = /\.(mp3|ogg|wav|m4a)$/i.exec(file.name)?.[1]?.toLowerCase();
        if (!ext) { setUrl(""); setErr("Yalnız MP3, M4A, OGG və ya WAV faylları qəbul olunur."); return; }
        const blob = await upload(`passage-audio/${Date.now()}.${ext}`, file, { access: "public", handleUploadUrl: "/api/passages/audio", multipart: file.size > 10 * 1024 * 1024 });
        setUrl(blob.url);
      } else {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/passages/audio", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) { setUrl(""); setErr(data.error ?? "Fayl yüklənmədi."); }
        else setUrl(data.url);
      }
    } catch (e) {
      setUrl(""); setErr(e instanceof Error && e.message && !/fetch|network/i.test(e.message) ? e.message : "Yükləmə alınmadı. Faylın növünü yoxlayıb yenidən cəhd edin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor="audio-file" className="mb-1.5 block text-sm font-semibold">Audio (könüllü)</label>
      {currentUrl && !url && (
        <div className="mb-2 space-y-2">
          <audio src={currentUrl} controls preload="none" className="w-full" />
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="removeAudio" className="h-4 w-4 accent-[var(--gold-500)]" /> Cari audionu sil</label>
        </div>
      )}
      <input
        id="audio-file" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
        onChange={(e) => void pick(e.target.files?.[0])}
        className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
      />
      <input type="hidden" name="audioUrl" value={url} />
      <p className="mt-1.5 text-xs text-muted">MP3, M4A, OGG və ya WAV, ən çoxu 25 MB. {currentUrl ? "Yeni fayl seçsəniz, köhnənin yerinə keçir." : ""}</p>
      {busy && <p role="status" className="mt-1.5 text-sm text-muted">Yüklənir…</p>}
      {url && !busy && <p role="status" className="mt-1.5 text-sm font-medium text-success">Fayl yükləndi. Saxla düyməsinə basın.</p>}
      {err && <p role="alert" className="mt-1.5 text-sm font-medium text-danger">{err}</p>}
      <FieldError name="audio" />
    </div>
  );
}

export function PassageForm({ area, subjects, values = {}, useBlob = false }: { area: "muellim" | "idare"; subjects: { id: string; name: string }[]; values?: PassageFormValues; useBlob?: boolean }) {
  const editing = !!values.id;
  return (
    <CForm action={editing ? updatePassageAction : createPassageAction} className="space-y-5">
      <input type="hidden" name="area" value={area} />
      {editing && <input type="hidden" name="id" value={values.id} />}
      {editing && <input type="hidden" name="hadAudio" value={values.audioUrl ? "1" : "0"} />}
      <CField name="title" label="Başlıq" defaultValue={values.title} maxLength={160} placeholder="Məsələn: Dinləmə 1 — Universitetdə söhbət" />
      <CSelect
        name="subjectId" label="Fənn (könüllü)" defaultValue={values.subjectId ?? ""}
        hint="Seçsəniz, suallar siyahısı yalnız bu fənnin suallarını göstərər."
        options={[{ value: "", label: "Fənn seçilməyib" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
      />
      <CTextArea name="body" label="Mətn (oxu parçası)" defaultValue={values.body} rows={10} maxLength={20000} hint="Sınaqda suallarla yanaşı göstərilir. Yalnız audio üçün boş buraxın." />
      <AudioField currentUrl={values.audioUrl} useBlob={useBlob} />
      <CField
        name="maxPlays" label="Dinləmə limiti (könüllü)" type="number" min={1} max={10} defaultValue={values.maxPlays ? String(values.maxPlays) : ""}
        hint="Məsələn 2 — şagird audionu ən çox 2 dəfə başlada bilər. Boş = limitsiz. Limit brauzerdə tətbiq olunur."
      />
      <CTextArea name="transcript" label="Transkript (könüllü)" defaultValue={values.transcript} rows={6} maxLength={20000} hint="Audionun mətni. Yalnız nəticələr açıldıqdan sonra, səhv təhlili səhifəsində göstərilir." />
      <SubmitButton pendingText="Saxlanılır…">{editing ? "Dəyişiklikləri saxla" : "Parçanı yarat"}</SubmitButton>
    </CForm>
  );
}

export function LinkQuestionsForm({ area, passageId, candidates }: { area: "muellim" | "idare"; passageId: string; candidates: { id: string; text: string; otherPassage: boolean }[] }) {
  if (candidates.length === 0) return <p className="p-5 text-sm text-muted">Əlavə ediləcək sual tapılmadı. Əvvəlcə sual bankına sual əlavə edin.</p>;
  return (
    <CForm action={linkQuestionsAction} className="p-5">
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="id" value={passageId} />
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {candidates.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-surface-2">
              <input type="checkbox" name="questionIds" value={c.id} className="mt-0.5 h-4 w-4 accent-[var(--gold-500)]" />
              <span className="line-clamp-2">{c.text}{c.otherPassage && <em className="ml-1 text-xs text-muted">(başqa parçadadır — köçürüləcək)</em>}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4"><SubmitButton pendingText="Əlavə olunur…" variant="outline">Seçilmiş sualları əlavə et</SubmitButton></div>
    </CForm>
  );
}
