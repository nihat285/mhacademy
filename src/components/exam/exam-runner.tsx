"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Cloud, CloudOff, Flag, Maximize2, WifiOff } from "lucide-react";
import { saveAnswerAction, submitAttemptAction } from "@/app/actions/exam";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import type { TakingState } from "@/lib/exam/engine";

type QState = { optionId: string | null; numeric: string | null; flagged: boolean };
type SaveStatus = "saved" | "saving" | "retry";

const TYPE_HINT = { mcq: "Bir düzgün cavabı seçin", true_false: "Doğru və ya yanlış", numeric: "Cavabı rəqəmlə yazın" } as const;

export function ExamRunner({ state }: { state: TakingState }) {
  const router = useRouter();
  const { attemptId, questions, deadlineMs, serverNowMs } = state;
  const storageKey = `mh-pending-${attemptId}`;

  const [answers, setAnswers] = useState<Record<string, QState>>(() => {
    const m: Record<string, QState> = {};
    for (const q of questions) m[q.id] = state.answers[q.id] ?? { optionId: null, numeric: null, flagged: false };
    return m;
  });
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((deadlineMs - serverNowMs) / 1000)));
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [online, setOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const offsetRef = useRef(0); // serverNow - clientNow, measured on mount; protects against a wrong device clock
  const pendingRef = useRef<Record<string, QState>>({});
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const doneRef = useRef(false);
  const warned = useRef<Set<number>>(new Set());

  const finish = useCallback((href: string) => {
    doneRef.current = true;
    try { localStorage.removeItem(storageKey); } catch { /* storage unavailable */ }
    router.replace(href);
  }, [router, storageKey]);

  const writePending = () => {
    try {
      if (Object.keys(pendingRef.current).length) localStorage.setItem(storageKey, JSON.stringify(pendingRef.current));
      else localStorage.removeItem(storageKey);
    } catch { /* storage unavailable */ }
  };

  /** Sends every pending question state, oldest first, one at a time (keeps server-side ordering). */
  const flush = useCallback((): Promise<void> => {
    chainRef.current = chainRef.current.then(async () => {
      for (const qid of Object.keys(pendingRef.current)) {
        if (doneRef.current) return;
        const snapshot = pendingRef.current[qid];
        let res;
        try {
          res = await saveAnswerAction(attemptId, { questionId: qid, optionId: snapshot.optionId, numeric: snapshot.numeric, flagged: snapshot.flagged });
        } catch {
          setStatus("retry");
          return; // network failure: keep pending, the retry timer picks it up
        }
        if (res.ok) {
          // Only clear if nothing newer arrived while this request was in flight.
          if (pendingRef.current[qid] === snapshot) delete pendingRef.current[qid];
        } else if (res.code === "closed" || res.code === "expired") {
          // The server closed the attempt (deadline passed or submitted elsewhere): go to the result.
          pendingRef.current = {};
          writePending();
          const r = await submitAttemptAction(attemptId, true);
          if (r.ok) finish(r.href);
          return;
        } else if (res.code === "invalid") {
          delete pendingRef.current[qid]; // will never succeed; do not loop forever
        } else {
          setStatus("retry");
          return;
        }
      }
      writePending();
      setStatus(Object.keys(pendingRef.current).length ? "retry" : "saved");
    });
    return chainRef.current;
  }, [attemptId, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = useCallback((qid: string, patch: Partial<QState>) => {
    setAnswers((prev) => {
      const next = { ...prev[qid], ...patch };
      pendingRef.current = { ...pendingRef.current, [qid]: next };
      writePending();
      return { ...prev, [qid]: next };
    });
    setStatus("saving");
    void flush();
  }, [flush]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async (auto: boolean) => {
    if (doneRef.current) return;
    setSubmitting(true);
    setSubmitError(null);
    dialogRef.current?.close();
    await flush();
    const r = await submitAttemptAction(attemptId, auto).catch(() => ({ ok: false as const, error: "Bağlantı xətası. Yenidən cəhd edilir…" }));
    if (r.ok) return finish(r.href);
    setSubmitting(false);
    setSubmitError(r.error);
  }, [attemptId, finish, flush]);

  // Measure the clock offset, recover unsent edits after a refresh/outage, and start periodic sync.
  useEffect(() => {
    offsetRef.current = serverNowMs - Date.now();
    // Deferred: restoring state from storage is an external-system sync, not part of the render pass.
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const p = JSON.parse(saved) as Record<string, QState>;
          const valid = Object.fromEntries(Object.entries(p).filter(([k]) => questions.some((q) => q.id === k)));
          if (Object.keys(valid).length) {
            pendingRef.current = valid;
            setAnswers((prev) => ({ ...prev, ...valid }));
            void flush();
          }
        }
      } catch { /* ignore corrupt storage */ }
    });
    const sync = setInterval(() => { if (Object.keys(pendingRef.current).length) void flush(); }, 8_000);
    const on = () => { setOnline(true); void flush(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    queueMicrotask(() => setOnline(navigator.onLine));
    return () => { clearInterval(sync); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown (cosmetic: the server enforces the deadline independently).
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineMs - (Date.now() + offsetRef.current)) / 1000));
      setRemaining(left);
      for (const mark of [300, 60, 30]) {
        if (left <= mark && !warned.current.has(mark)) {
          warned.current.add(mark);
          setAnnounce(mark === 300 ? "Vaxtın bitməsinə 5 dəqiqə qalıb." : mark === 60 ? "Vaxtın bitməsinə 1 dəqiqə qalıb." : "Vaxtın bitməsinə 30 saniyə qalıb.");
        }
      }
      if (left === 0 && !doneRef.current) void submit(true);
    }, 500);
    return () => clearInterval(t);
  }, [deadlineMs, submit]);

  // Warn before accidental refresh/close while the attempt is open.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!doneRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // Arrow-key navigation when focus is not in a text field.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "radio") return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [questions.length]);

  const q = questions[idx];
  const a = answers[q.id];
  const isAnswered = (id: string) => answers[id].optionId !== null || (answers[id].numeric !== null && answers[id].numeric!.trim() !== "");
  const counts = useMemo(() => {
    const answered = questions.filter((x) => isAnswered(x.id)).length;
    const flagged = questions.filter((x) => answers[x.id].flagged).length;
    return { answered, flagged, left: questions.length - answered };
  }, [answers, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgent = remaining <= 60;
  const low = remaining <= 300;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{state.title}</p>
            <p className="text-xs text-muted">Sual {idx + 1} / {questions.length} · cavablanıb {counts.answered}</p>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
              {!online ? <><WifiOff size={14} /> Offlayn</> : status === "saved" ? <><Cloud size={14} /> Saxlanıldı</> : status === "saving" ? <><Cloud size={14} className="animate-pulse" /> Saxlanılır…</> : <><CloudOff size={14} className="text-warning" /> Yenidən cəhd edilir</>}
            </span>
            <div role="timer" aria-label="Qalan vaxt" className={cn("inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-lg font-bold tabular-nums", urgent ? "bg-danger-bg text-danger" : low ? "bg-warning-bg text-warning" : "bg-surface-2")}>
              <Clock size={18} aria-hidden /> {formatClock(remaining)}
            </div>
            <button type="button" aria-label="Tam ekran" title="Tam ekran" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2 sm:inline-flex"><Maximize2 size={18} /></button>
            <button type="button" disabled={submitting} onClick={() => dialogRef.current?.showModal()} className="h-10 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent hover:brightness-105 disabled:opacity-50">Təqdim et</button>
          </div>
        </div>
        <div className="h-1 bg-surface-2"><div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(counts.answered / questions.length) * 100}%` }} /></div>
        {low && (
          <p role="alert" className={cn("px-4 py-2 text-center text-sm font-semibold", urgent ? "bg-danger text-white" : "bg-warning-bg text-warning")}>
            <AlertTriangle size={14} className="mr-1.5 inline" aria-hidden />
            {urgent ? "Vaxt bitmək üzrədir! Cavablarınız avtomatik təqdim olunacaq." : `Vaxtın bitməsinə ${Math.ceil(remaining / 60)} dəqiqə qalıb.`}
          </p>
        )}
        {(!online || status === "retry") && (
          <p role="status" className="bg-warning-bg px-4 py-2 text-center text-sm font-medium text-warning">
            Bağlantı problemi: cavablarınız bu cihazda saxlanılıb və bağlantı bərpa olunanda avtomatik göndəriləcək.
          </p>
        )}
      </header>
      <p className="sr-only" aria-live="assertive">{announce}</p>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_17rem]">
        <main id="main" className="min-w-0">
          <section aria-labelledby="q-title" className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p id="q-title" className="text-sm font-bold text-accent-ink">Sual {idx + 1}</p>
              <p className="text-xs text-muted">{q.points} bal · {TYPE_HINT[q.type]}</p>
            </div>
            <p className="whitespace-pre-line text-lg leading-relaxed">{q.text}</p>
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="Sual üçün şəkil" className="mt-4 max-h-80 rounded-xl border border-border object-contain" />
            )}

            {q.type === "numeric" ? (
              <div className="mt-6">
                <label htmlFor={`num-${q.id}`} className="mb-1.5 block text-sm font-semibold">Cavabınız</label>
                <input
                  id={`num-${q.id}`} key={q.id} inputMode="decimal" autoComplete="off" maxLength={30} defaultValue={a.numeric ?? ""}
                  onChange={(e) => change(q.id, { numeric: e.target.value.trim() === "" ? null : e.target.value })}
                  className="h-12 w-full max-w-xs rounded-xl border border-border-strong bg-bg px-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <p className="mt-1.5 text-xs text-muted">Ondalıq üçün vergül və ya nöqtə işlədə bilərsiniz.</p>
              </div>
            ) : (
              <fieldset className="mt-6 space-y-2.5">
                <legend className="sr-only">Cavab variantları</legend>
                {q.options.map((o, i) => {
                  const selected = a.optionId === o.id;
                  return (
                    <label key={o.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition", selected ? "border-accent bg-accent/10" : "border-border hover:bg-surface-2")}>
                      <input type="radio" name={`q-${q.id}`} checked={selected} onChange={() => change(q.id, { optionId: o.id })} className="mt-1 h-4 w-4 accent-[var(--gold-500)]" />
                      <span><span className="mr-2 font-bold text-muted">{q.type === "mcq" ? String.fromCharCode(65 + i) + "." : ""}</span>{o.text}</span>
                    </label>
                  );
                })}
                {a.optionId && (
                  <button type="button" onClick={() => change(q.id, { optionId: null })} className="text-sm font-semibold text-muted hover:text-text hover:underline">Seçimi təmizlə</button>
                )}
              </fieldset>
            )}
          </section>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setIdx(idx - 1)} disabled={idx === 0} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"><ArrowLeft size={16} /> Əvvəlki</button>
            <button type="button" aria-pressed={a.flagged} onClick={() => change(q.id, { flagged: !a.flagged })} className={cn("inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold", a.flagged ? "border-warning bg-warning-bg text-warning" : "border-border-strong bg-surface hover:bg-surface-2")}>
              <Flag size={16} /> {a.flagged ? "İşarəni götür" : "Baxış üçün işarələ"}
            </button>
            {idx < questions.length - 1 ? (
              <button type="button" onClick={() => setIdx(idx + 1)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90">Növbəti <ArrowRight size={16} /></button>
            ) : (
              <button type="button" onClick={() => dialogRef.current?.showModal()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent hover:brightness-105"><CheckCircle2 size={16} /> Yekunlaşdır</button>
            )}
          </div>
          {submitError && <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">{submitError}</p>}
        </main>

        <aside aria-label="Sual naviqasiyası" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="mb-3 text-sm font-bold">Suallar</p>
            <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((x, i) => {
                const ans = isAnswered(x.id);
                const flag = answers[x.id].flagged;
                return (
                  <li key={x.id}>
                    <button
                      type="button" onClick={() => setIdx(i)} aria-current={i === idx ? "step" : undefined}
                      aria-label={`Sual ${i + 1}: ${ans ? "cavablanıb" : "cavabsız"}${flag ? ", işarələnib" : ""}`}
                      className={cn("relative h-10 w-full rounded-lg border text-sm font-bold transition", ans ? "border-transparent bg-brand text-on-brand" : "border-border-strong bg-bg text-muted hover:bg-surface-2", i === idx && "ring-2 ring-accent ring-offset-2 ring-offset-surface")}
                    >
                      {i + 1}
                      {flag && <Flag size={10} aria-hidden className="absolute -right-1 -top-1 rounded-full bg-warning p-0.5 text-white" fill="currentColor" />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-4 space-y-1.5 text-xs text-muted">
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand" /> Cavablanıb ({counts.answered})</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-border-strong" /> Cavabsız ({counts.left})</li>
              <li className="flex items-center gap-2"><Flag size={12} className="text-warning" /> İşarələnib ({counts.flagged})</li>
            </ul>
          </div>
        </aside>
      </div>

      <dialog ref={dialogRef} aria-labelledby="submit-title" className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-6 text-text shadow-hero backdrop:bg-navy-950/70">
        <h2 id="submit-title" className="font-sans text-lg font-bold">Sınağı təqdim edirsiniz?</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Cavablanıb: <strong>{counts.answered}</strong> / {questions.length}</li>
          {counts.left > 0 && <li className="text-warning">Cavabsız qalan: <strong>{counts.left}</strong></li>}
          {counts.flagged > 0 && <li className="text-warning">Baxış üçün işarələnmiş: <strong>{counts.flagged}</strong></li>}
        </ul>
        <p className="mt-3 text-sm text-muted">Təqdimdən sonra cavabları dəyişmək mümkün olmayacaq.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} className="h-11 rounded-xl border border-border-strong px-4 text-sm font-semibold hover:bg-surface-2">Qayıt</button>
          <button type="button" disabled={submitting} onClick={() => void submit(false)} className="h-11 rounded-xl bg-accent px-5 text-sm font-bold text-on-accent hover:brightness-105 disabled:opacity-50">{submitting ? "Təqdim edilir…" : "Bəli, təqdim et"}</button>
        </div>
      </dialog>
      {submitting && <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 text-white">Təqdim edilir…</div>}
    </div>
  );
}
