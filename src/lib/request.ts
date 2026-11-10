import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Each trusted proxy APPENDS the address it saw to
 * x-forwarded-for, so the first entries can be forged by the client. We therefore count from the right:
 * TRUSTED_PROXY_HOPS (default 1) is how many proxies sit in front of the app (Vercel/nginx/Cloudflare = 1).
 * Set it to 0 only when the app is exposed directly (then the header is ignored entirely).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10);
  const fwd = h.get("x-forwarded-for");
  if (hops > 0 && fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    const ip = parts[Math.max(0, parts.length - hops)];
    if (ip) return ip.slice(0, 64);
  }
  return (hops > 0 ? h.get("x-real-ip") : null)?.trim().slice(0, 64) || "unknown";
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}

/** Origin check for state-changing Route Handlers (Server Actions already get this from Next.js). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
