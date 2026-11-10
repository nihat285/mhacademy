"use client";

import { useEffect, useRef } from "react";
import { resolveVideo, type VideoProvider } from "./video-source";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

interface Props {
  provider: VideoProvider;
  videoRef: string | null;
  title: string;
  /** Resume position in seconds. */
  startAt?: number;
  /** Called with the current position while playing (throttled by the caller). */
  onTime?: (sec: number, state: "playing" | "paused" | "ended") => void;
}

/**
 * Secure video embed. The stored reference is re-validated here before any URL is built; unknown
 * providers or malformed refs render nothing. YouTube position/ended events are read through the
 * documented postMessage channel (enablejsapi=1) without loading any extra third-party script.
 */
export function VideoPlayer({ provider, videoRef, title, startAt = 0, onTime }: Props) {
  const source = resolveVideo(provider, videoRef, { startAt });
  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const onTimeRef = useRef(onTime);
  useEffect(() => {
    onTimeRef.current = onTime;
  });
  const kind = source?.kind;

  // YouTube: listen for player info messages.
  useEffect(() => {
    if (kind !== "youtube") return;
    const el = frame.current;
    if (!el) return;
    let lastState = -2;
    let lastEmit = 0;
    const handshake = () => el.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT_ORIGIN);
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== YT_ORIGIN || ev.source !== el.contentWindow || typeof ev.data !== "string") return;
      let data: { event?: string; info?: unknown };
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.event !== "infoDelivery" && data.event !== "onStateChange") return;
      const info = data.info;
      const obj = info && typeof info === "object" ? (info as { currentTime?: unknown; playerState?: unknown }) : null;
      const t = typeof obj?.currentTime === "number" ? obj.currentTime : null;
      const st = typeof info === "number" ? info : typeof obj?.playerState === "number" ? obj.playerState : null;
      const now = Date.now();
      if (st !== null && st !== lastState) {
        lastState = st;
        if (st === 0) return void onTimeRef.current?.(t ?? 0, "ended");
        if (st === 2 && t !== null) return void onTimeRef.current?.(t, "paused");
      }
      if (t !== null && lastState === 1 && now - lastEmit > 15_000) {
        lastEmit = now;
        onTimeRef.current?.(t, "playing");
      }
    };
    window.addEventListener("message", onMessage);
    el.addEventListener("load", handshake);
    handshake();
    return () => {
      window.removeEventListener("message", onMessage);
      el.removeEventListener("load", handshake);
    };
  }, [kind]);

  // mp4: native events + resume.
  useEffect(() => {
    if (kind !== "mp4") return;
    const el = video.current;
    if (!el) return;
    let lastEmit = 0;
    const resume = () => {
      if (startAt > 0 && startAt < (el.duration || Infinity) - 3) el.currentTime = startAt;
    };
    const onTimeUpdate = () => {
      const now = Date.now();
      if (!el.paused && now - lastEmit > 15_000) {
        lastEmit = now;
        onTimeRef.current?.(el.currentTime, "playing");
      }
    };
    const onPause = () => !el.ended && onTimeRef.current?.(el.currentTime, "paused");
    const onEnded = () => onTimeRef.current?.(el.currentTime, "ended");
    el.addEventListener("loadedmetadata", resume);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", resume);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
    // startAt is only read on first load of the media.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  if (!source) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy-950 shadow-hero">
      {source.kind === "mp4" ? (
        <video ref={video} src={source.src} controls preload="metadata" playsInline controlsList="nodownload" className="h-full w-full" aria-label={title}>
          Brauzeriniz video oynatmanı dəstəkləmir.
        </video>
      ) : (
        <iframe
          ref={frame}
          src={source.src}
          title={title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          className="absolute inset-0 h-full w-full border-0"
        />
      )}
    </div>
  );
}
