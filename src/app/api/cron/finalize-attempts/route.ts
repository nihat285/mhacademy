import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";

/**
 * Grades every attempt whose deadline has passed even if the student closed the browser.
 * Call every minute from a scheduler (Vercel Cron, GitHub Actions, cron-job.org…) with
 *   Authorization: Bearer $CRON_SECRET
 * Without CRON_SECRET the endpoint is disabled.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const graded = await finalizeExpiredAttempts();
  return NextResponse.json({ graded });
}
