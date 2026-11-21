"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import { playsLeft } from "@/lib/passages/rules";

export interface PanelPassage {
  id: string;
  title: string;
  body: string | null;
  audioUrl: string | null;
  maxPlays: number | null;
}

function fmt(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * Audio with an optional play limit. With a limit: a single Play/Pause button, no seeking, no native controls;
 * a play is counted when playback starts from the beginning (pause/resume is free). The count is kept in
 * localStorage so a refresh does not reset it.
 * NOTE: this is a convenience limit in the browser, not a security boundary — the file itself is a public URL.
 */
function LimitedAudio({ src, maxPlays, storageKey }: { src: string; maxPlays: number; storageKey: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [used, setUsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(storageKey) ?? 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted client-only state after mount
      if (Number.isFinite(n) && n > 0) setUsed(Math.min(n, maxPlays));
    } catch { /* storage unavailable */ }
  }, [storageKey, maxPlays]);

  const left = playsLeft(maxPlays, used) ?? 0;
  const bump = () => {
    setUsed((u) => {
      const n = u + 1;
      try { localStorage.setItem(storageKey, String(n)); } catch { /* ignore */ }
      return n;
    });
  };

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    const fresh = a.currentTime < 0.5 || a.ended;
    if (fresh && left <= 0) return;
    if (a.ended) a.currentTime = 0;
    void a.play().then(() => { if (fresh) bump(); }).catch(() => { /* blocked or failed: no play counted */ });
  };

  const exhausted = left <= 0 && !playing && pos < 0.5;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3">
      <audio
        ref={ref} src={src} preload="metadata" controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
      />
      <button
        type="button" onClick={toggle} disabled={exhausted}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {playing ? <Pause size={18} /> : <Play size={18} />} {playing ? "Fasilə" : used === 0 ? "Dinlə" : "Davam et / təkrar dinlə"}
      </button>
      <div className="min-w-[8rem] flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Audio irəliləyişi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dur ? Math.round((pos / dur) * 100) : 0}>
          <div className="h-full bg-accent" style={{ width: `${dur ? (pos / dur) * 100 : 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">{fmt(pos)} / {dur ? fmt(dur) : "—"}</p>
      </div>
      <p className="text-sm font-semibold" role="status">
        {exhausted ? "Dinləmə hüququ bitib" : `Qalan dinləmə: ${left} / ${maxPlays}`}
      </p>
    </div>
  );
}

/** Reading text and/or audio shown above the questions of a passage during an exam. Never contains the transcript. */
export function PassagePanel({ passage, attemptId }: { passage: PanelPassage; attemptId: string }) {
  return (
    <section aria-label="Parça" className="mb-5 rounded-2xl border border-accent/40 bg-surface p-5 shadow-card sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 font-sans text-sm font-bold text-accent-ink">
        {passage.audioUrl && <Headphones size={16} aria-hidden />} {passage.title}
      </h2>
      {passage.audioUrl && (
        passage.maxPlays ? (
          <LimitedAudio src={passage.audioUrl} maxPlays={passage.maxPlays} storageKey={`mh-plays-${attemptId}-${passage.id}`} />
        ) : (
          <audio src={passage.audioUrl} controls preload="metadata" controlsList="nodownload" className="w-full" />
        )
      )}
      {passage.body && (
        <div className={`${passage.audioUrl ? "mt-4 " : ""}max-h-[22rem] overflow-y-auto whitespace-pre-line rounded-xl bg-bg p-4 text-[0.95rem] leading-relaxed`} tabIndex={0} aria-label="Mətn">
          {passage.body}
        </div>
      )}
    </section>
  );
}
