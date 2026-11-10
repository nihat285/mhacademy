"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, Circle, LogIn } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveLessonProgress, setLessonBookmark, setLessonCompleted } from "@/app/actions/lessons";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatClock } from "@/lib/format";
import type { VideoProvider } from "./video-source";
import { VideoPlayer } from "./video-player";

interface Props {
  lessonId: string;
  title: string;
  provider: VideoProvider;
  /** Null when the lesson has no (valid) video yet. */
  videoRef: string | null;
  signInHref: string;
  /** "student" can track; "staff" only views; null = anonymous. */
  viewer: "student" | "staff" | null;
  initial: { positionSec: number; completed: boolean; bookmarked: boolean };
}

export function LessonWatch({ lessonId, title, provider, videoRef, signInHref, viewer, initial }: Props) {
  const [completed, setCompleted] = useState(initial.completed);
  const [bookmarked, setBookmarked] = useState(initial.bookmarked);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(initial.positionSec);
  const [pending, startTransition] = useTransition();
  const lastPos = useRef(initial.positionSec);
  const canTrack = viewer === "student";

  const onTime = useCallback(
    (sec: number, state: "playing" | "paused" | "ended") => {
      if (!canTrack) return;
      lastPos.current = sec;
      const ended = state === "ended";
      void saveLessonProgress(lessonId, sec, ended).then((r) => {
        if (!r.ok) return;
        if (ended) setCompleted(true);
        setSaved(ended ? 0 : Math.floor(sec));
      });
    },
    [canTrack, lessonId],
  );

  // Persist the last known position when the tab is hidden.
  useEffect(() => {
    if (!canTrack) return;
    const flush = () => {
      if (document.visibilityState === "hidden" && lastPos.current > 0) void saveLessonProgress(lessonId, lastPos.current, false);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [canTrack, lessonId]);

  const toggleComplete = () => {
    const next = !completed;
    setCompleted(next);
    startTransition(async () => {
      const r = await setLessonCompleted(lessonId, next);
      if (!r.ok) {
        setCompleted(!next);
        setMessage(r.error ?? "Xəta baş verdi.");
      } else setMessage(null);
    });
  };
  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const r = await setLessonBookmark(lessonId, next);
      if (!r.ok) {
        setBookmarked(!next);
        setMessage(r.error ?? "Xəta baş verdi.");
      } else setMessage(null);
    });
  };

  return (
    <div>
      {videoRef && <VideoPlayer provider={provider} videoRef={videoRef} title={title} startAt={initial.positionSec} onTime={canTrack ? onTime : undefined} />}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canTrack ? (
          <>
            <Button variant={completed ? "secondary" : "primary"} size="md" onClick={toggleComplete} disabled={pending} aria-pressed={completed}>
              {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              {completed ? "Tamamlanıb" : "Dərsi tamamladım"}
            </Button>
            <Button variant="outline" size="md" onClick={toggleBookmark} disabled={pending} aria-pressed={bookmarked}>
              {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              {bookmarked ? "Yadda saxlanılıb" : "Yadda saxla"}
            </Button>
            {videoRef && saved > 0 && !completed && <p className="text-sm text-muted">Son mövqe: {formatClock(saved)}</p>}
          </>
        ) : viewer === null ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
            <p className="text-sm text-muted">İrəliləyişinizi izləmək, dərsləri yadda saxlamaq və qaldığınız yerdən davam etmək üçün daxil olun.</p>
            <Link href={signInHref} className={buttonClasses("primary", "sm")}>
              <LogIn size={16} /> Daxil ol
            </Link>
          </div>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-medium text-danger">
        {message}
      </p>
    </div>
  );
}
