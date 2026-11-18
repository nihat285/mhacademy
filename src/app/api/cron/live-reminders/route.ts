import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/live/service";

/**
 * "Starts in 30 minutes" reminders for live lessons. Call every 5 minutes from a scheduler with
 *   Authorization: Bearer $CRON_SECRET
 * Each lesson is reminded once. Without CRON_SECRET the endpoint is disabled.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ reminded: await sendDueReminders() });
}
