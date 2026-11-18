export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(v: unknown): string | null {
  return typeof v === "string" && UUID_RE.test(v.trim()) ? v.trim() : null;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Plain-object view of a FormData (string values only; files are skipped). */
export function formStrings(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export const checked = (fd: FormData, name: string) => fd.get(name) === "on";

/** PostgreSQL foreign-key violation (works through Drizzle's wrapped errors). */
export function isFkViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23503";
}
export function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
}
export const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
