import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { plans, siteSettings, subjects, subscriptionSubjects, subscriptions, users } from "@/db/schema";

export type SubState = "pending" | "active" | "expired" | "cancelled";

export async function listPlans(onlyActive = false) {
  return db.select().from(plans).where(onlyActive ? eq(plans.active, true) : undefined).orderBy(asc(plans.sortOrder), asc(plans.priceAzn));
}

export async function getPaymentInfo(): Promise<string> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "payment_info")).limit(1);
  return typeof row?.value === "string" ? row.value : "";
}

export async function getSubjectChoices() {
  return db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder), asc(subjects.name));
}

const stateOf = (status: "pending" | "active" | "cancelled", endsAt: Date | null): SubState =>
  status === "active" ? (endsAt && endsAt > new Date() ? "active" : "expired") : status;

async function withSubjects<T extends { id: string }>(rows: T[]) {
  const links = rows.length
    ? await db
        .select({ sid: subscriptionSubjects.subscriptionId, name: subjects.name })
        .from(subscriptionSubjects)
        .innerJoin(subjects, eq(subjects.id, subscriptionSubjects.subjectId))
        .where(inArray(subscriptionSubjects.subscriptionId, rows.map((r) => r.id)))
        .orderBy(asc(subjects.sortOrder))
    : [];
  return rows.map((r) => ({ ...r, subjectNames: links.filter((l) => l.sid === r.id).map((l) => l.name) }));
}

export async function listSubscriptions() {
  const rows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      startsAt: subscriptions.startsAt,
      endsAt: subscriptions.endsAt,
      createdAt: subscriptions.createdAt,
      userName: users.name,
      userEmail: users.email,
      planName: plans.name,
      priceAzn: plans.priceAzn,
      subjectLimit: plans.subjectLimit,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(300);
  return (await withSubjects(rows)).map((r) => ({ ...r, state: stateOf(r.status, r.endsAt) }));
}

export async function getMySubscriptions(userId: string) {
  const rows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      endsAt: subscriptions.endsAt,
      createdAt: subscriptions.createdAt,
      planName: plans.name,
      priceAzn: plans.priceAzn,
      subjectLimit: plans.subjectLimit,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(20);
  return (await withSubjects(rows)).map((r) => ({ ...r, state: stateOf(r.status, r.endsAt) }));
}
