/** Pure rules for live lessons: link validation, join window, Baku-time conversion. No DB, no framework. */

export type LiveProvider = "zoom" | "meet" | "teams" | "other";

/** Students may open the link from 10 minutes before the start until 15 minutes after the planned end. */
export const JOIN_EARLY_MIN = 10;
export const JOIN_LATE_MIN = 15;
export const MIN_DURATION = 15;
export const MAX_DURATION = 240;

export const PROVIDER_LABEL: Record<LiveProvider, string> = { zoom: "Zoom", meet: "Google Meet", teams: "Microsoft Teams", other: "Xarici link" };

const host = (h: string, ...roots: string[]) => roots.some((r) => h === r || h.endsWith("." + r));

export type UrlCheck = { ok: true; url: string; provider: LiveProvider } | { ok: false; error: string };

/** Only https links to a real host; the provider is derived from the host, never taken from the form. */
export function validateJoinUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Görüş linkini daxil edin." };
  if (value.length > 500) return { ok: false, error: "Link çox uzundur." };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, error: "Link düzgün deyil. Tam ünvanı (https://…) yazın." };
  }
  if (u.protocol !== "https:") return { ok: false, error: "Yalnız https:// ilə başlayan link qəbul olunur." };
  if (u.username || u.password) return { ok: false, error: "Linkdə istifadəçi adı və ya parol ola bilməz." };
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith("[") || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return { ok: false, error: "Link ictimai internet ünvanı olmalıdır." };
  }
  const provider: LiveProvider = host(h, "zoom.us", "zoom.com") ? "zoom" : h === "meet.google.com" ? "meet" : host(h, "teams.microsoft.com", "teams.live.com") ? "teams" : "other";
  return { ok: true, url: u.toString(), provider };
}

export type Phase = "cancelled" | "upcoming" | "joinable" | "ended";

export function sessionPhase(now: Date, s: { startsAt: Date; durationMin: number; cancelled?: boolean }): Phase {
  if (s.cancelled) return "cancelled";
  const start = s.startsAt.getTime();
  const t = now.getTime();
  if (t < start - JOIN_EARLY_MIN * 60_000) return "upcoming";
  if (t <= start + (s.durationMin + JOIN_LATE_MIN) * 60_000) return "joinable";
  return "ended";
}

/** True once the planned start has passed (used for the "Davam edir" label inside the join window). */
export const hasStarted = (now: Date, startsAt: Date) => now.getTime() >= startsAt.getTime();

/** Baku is UTC+4 all year (no daylight saving since 2016). */
const BAKU_OFFSET = "+04:00";

/** "2026-11-20T18:30" (datetime-local, Baku clock) -> Date, or null if malformed. */
export function parseBakuLocal(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00${BAKU_OFFSET}`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject rollovers such as 2026-02-31.
  return toBakuInput(d) === v.trim() ? d : null;
}

/** Date -> value for <input type="datetime-local"> on the Baku clock. */
export function toBakuInput(d: Date): string {
  const b = new Date(d.getTime() + 4 * 3_600_000);
  return b.toISOString().slice(0, 16);
}

export interface ScheduleInput { title: string; startsAt: Date | null; durationMin: number }

/** Field-level errors for the create/edit form. `allowPast` is true when editing a session that already started. */
export function validateSchedule(i: ScheduleInput, now = new Date(), allowPast = false): Record<string, string> {
  const e: Record<string, string> = {};
  const title = i.title.trim();
  if (title.length < 3) e.title = "Başlıq ən azı 3 simvol olmalıdır.";
  else if (title.length > 160) e.title = "Başlıq 160 simvoldan uzun ola bilməz.";
  if (!i.startsAt) e.startsAt = "Tarix və saatı düzgün seçin.";
  else if (!allowPast && i.startsAt.getTime() < now.getTime() - 5 * 60_000) e.startsAt = "Keçmiş vaxt seçmək olmaz.";
  else if (i.startsAt.getTime() > now.getTime() + 366 * 86_400_000) e.startsAt = "Tarix bir ildən uzaq ola bilməz.";
  if (!Number.isInteger(i.durationMin) || i.durationMin < MIN_DURATION || i.durationMin > MAX_DURATION) e.durationMin = `Müddət ${MIN_DURATION}–${MAX_DURATION} dəqiqə arasında olmalıdır.`;
  return e;
}
