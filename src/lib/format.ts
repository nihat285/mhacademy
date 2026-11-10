const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const TZ = "Asia/Baku";

function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { day: Number(o.day), month: Number(o.month), year: Number(o.year), hour: o.hour === "24" ? "00" : o.hour, minute: o.minute };
}

/** "14 noyabr 2026" */
export function formatDate(d: Date | string): string {
  const p = parts(new Date(d));
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}
/** "14 noyabr, 10:00" */
export function formatDateTime(d: Date | string): string {
  const p = parts(new Date(d));
  return `${p.day} ${MONTHS[p.month - 1]}, ${p.hour}:${p.minute}`;
}
export function formatTime(d: Date | string): string {
  const p = parts(new Date(d));
  return `${p.hour}:${p.minute}`;
}
/** "1 saat 5 dəq" / "25 dəq" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} dəq`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} saat ${m} dəq` : `${h} saat`;
}
/** Seconds -> "12:34" or "1:02:03" */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const rr = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${rr}` : `${m}:${rr}`;
}
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} san`;
  return formatMinutes(Math.round(sec / 60));
}
export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n * 10) / 10}%`.replace(".", ",");
}
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("az-AZ").format(n);
}
export function formatScore(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
export const DIFFICULTY_LABEL = { easy: "Asan", medium: "Orta", hard: "Çətin" } as const;
export const VISIBILITY_LABEL = { public: "Açıq", private: "Qapalı", assigned: "Təyin olunmuş" } as const;
export const ROLE_LABEL = { student: "Şagird", teacher: "Müəllim", admin: "Administrator" } as const;
