import "server-only";
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { plans, subscriptionSubjects, subscriptions } from "@/db/schema";
import type { CurrentUser } from "./session";

export interface Entitlement {
  /** Any currently active subscription. */
  active: boolean;
  /** Active plan without subject limit: every subject is open. */
  allSubjects: boolean;
  subjectIds: Set<string>;
  endsAt: Date | null;
}

const NONE: Entitlement = { active: false, allSubjects: false, subjectIds: new Set(), endsAt: null };

/** Subscriptions that are active right now (status active, started, not expired). */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const now = new Date();
  const subs = await db
    .select({ id: subscriptions.id, endsAt: subscriptions.endsAt, limit: plans.subjectLimit })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), or(isNull(subscriptions.startsAt), lte(subscriptions.startsAt, now)), gt(subscriptions.endsAt, now)));
  if (subs.length === 0) return NONE;
  const rows = await db.select({ s: subscriptionSubjects.subjectId }).from(subscriptionSubjects).where(inArray(subscriptionSubjects.subscriptionId, subs.map((s) => s.id)));
  return {
    active: true,
    allSubjects: subs.some((s) => s.limit === null),
    subjectIds: new Set(rows.map((r) => r.s)),
    endsAt: subs.reduce<Date | null>((m, s) => (s.endsAt && (!m || s.endsAt > m) ? s.endsAt : m), null),
  };
}

export type VipAccess = "open" | "anonymous" | "no-plan" | "other-subject";

/**
 * Whether the viewer may open a VIP item of the given subject.
 * Staff (admin/teacher) always can; students need an active package that covers the subject.
 */
export async function vipAccess(user: CurrentUser | null, subjectId: string): Promise<VipAccess> {
  if (!user) return "anonymous";
  if (user.role !== "student") return "open";
  const e = await getEntitlement(user.id);
  if (!e.active) return "no-plan";
  return e.allSubjects || e.subjectIds.has(subjectId) ? "open" : "other-subject";
}
