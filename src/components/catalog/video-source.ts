/**
 * Validates a stored `videoRef` and turns it into a safe playable source.
 * Nothing but the shapes below is ever returned, so arbitrary stored strings
 * can never become an iframe/video URL.
 */
export type VideoProvider = "youtube" | "vimeo" | "mp4" | "embed";

export type VideoSource =
  | { kind: "youtube"; id: string; src: string }
  | { kind: "vimeo"; id: string; src: string }
  | { kind: "mp4"; src: string }
  | { kind: "embed"; src: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;
const EMBED_HOSTS = new Set(["www.youtube-nocookie.com", "youtube-nocookie.com", "player.vimeo.com"]);

/** Accepts a bare id or a common YouTube URL form and returns just the 11-char id. */
function youtubeId(ref: string): string | null {
  if (YT_ID.test(ref)) return ref;
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return YT_ID.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ?? null;
      return v && YT_ID.test(v) ? v : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

function vimeoId(ref: string): string | null {
  if (VIMEO_ID.test(ref)) return ref;
  try {
    const u = new URL(ref);
    if (u.hostname === "vimeo.com" || u.hostname === "player.vimeo.com") {
      const m = u.pathname.match(/(\d{5,12})(?:\/|$)/);
      return m ? m[1] : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

function isSafeMediaUrl(ref: string): boolean {
  if (/[\s<>"'`\\]/.test(ref)) return false;
  if (ref.startsWith("//")) return false;
  if (ref.startsWith("/")) return true;
  try {
    const u = new URL(ref);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function resolveVideo(provider: VideoProvider, videoRef: string | null | undefined, opts: { startAt?: number } = {}): VideoSource | null {
  const ref = videoRef?.trim();
  if (!ref || ref.length > 2048) return null;
  const start = Math.max(0, Math.floor(opts.startAt ?? 0));
  switch (provider) {
    case "youtube": {
      const id = youtubeId(ref);
      if (!id) return null;
      const p = new URLSearchParams({ rel: "0", modestbranding: "1", enablejsapi: "1", playsinline: "1" });
      if (start > 0) p.set("start", String(start));
      return { kind: "youtube", id, src: `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}` };
    }
    case "vimeo": {
      const id = vimeoId(ref);
      if (!id) return null;
      return { kind: "vimeo", id, src: `https://player.vimeo.com/video/${id}${start > 0 ? `#t=${start}s` : ""}` };
    }
    case "mp4":
      return isSafeMediaUrl(ref) ? { kind: "mp4", src: ref } : null;
    case "embed": {
      try {
        const u = new URL(ref);
        if (u.protocol !== "https:" || u.username || u.password || !EMBED_HOSTS.has(u.hostname)) return null;
        if (!u.pathname.startsWith("/embed/") && !u.pathname.startsWith("/video/")) return null;
        return { kind: "embed", src: u.toString() };
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

/** Only http(s) or same-site absolute paths may be linked as downloadable materials. */
export function safeFileUrl(url: string): string | null {
  return isSafeMediaUrl(url.trim()) ? url.trim() : null;
}
