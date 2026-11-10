"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { checkPracticeAnswer, type PracticeResult } from "@/app/actions/practice";
import { Prose } from "@/components/prose";
import { Photo } from "@/components/cards";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, ProgressBar } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export interface PracticeQuestion {
  id: string;
  type: "mcq" | "true_false" | "numeric";
  text: string;
  imageUrl: string | null;
  subjectName: string;
  topicName: string | null;
  options: { id: string; text: string }[];
}

/** One-question-at-a-time practice. The browser never receives the answer key before the answer is stored. */
export function PracticeSession({ questions, backHref, restartHref }: { questions: PracticeQuestion[]; backHref: string; restartHref: string }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [numeric, setNumeric] = useState("");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [pending, start] = useTransition();

  const total = questions.length;
  const finished = index >= total;

  if (finished) {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-ink">Təkrar bitdi</p>
        <p className="mt-3 font-display text-5xl font-semibold tabular-nums">
          {correct} <span className="text-2xl text-muted">/ {total}</span>
        </p>
        <p className="mt-2 text-muted">
          {correct === total ? "Əla! Bütün səhvlərini düzəltdin." : correct > 0 ? `${correct} səhvini düzəltdin. Qalanlarını yenidən təkrar et.` : "Bu dəfə alınmadı. İzahlara baxıb yenidən cəhd et."}
        </p>
        <div className="mx-auto mt-5 max-w-xs"><ProgressBar value={pct} tone={pct >= 50 ? "success" : "gold"} label="Düzgün cavab faizi" /></div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LinkButton href={backHref} variant="outline">Səhvlərimə bax</LinkButton>
          <LinkButton href={restartHref}>Yenidən təkrar et</LinkButton>
        </div>
      </Card>
    );
  }

  const q = questions[index];
  const isNumeric = q.type === "numeric";
  const hasAnswer = isNumeric ? numeric.trim() !== "" : selected !== null;

  function submit() {
    setError(null);
    let payload: { questionId: string; optionId?: string; numeric?: number };
    if (isNumeric) {
      const n = Number(numeric.trim().replace(",", "."));
      if (!Number.isFinite(n)) return setError("Rəqəm daxil edin.");
      payload = { questionId: q.id, numeric: n };
    } else {
      payload = { questionId: q.id, optionId: selected ?? undefined };
    }
    start(async () => {
      const r = await checkPracticeAnswer(payload);
      if (!r.ok) return setError(r.error ?? "Xəta baş verdi.");
      setResult(r);
      if (r.isCorrect) setCorrect((c) => c + 1);
    });
  }

  function next() {
    setIndex((i) => i + 1);
    setSelected(null);
    setNumeric("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>Sual {index + 1} / {total}</span>
        <span>{correct} düzgün</span>
      </div>
      <ProgressBar value={(index / total) * 100} label="Təkrar irəliləyişi" />

      <Card className="mt-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{q.subjectName}</Badge>
          {q.topicName && <Badge>{q.topicName}</Badge>}
        </div>
        <Prose text={q.text} className="mt-4 text-lg font-medium" />
        {q.imageUrl && <Photo src={q.imageUrl} alt="Sualın şəkli" className="mt-4 max-h-72 w-auto rounded-xl border border-border" />}

        {isNumeric ? (
          <div className="mt-5">
            <label htmlFor="num" className="mb-1.5 block text-sm font-semibold">Cavabınız (rəqəmlə)</label>
            <input
              id="num"
              value={numeric}
              onChange={(e) => setNumeric(e.target.value)}
              disabled={!!result}
              inputMode="decimal"
              autoComplete="off"
              className="h-11 w-full max-w-xs rounded-xl border border-border-strong bg-surface px-3.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {result && (
              <p className="mt-2 text-sm">
                Düzgün cavab: <strong className="tabular-nums">{result.correctNumeric ?? "—"}</strong>
              </p>
            )}
          </div>
        ) : (
          <fieldset className="mt-5 grid gap-2.5" disabled={!!result || pending}>
            <legend className="sr-only">Cavab variantları</legend>
            {q.options.map((o) => {
              const isRight = result?.correctOptionIds?.includes(o.id);
              const isWrongPick = result && selected === o.id && !isRight;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[0.95rem] transition",
                    !result && (selected === o.id ? "border-accent bg-accent/10" : "border-border-strong hover:bg-surface-2"),
                    isRight && "border-success bg-success-bg",
                    isWrongPick && "border-danger bg-danger-bg",
                    result && !isRight && !isWrongPick && "border-border opacity-70",
                  )}
                >
                  <input type="radio" name="option" value={o.id} checked={selected === o.id} onChange={() => setSelected(o.id)} className="mt-1 h-4 w-4 accent-[var(--gold-500)]" />
                  <span className="flex-1">{o.text}</span>
                  {isRight && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-label="Düzgün cavab" />}
                  {isWrongPick && <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-label="Sənin cavabın" />}
                </label>
              );
            })}
          </fieldset>
        )}

        {error && <p role="alert" className="mt-4 text-sm font-medium text-danger">{error}</p>}

        {result ? (
          <div className="mt-6" aria-live="polite">
            <p className={cn("flex items-center gap-2 text-lg font-bold", result.isCorrect ? "text-success" : "text-danger")}>
              {result.isCorrect ? <><CheckCircle2 size={20} /> Düzgündür! Bu sual səhvlər siyahısından çıxarıldı.</> : <><XCircle size={20} /> Səhvdir. Sual siyahıda qalır.</>}
            </p>
            {result.whyWrong && <p className="mt-2 text-sm text-muted"><strong className="text-text">Niyə səhvdir:</strong> {result.whyWrong}</p>}
            {result.concept && <p className="mt-2 text-sm text-muted"><strong className="text-text">Anlayış:</strong> {result.concept}</p>}
            {result.explanation && (
              <div className="mt-3 rounded-xl bg-surface-2 p-4 text-sm">
                <p className="mb-1 font-semibold">İzah</p>
                <Prose text={result.explanation} />
              </div>
            )}
            {result.steps && result.steps.length > 0 && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
                {result.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            )}
            {result.lesson && (
              <p className="mt-3 text-sm">
                Əlaqəli dərs: <Link href={`/dersler/${result.lesson.slug}`} className="font-semibold text-accent-ink hover:underline">{result.lesson.title}</Link>
              </p>
            )}
            <Button onClick={next} className="mt-5">{index + 1 === total ? "Nəticəyə bax" : "Növbəti sual"}</Button>
          </div>
        ) : (
          <Button onClick={submit} disabled={!hasAnswer || pending} className="mt-6">
            {pending ? "Yoxlanılır…" : "Cavabı yoxla"}
          </Button>
        )}
      </Card>
    </div>
  );
}
