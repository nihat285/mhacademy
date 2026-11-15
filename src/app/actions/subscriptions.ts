"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/ui/action-form";
import { db } from "@/db";
import { exams, lessons, plans, siteSettings, subjects, subscriptionSubjects, subscriptions, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { AuthError, assertRole, assertUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { CurrentUser } from "@/lib/session";
import { fieldErrors, formValues } from "@/lib/validation";

type Res = ActionState;
type Simple = { ok?: boolean; error?: string };

async function admin(): Promise<CurrentUser | Res> {
  try {
    const u = await assertRole(["admin"]);
    if (!(await rateLimit(`admin-write:${u.id}`, 200, 600)).ok) return { error: "Çox sayda əməliyyat. Bir az sonra yenidən cəhd edin." };
    return u;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat yalnız administratorlar üçündür." };
    throw e;
  }
}
const isRes = (x: CurrentUser | Res): x is Res => !("id" in x);
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const uuids = (fd: FormData, k: string) => [...new Set(fd.getAll(k).filter((x): x is string => typeof x === "string" && z.uuid().safeParse(x).success))];

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/* -------------------------------------------------------------------------- */
/*  VIP flags                                                                 */
/* -------------------------------------------------------------------------- */

export async function setLessonVip(id: string, vip: boolean): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(lessons).set({ isVip: vip, updatedAt: new Date() }).where(eq(lessons.id, id));
  await audit(a.id, vip ? "lesson.vip_on" : "lesson.vip_off", "lesson", id);
  revalidatePath("/idare/dersler");
  revalidatePath("/dersler");
  return { ok: true };
}

export async function setExamVip(id: string, vip: boolean): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(exams).set({ isVip: vip, updatedAt: new Date() }).where(eq(exams.id, id));
  await audit(a.id, vip ? "exam.vip_on" : "exam.vip_off", "exam", id);
  revalidatePath("/idare/sinaqlar");
  revalidatePath("/sinaqlar");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Plans (admin)                                                             */
/* -------------------------------------------------------------------------- */

const planSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(80),
  description: z.string().trim().max(400),
  priceAzn: z.preprocess((v) => Number(v), z.number({ error: "Qiymət rəqəm olmalıdır." }).int("Qiymət tam ədəd olmalıdır.").min(0, "Qiymət mənfi ola bilməz.").max(100000, "Qiymət çox böyükdür.")),
  subjectLimit: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number({ error: "Fənn sayı rəqəm olmalıdır." }).int("Fənn sayı tam ədəd olmalıdır.").min(1, "Ən azı 1 fənn.").max(50).nullable()),
});

export async function savePlan(planId: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const parsed = planSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  await db.update(plans).set({ name: d.name, description: d.description || null, priceAzn: d.priceAzn, subjectLimit: d.subjectLimit, active: bool(fd, "active") }).where(eq(plans.id, planId));
  await audit(a.id, "plan.update", "plan", planId, { price: d.priceAzn, limit: d.subjectLimit });
  revalidatePath("/idare/paketler");
  revalidatePath("/paketler");
  return { ok: true, message: "Paket yadda saxlanıldı." };
}

export async function savePaymentInfo(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const text = z.string().trim().max(2000, "Mətn çox uzundur.").safeParse(fd.get("text") ?? "");
  if (!text.success) return { fieldErrors: { text: text.error.issues[0].message }, values: formValues(fd) };
  await db
    .insert(siteSettings)
    .values({ key: "payment_info", value: text.data })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: text.data, updatedAt: new Date() } });
  await audit(a.id, "plan.payment_info");
  revalidatePath("/idare/paketler");
  revalidatePath("/paketler");
  revalidatePath("/panel/paket");
  return { ok: true, message: "Ödəniş məlumatı yadda saxlanıldı." };
}

/* -------------------------------------------------------------------------- */
/*  Subscriptions                                                             */
/* -------------------------------------------------------------------------- */

/** Validates the chosen subjects against the plan's limit. Returns the ids to store (empty for all-subject plans). */
async function checkSubjects(plan: { subjectLimit: number | null }, ids: string[]): Promise<{ ids: string[] } | { error: string }> {
  if (plan.subjectLimit === null) return { ids: [] };
  if (ids.length < 1) return { error: "Ən azı bir fənn seçin." };
  if (ids.length > plan.subjectLimit) return { error: `Bu paketdə ən çox ${plan.subjectLimit} fənn seçmək olar.` };
  const found = await db.select({ id: subjects.id }).from(subjects).where(inArray(subjects.id, ids));
  if (found.length !== ids.length) return { error: "Seçilmiş fənlərdən bəziləri tapılmadı." };
  return { ids };
}

/** Student asks for a package; admin activates it after the payment is received. */
export async function requestSubscription(_p: Res, fd: FormData): Promise<Res> {
  let u: CurrentUser;
  try {
    u = await assertUser();
  } catch {
    return { error: "Daxil olmaq tələb olunur." };
  }
  if (u.role !== "student") return { error: "Paketlər yalnız şagirdlər üçündür." };
  if (!(await rateLimit(`sub-request:${u.id}`, 10, 3600)).ok) return { error: "Çox sayda sorğu. Bir az sonra yenidən cəhd edin." };
  const planId = z.uuid().safeParse(fd.get("planId"));
  if (!planId.success) return { error: "Paketi seçin." };
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, planId.data), eq(plans.active, true))).limit(1);
  if (!plan) return { error: "Paket tapılmadı." };
  const chosen = await checkSubjects(plan, uuids(fd, "subjectIds"));
  if ("error" in chosen) return { error: chosen.error };
  const [pending] = await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.userId, u.id), eq(subscriptions.status, "pending"))).limit(1);
  if (pending) return { error: "Gözləyən sorğunuz artıq var. Administrator ödənişi təsdiqləyənədək gözləyin." };
  await db.transaction(async (tx) => {
    const [s] = await tx.insert(subscriptions).values({ userId: u.id, planId: plan.id }).returning({ id: subscriptions.id });
    if (chosen.ids.length) await tx.insert(subscriptionSubjects).values(chosen.ids.map((subjectId) => ({ subscriptionId: s.id, subjectId })));
  });
  await audit(u.id, "subscription.request", "plan", plan.id);
  revalidatePath("/panel/paket");
  revalidatePath("/idare/abuneler");
  return { ok: true, message: "Sorğunuz göndərildi. Ödənişi etdikdən sonra administrator paketi aktivləşdirəcək." };
}

export async function cancelMyRequest(id: string): Promise<Simple> {
  let u: CurrentUser;
  try {
    u = await assertUser();
  } catch {
    return { error: "Daxil olmaq tələb olunur." };
  }
  await db.delete(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, u.id), eq(subscriptions.status, "pending")));
  revalidatePath("/panel/paket");
  revalidatePath("/idare/abuneler");
  return { ok: true };
}

const monthsSchema = z.preprocess((v) => Number(v || 1), z.number({ error: "Müddət rəqəm olmalıdır." }).int("Müddət tam ədəd olmalıdır.").min(1, "Ən azı 1 ay.").max(36, "Ən çox 36 ay."));

/** Approves a pending request: starts now, runs for N months. */
export async function activateSubscription(id: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const months = monthsSchema.safeParse(fd.get("months"));
  if (!months.success) return { fieldErrors: { months: months.error.issues[0].message }, values: formValues(fd) };
  const now = new Date();
  const res = await db.update(subscriptions).set({ status: "active", startsAt: now, endsAt: addMonths(now, months.data), updatedAt: now }).where(and(eq(subscriptions.id, id), eq(subscriptions.status, "pending"))).returning({ id: subscriptions.id });
  if (res.length === 0) return { error: "Sorğu tapılmadı və ya artıq emal olunub." };
  await audit(a.id, "subscription.activate", "subscription", id, { months: months.data });
  revalidatePath("/idare/abuneler");
  revalidatePath("/panel/paket");
  return { ok: true, message: "Aktivləşdirildi." };
}

/** Adds N months on top of the current end date (or from now if already expired). */
export async function extendSubscription(id: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const months = monthsSchema.safeParse(fd.get("months"));
  if (!months.success) return { fieldErrors: { months: months.error.issues[0].message }, values: formValues(fd) };
  const [cur] = await db.select({ endsAt: subscriptions.endsAt, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!cur || cur.status === "pending") return { error: "Abunə tapılmadı." };
  const now = new Date();
  const base = cur.endsAt && cur.endsAt > now ? cur.endsAt : now;
  await db.update(subscriptions).set({ status: "active", startsAt: cur.status === "active" ? undefined : now, endsAt: addMonths(base, months.data), updatedAt: now }).where(eq(subscriptions.id, id));
  await audit(a.id, "subscription.extend", "subscription", id, { months: months.data });
  revalidatePath("/idare/abuneler");
  return { ok: true, message: "Müddət uzadıldı." };
}

export async function cancelSubscription(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(subscriptions).set({ status: "cancelled", endsAt: new Date(), updatedAt: new Date() }).where(eq(subscriptions.id, id));
  await audit(a.id, "subscription.cancel", "subscription", id);
  revalidatePath("/idare/abuneler");
  revalidatePath("/panel/paket");
  return { ok: true };
}

export async function deleteSubscription(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  await audit(a.id, "subscription.delete", "subscription", id);
  revalidatePath("/idare/abuneler");
  revalidatePath("/panel/paket");
  return { ok: true };
}

/** Admin grants a package directly (payment received outside the site). */
export async function grantSubscription(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const email = z.string().trim().toLowerCase().pipe(z.email("E-poçt ünvanını düzgün daxil edin.")).safeParse(fd.get("email"));
  if (!email.success) return { fieldErrors: { email: email.error.issues[0].message }, values: formValues(fd) };
  const planId = z.uuid().safeParse(fd.get("planId"));
  if (!planId.success) return { fieldErrors: { planId: "Paketi seçin." }, values: formValues(fd) };
  const months = monthsSchema.safeParse(fd.get("months"));
  if (!months.success) return { fieldErrors: { months: months.error.issues[0].message }, values: formValues(fd) };
  const [student] = await db.select({ id: users.id, role: users.role }).from(users).where(sql`lower(${users.email}) = ${email.data}`).limit(1);
  if (!student || student.role !== "student") return { fieldErrors: { email: "Bu e-poçtla şagird tapılmadı." }, values: formValues(fd) };
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId.data)).limit(1);
  if (!plan) return { fieldErrors: { planId: "Paket tapılmadı." }, values: formValues(fd) };
  const chosen = await checkSubjects(plan, uuids(fd, "subjectIds"));
  if ("error" in chosen) return { error: chosen.error, values: formValues(fd) };
  const now = new Date();
  await db.transaction(async (tx) => {
    const [s] = await tx.insert(subscriptions).values({ userId: student.id, planId: plan.id, status: "active", startsAt: now, endsAt: addMonths(now, months.data) }).returning({ id: subscriptions.id });
    if (chosen.ids.length) await tx.insert(subscriptionSubjects).values(chosen.ids.map((subjectId) => ({ subscriptionId: s.id, subjectId })));
  });
  await audit(a.id, "subscription.grant", "user", student.id, { plan: plan.name, months: months.data });
  revalidatePath("/idare/abuneler");
  return { ok: true, message: "Abunə verildi." };
}
