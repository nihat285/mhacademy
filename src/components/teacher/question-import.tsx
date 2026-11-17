"use client";

import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useRef, useState } from "react";
import { extractQuestionsFromPdf, importQuestions, parseQuestionsFromPasted } from "@/app/actions/question-import";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { DraftQuestion, ImportResult } from "@/lib/question-import";

interface Draft extends DraftQuestion {
  key: number;
}

const LETTERS = ["A", "B", "C", "D", "E"];
const field = "w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const valid = (d: Draft) => d.text.trim().length >= 5 && d.options.length >= 2 && d.options.every((o) => o.trim()) && d.correct !== null && d.correct < d.options.length;

export function QuestionImport({ subjects, topics }: { subjects: { id: string; name: string }[]; topics: { id: string; subjectId: string; name: string }[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [points, setPoints] = useState("1");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState<"" | "read" | "save">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ count: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const load = (r: ImportResult | { error: string }) => {
    if ("error" in r) return setError(r.error);
    setDrafts(r.questions.map((q) => ({ ...q, key: seq.current++ })));
    setNotes(r.notes);
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setDone(null);
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return setError("Yalnız PDF faylı seçin.");
    if (file.size > 10 * 1024 * 1024) return setError("PDF 10 MB-dan böyük ola bilməz.");
    setBusy("read");
    try {
      const blob = await upload(`imports/${Date.now()}.pdf`, file, { access: "public", handleUploadUrl: "/api/materials/upload", contentType: "application/pdf" });
      load(await extractQuestionsFromPdf(blob.url));
    } catch (e) {
      setError(e instanceof Error && e.message ? `Yükləmə alınmadı: ${e.message}` : "Yükləmə alınmadı. Bir az sonra yenidən yoxlayın.");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onPaste() {
    setError("");
    setDone(null);
    setBusy("read");
    try {
      load(await parseQuestionsFromPasted(pasted));
    } finally {
      setBusy("");
    }
  }

  const patch = (key: number, fn: (d: Draft) => Draft) => setDrafts((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));
  const good = drafts.filter(valid);

  async function save() {
    setError("");
    setBusy("save");
    try {
      const r = await importQuestions({
        subjectId,
        topicId: topicId || null,
        difficulty,
        points: Number(points.replace(",", ".")) || 1,
        items: good.map((d) => ({ text: d.text.trim(), options: d.options.map((o) => o.trim()), correct: d.correct as number })),
      });
      if ("error" in r) return setError(r.error);
      setDone({ count: r.count, skipped: drafts.length - good.length });
      setDrafts([]);
      setNotes([]);
      setPasted("");
    } finally {
      setBusy("");
    }
  }

  if (done) {
    return (
      <Card className="p-6" role="status">
        <h2 className="font-display text-xl font-semibold">{done.count} sual sual bankına əlavə olundu</h2>
        {done.skipped > 0 && <p className="mt-1 text-sm text-muted">{done.skipped} natamam sual keçildi.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/muellim/suallar" className="font-semibold text-accent-ink underline">Sual bankına bax</Link>
          <button type="button" className="font-semibold text-accent-ink underline" onClick={() => setDone(null)}>Başqa PDF yüklə</button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <label className="block text-sm font-semibold">
          Fənn
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); }} className={cn(field, "mt-1.5 h-11")}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Mövzu (ixtiyari)
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={cn(field, "mt-1.5 h-11")}>
            <option value="">Mövzusuz</option>
            {topics.filter((t) => t.subjectId === subjectId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Çətinlik
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className={cn(field, "mt-1.5 h-11")}>
            <option value="easy">Asan</option>
            <option value="medium">Orta</option>
            <option value="hard">Çətin</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Hər sualın balı
          <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="decimal" className={cn(field, "mt-1.5 h-11")} />
        </label>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">1. PDF seçin</h2>
        <p className="mt-1 text-sm text-muted">
          Suallar <b>1.</b> və ya <b>1)</b> ilə, variantlar <b>A) B) C) D)</b> ilə başlamalıdır. Cavab açarı faylın sonunda <b>Cavablar: 1-A 2-C …</b> kimi olmalıdır. Mətni seçilib kopyalana bilən PDF lazımdır (10 MB-a qədər).
        </p>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" disabled={busy !== ""} onChange={(e) => onFile(e.target.files?.[0])} className="mt-3 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-on-accent" />
        {busy === "read" && <p className="mt-3 text-sm text-muted" role="status">PDF oxunur…</p>}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-accent-ink">PDF alınmırsa: mətni əl ilə yapışdır</summary>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} placeholder={"1. Sual mətni\nA) ... B) ... C) ... D) ...\n\nCavablar: 1-B 2-C"} className={cn(field, "mt-3 py-2.5")} />
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy !== "" || pasted.trim().length < 10} onClick={onPaste}>Mətndən oxu</Button>
        </details>
      </Card>

      {error && <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      {drafts.length > 0 && (
        <section aria-labelledby="prev-h" className="grid gap-4">
          <div>
            <h2 id="prev-h" className="font-display text-lg font-semibold">2. Yoxlayın və düzəldin ({drafts.length} sual)</h2>
            {notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 rounded-xl bg-warning-bg px-8 py-3 text-sm text-warning">
                {notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>
          {drafts.map((d, qi) => (
            <Card key={d.key} className={cn("p-4 sm:p-5", !valid(d) && "border-warning/60")}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-muted">Sual {qi + 1}{!valid(d) && <span className="ml-2 font-semibold text-warning">natamam, idxal olunmayacaq</span>}</span>
                <button type="button" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))} className="text-sm font-semibold text-danger hover:underline">Sil</button>
              </div>
              <textarea aria-label={`Sual ${qi + 1} mətni`} value={d.text} onChange={(e) => patch(d.key, (x) => ({ ...x, text: e.target.value }))} rows={2} className={cn(field, "mt-2 py-2")} />
              <div className="mt-3 grid gap-2">
                {d.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" aria-label={`Sual ${qi + 1}: ${LETTERS[oi]} düzgün cavabdır`} name={`c-${d.key}`} checked={d.correct === oi} onChange={() => patch(d.key, (x) => ({ ...x, correct: oi }))} className="h-4 w-4 accent-[var(--gold-500)]" />
                    <span className="w-5 text-sm font-bold text-muted">{LETTERS[oi]}</span>
                    <input aria-label={`Sual ${qi + 1}, variant ${LETTERS[oi]}`} value={o} onChange={(e) => patch(d.key, (x) => ({ ...x, options: x.options.map((y, yi) => (yi === oi ? e.target.value : y)) }))} className={cn(field, "h-10")} />
                    <button type="button" aria-label="Variantı sil" onClick={() => patch(d.key, (x) => ({ ...x, options: x.options.filter((_, yi) => yi !== oi), correct: x.correct === null || x.correct === oi ? null : x.correct > oi ? x.correct - 1 : x.correct }))} className="px-1 text-muted hover:text-danger">✕</button>
                  </div>
                ))}
                {d.options.length < 5 && (
                  <button type="button" onClick={() => patch(d.key, (x) => ({ ...x, options: [...x.options, ""] }))} className="w-fit text-sm font-semibold text-accent-ink hover:underline">+ variant əlavə et</button>
                )}
              </div>
            </Card>
          ))}
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-pop">
            <Button type="button" disabled={busy !== "" || good.length === 0} onClick={save}>{busy === "save" ? "Yazılır…" : `${good.length} sualı sual bankına əlavə et`}</Button>
            {drafts.length > good.length && <span className="text-sm text-muted">{drafts.length - good.length} natamam sual keçiləcək</span>}
          </div>
        </section>
      )}
    </div>
  );
}
