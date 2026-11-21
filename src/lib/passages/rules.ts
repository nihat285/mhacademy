/** Pure validation for passages (reading text / listening audio). No DB, no I/O. */
export interface PassageInput {
  title: string;
  subjectId: string | null;
  body: string | null;
  transcript: string | null;
  maxPlays: number | null;
  /** True when the passage will have an audio file after this save (existing kept or new uploaded). */
  hasAudio: boolean;
}

export const MAX_BODY = 20_000;

export function validatePassage(raw: { title: string; subjectId: string; body: string; transcript: string; maxPlays: string; hasAudio: boolean }):
  { ok: true; data: PassageInput } | { ok: false; fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const title = raw.title.trim();
  const body = raw.body.trim() || null;
  const transcript = raw.transcript.trim() || null;
  if (title.length < 3) e.title = "Başlıq ən azı 3 simvol olmalıdır.";
  if (title.length > 160) e.title = "Başlıq 160 simvoldan uzun ola bilməz.";
  if (!body && !raw.hasAudio) e.body = "Mətn yazın və ya audio faylı yükləyin (ən azı biri lazımdır).";
  if (body && body.length > MAX_BODY) e.body = `Mətn ${MAX_BODY} simvoldan uzun ola bilməz.`;
  if (transcript && transcript.length > MAX_BODY) e.transcript = `Transkript ${MAX_BODY} simvoldan uzun ola bilməz.`;
  let maxPlays: number | null = null;
  if (raw.maxPlays.trim() !== "") {
    const n = Number(raw.maxPlays);
    if (!Number.isInteger(n) || n < 1 || n > 10) e.maxPlays = "Dinləmə sayı 1 ilə 10 arasında tam ədəd olmalıdır (limitsiz üçün boş buraxın).";
    else maxPlays = n;
  }
  if (maxPlays !== null && !raw.hasAudio) e.maxPlays = "Dinləmə limiti yalnız audio olan parça üçün qoyulur.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, data: { title, subjectId: raw.subjectId || null, body, transcript, maxPlays, hasAudio: raw.hasAudio } };
}

/** "2 dəfə dinləmək olar" label / remaining plays after `used`. */
export function playsLeft(maxPlays: number | null, used: number): number | null {
  return maxPlays === null ? null : Math.max(0, maxPlays - used);
}

/**
 * The audio url comes back from the browser (hidden field), so it is only accepted when it points at the folder our
 * own upload route writes to: the local `/uploads/passage-audio/…` or `<STORAGE_PUBLIC_BASE_URL>/passage-audio/…`.
 */
export function isOwnAudioUrl(url: string, publicBase?: string): boolean {
  const file = /^[0-9]+-[0-9a-f]{16}\.(mp3|ogg|wav|m4a)$/;
  const local = "/uploads/passage-audio/";
  if (url.startsWith(local)) return file.test(url.slice(local.length));
  if (publicBase) {
    const prefix = `${publicBase.replace(/\/$/, "")}/passage-audio/`;
    if (url.startsWith(prefix)) return file.test(url.slice(prefix.length));
  }
  return false;
}
