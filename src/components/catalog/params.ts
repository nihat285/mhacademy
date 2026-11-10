/** Normalises a Next.js searchParams value to a trimmed, length-limited single string. */
export function one(v: string | string[] | undefined, max = 120): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim().slice(0, max);
  return t || undefined;
}

export function slugParam(v: string | string[] | undefined): string | undefined {
  const s = one(v, 160);
  return s && /^[a-z0-9-]+$/i.test(s) ? s : undefined;
}
