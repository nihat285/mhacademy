import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Fixed-window limiter backed by PostgreSQL, so limits hold across server instances.
 * One atomic UPSERT per call.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  const retryAfterSec = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - nowMs) / 1000));
  // Opportunistic cleanup of old windows.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < now() - interval '1 day'`);
  }
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count), retryAfterSec };
}
