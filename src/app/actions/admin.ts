"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/ui/action-form";
import { db } from "@/db";
import {
  announcements,
  contactMessages,
  courses,
  examAttempts,
  exams,
  faqs,
  lessons,
  siteSettings,
  subjects,
  teacherSubjects,
  testimonials,
  topics,
  userPermissions,
  users,
} from "@/db/schema";
import { LAST_ADMIN_MESSAGE, removesAdminPrivileges, wouldRemoveLastAdmin } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";
import { AuthError, assertRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { isSafeHttpsUrl } from "@/lib/safe-url";
import { revokeAllSessions, type CurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { generateTempPassword } from "@/lib/temp-password";
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
const optUuid = z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional());
const optInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).optional());
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

/* ------------------------------------------------------------------ İstifadəçilər */

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(160),
  email: z.string().trim().toLowerCase().max(255).pipe(z.email("E-poçt ünvanını düzgün daxil edin.")),
  role: z.enum(["student", "teacher", "admin"]),
});

export async function createUser(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const parsed = createUserSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  const [dup] = await db.select({ x: sql`1` }).from(users).where(sql`lower(${users.email}) = ${d.email}`).limit(1);
  if (dup) return { fieldErrors: { email: "Bu e-poçt artıq qeydiyyatdadır." }, values: formValues(fd) };
  const temp = generateTempPassword();
  const [u] = await db
    .insert(users)
    .values({ name: d.name, email: d.email, role: d.role, passwordHash: await hashPassword(temp), emailVerifiedAt: new Date() })
    .returning({ id: users.id });
  await audit(a.id, "user.create", "user", u.id, { role: d.role });
  revalidatePath("/idare/sagirdler");
  revalidatePath("/idare/muellimler");
  return { ok: true, message: `Hesab yaradıldı. Müvəqqəti şifrə (yalnız indi görünür, istifadəçiyə ötürün): ${temp}` };
}

export async function resetUserPassword(id: string): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  const [t] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!t) return { error: "İstifadəçi tapılmadı." };
  const temp = generateTempPassword();
  await db.update(users).set({ passwordHash: await hashPassword(temp), updatedAt: new Date() }).where(eq(users.id, id));
  await revokeAllSessions(id);
  await audit(a.id, "user.password_reset", "user", id);
  return { ok: true, message: `Yeni müvəqqəti şifrə: ${temp}` };
}

/** Role / status change, refusing to remove the last active administrator (checked under row locks). */
async function changeUser(a: CurrentUser, id: string, change: { role?: "student" | "teacher" | "admin"; status?: "active" | "suspended" }): Promise<Simple> {
  if (id === a.id) return { error: "Öz hesabınızın rolunu və ya statusunu dəyişə bilməzsiniz." };
  const res = await db.transaction(async (tx) => {
    const admins = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active"))).for("update");
    const [cur] = await tx.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, id)).limit(1);
    if (!cur) return { error: "İstifadəçi tapılmadı." };
    if (removesAdminPrivileges(cur, change) && wouldRemoveLastAdmin(admins.map((x) => x.id), id)) return { error: LAST_ADMIN_MESSAGE };
    await tx.update(users).set({ ...change, updatedAt: new Date() }).where(eq(users.id, id));
    return { ok: true };
  });
  if (res.ok) {
    if (change.status === "suspended" || change.role) await revokeAllSessions(id);
    await audit(a.id, change.role ? "user.role_change" : "user.status_change", "user", id, change);
    revalidatePath("/idare/sagirdler");
    revalidatePath("/idare/muellimler");
    revalidatePath(`/idare/istifadeciler/${id}`);
  }
  return res;
}

export async function setUserRole(id: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const role = z.enum(["student", "teacher", "admin"]).safeParse(fd.get("role"));
  if (!role.success) return { error: "Rol etibarsızdır." };
  const r = await changeUser(a, id, { role: role.data });
  return r.error ? { error: r.error } : { ok: true, message: "Rol dəyişdirildi (istifadəçi yenidən daxil olmalı olacaq)." };
}

export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  return changeUser(a, id, { status });
}

export async function setUserPermissions(id: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const [t] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!t) return { error: "İstifadəçi tapılmadı." };
  if (t.role !== "teacher") return { error: "İcazələr yalnız müəllimlər üçündür." };
  const picked = fd.getAll("perm").filter((p): p is string => typeof p === "string" && (ALL_PERMISSIONS as string[]).includes(p));
  const subs = fd.getAll("subject").filter((s): s is string => typeof s === "string" && z.uuid().safeParse(s).success);
  await db.transaction(async (tx) => {
    await tx.delete(userPermissions).where(eq(userPermissions.userId, id));
    if (picked.length) await tx.insert(userPermissions).values(picked.map((permission) => ({ userId: id, permission, grantedBy: a.id })));
    await tx.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, id));
    if (subs.length) {
      const valid = await tx.select({ id: subjects.id }).from(subjects).where(inArray(subjects.id, subs));
      if (valid.length) await tx.insert(teacherSubjects).values(valid.map((s) => ({ teacherId: id, subjectId: s.id })));
    }
  });
  await audit(a.id, "user.permissions", "user", id, { permissions: picked });
  revalidatePath(`/idare/istifadeciler/${id}`);
  return { ok: true, message: "İcazələr və fənlər yadda saxlanıldı." };
}

/* ------------------------------------------------------------------ Fənlər, mövzular */

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(120),
  description: z.string().trim().max(1000),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Rəng #RRGGBB formatında olmalıdır.").or(z.literal("")),
  sortOrder: optInt(0, 9999, "Sıra 0–9999 arası olmalıdır."),
});

async function freeSlug(table: typeof subjects | typeof courses, col: typeof subjects.slug | typeof courses.slug, name: string, ownId?: string) {
  const base = slugify(name, 100);
  for (let i = 0; i < 50; i++) {
    const cand = i === 0 ? base : `${base}-${i + 1}`;
    const [hit] = await db.select({ id: table.id }).from(table).where(eq(col, cand)).limit(1);
    if (!hit || hit.id === ownId) return cand;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveSubject(subjectId: string | null, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const parsed = subjectSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  const v = { name: d.name, description: d.description || null, accent: d.accent || "#C9A24B", sortOrder: d.sortOrder ?? 0, featured: bool(fd, "featured") };
  if (subjectId) {
    await db.update(subjects).set(v).where(eq(subjects.id, subjectId));
    await audit(a.id, "subject.update", "subject", subjectId);
    revalidatePath("/idare/fenler");
    return { ok: true, message: "Fənn yadda saxlanıldı." };
  }
  const [s] = await db.insert(subjects).values({ ...v, slug: await freeSlug(subjects, subjects.slug, d.name) }).returning({ id: subjects.id });
  await audit(a.id, "subject.create", "subject", s.id);
  revalidatePath("/idare/fenler");
  redirect(`/idare/fenler/${s.id}`);
}

export async function deleteSubject(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  const [[c], [l]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.subjectId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(lessons).where(eq(lessons.subjectId, id)),
  ]);
  if (c.n + l.n > 0) return { error: `Bu fənnə ${c.n} kurs və ${l.n} dərs bağlıdır. Əvvəl onları başqa fənnə keçirin və ya silin.` };
  try {
    await db.delete(subjects).where(eq(subjects.id, id));
  } catch {
    return { error: "Fənn silinə bilmədi (sual və ya sınaqlara bağlıdır)." };
  }
  await audit(a.id, "subject.delete", "subject", id);
  revalidatePath("/idare/fenler");
  return { ok: true };
}

export async function addTopic(subjectId: string, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const name = z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(160).safeParse(fd.get("name"));
  if (!name.success) return { fieldErrors: { name: name.error.issues[0].message }, values: formValues(fd) };
  let slug = slugify(name.data, 110);
  const [clash] = await db.select({ x: sql`1` }).from(topics).where(and(eq(topics.subjectId, subjectId), eq(topics.slug, slug))).limit(1);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(topics).where(eq(topics.subjectId, subjectId));
  await db.insert(topics).values({ subjectId, name: name.data, slug, sortOrder: n });
  await audit(a.id, "topic.create", "subject", subjectId);
  revalidatePath(`/idare/fenler/${subjectId}`);
  return { ok: true, message: "Mövzu əlavə olundu." };
}

export async function deleteTopic(subjectId: string, id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(topics).where(and(eq(topics.id, id), eq(topics.subjectId, subjectId)));
  await audit(a.id, "topic.delete", "topic", id);
  revalidatePath(`/idare/fenler/${subjectId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ Kurslar */

const courseSchema = z.object({
  title: z.string().trim().min(3, "Başlıq ən azı 3 simvol olmalıdır.").max(200),
  subjectId: z.uuid("Fənn seçin."),
  teacherId: optUuid,
  grade: optInt(1, 11, "Sinif 1–11 arasında olmalıdır."),
  description: z.string().trim().max(3000),
});

export async function saveCourse(courseId: string | null, _p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const parsed = courseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  if (d.teacherId) {
    const [t] = await db.select({ role: users.role }).from(users).where(eq(users.id, d.teacherId)).limit(1);
    if (!t || t.role === "student") return { fieldErrors: { teacherId: "Müəllim tapılmadı." }, values: formValues(fd) };
  }
  const v = {
    title: d.title,
    subjectId: d.subjectId,
    teacherId: d.teacherId ?? null,
    grade: d.grade ?? null,
    description: d.description || null,
    featured: bool(fd, "featured"),
    published: bool(fd, "published"),
    updatedAt: new Date(),
  };
  if (courseId) {
    await db.update(courses).set(v).where(eq(courses.id, courseId));
    await audit(a.id, "course.update", "course", courseId);
    revalidatePath("/idare/kurslar");
    revalidatePath("/kurslar");
    return { ok: true, message: "Kurs yadda saxlanıldı." };
  }
  const [c] = await db.insert(courses).values({ ...v, slug: await freeSlug(courses, courses.slug, d.title) }).returning({ id: courses.id });
  await audit(a.id, "course.create", "course", c.id);
  revalidatePath("/idare/kurslar");
  redirect("/idare/kurslar");
}

export async function deleteCourse(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(courses).where(eq(courses.id, id));
  await audit(a.id, "course.delete", "course", id);
  revalidatePath("/idare/kurslar");
  revalidatePath("/kurslar");
  return { ok: true };
}

/* ------------------------------------------------------------------ Nəticələr */

export async function releaseResults(examId: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  const [e] = await db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).limit(1);
  if (!e) return { error: "Sınaq tapılmadı." };
  await db.update(exams).set({ resultsReleasedAt: new Date() }).where(eq(exams.id, examId));
  await audit(a.id, "exam.release_results", "exam", examId);
  revalidatePath("/idare/neticeler");
  return { ok: true };
}

export async function deleteAttempt(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(examAttempts).where(eq(examAttempts.id, id));
  await audit(a.id, "attempt.delete", "attempt", id);
  revalidatePath("/idare/neticeler");
  return { ok: true };
}

/* ------------------------------------------------------------------ Elanlar, mesajlar */

const announceSchema = z.object({
  title: z.string().trim().min(3, "Başlıq ən azı 3 simvol olmalıdır.").max(200),
  body: z.string().trim().min(5, "Mətn ən azı 5 simvol olmalıdır.").max(5000),
  audience: z.enum(["all", "students", "teachers"]),
});

export async function createAdminAnnouncement(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const parsed = announceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const [r] = await db.insert(announcements).values({ authorId: a.id, ...parsed.data }).returning({ id: announcements.id });
  await audit(a.id, "announcement.create", "announcement", r.id);
  revalidatePath("/idare/elanlar");
  return { ok: true, message: "Elan dərc olundu." };
}

export async function deleteAnyAnnouncement(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(announcements).where(eq(announcements.id, id));
  await audit(a.id, "announcement.delete", "announcement", id);
  revalidatePath("/idare/elanlar");
  return { ok: true };
}

export async function setMessageHandled(id: string, handled: boolean): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(contactMessages).set({ handledAt: handled ? new Date() : null }).where(eq(contactMessages.id, id));
  revalidatePath("/idare/mesajlar");
  revalidatePath("/idare");
  return { ok: true };
}

export async function deleteMessage(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  await audit(a.id, "message.delete", "message", id);
  revalidatePath("/idare/mesajlar");
  return { ok: true };
}

/* ------------------------------------------------------------------ Sayt məzmunu */

async function putSetting(key: string, value: unknown) {
  await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export async function saveSiteContact(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const s = z.object({
    email: z.union([z.literal(""), z.email("E-poçt düzgün deyil.")]),
    phone: z.string().trim().max(60),
    address: z.string().trim().max(300),
  }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { fieldErrors: fieldErrors(s.error), values: formValues(fd) };
  const socials: Record<string, string> = {};
  for (const k of ["instagram", "facebook", "youtube", "telegram"]) {
    const v = String(fd.get(k) ?? "").trim();
    if (v && !isSafeHttpsUrl(v)) return { fieldErrors: { [k]: "Yalnız https:// ilə başlayan ünvan." }, values: formValues(fd) };
    if (v) socials[k] = v;
  }
  // `demo: false` removes the "demo data" label once real contact details are entered.
  await putSetting("contact", { email: s.data.email, phone: s.data.phone, address: s.data.address, demo: false });
  await putSetting("socials", socials);
  await audit(a.id, "site.contact", "settings", "contact");
  revalidatePath("/", "layout");
  return { ok: true, message: "Əlaqə məlumatları yadda saxlanıldı." };
}

export async function addFaq(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const s = z.object({ question: z.string().trim().min(5, "Sual ən azı 5 simvol.").max(500), answer: z.string().trim().min(5, "Cavab ən azı 5 simvol.").max(3000) }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { fieldErrors: fieldErrors(s.error), values: formValues(fd) };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(faqs);
  await db.insert(faqs).values({ ...s.data, sortOrder: n });
  await audit(a.id, "faq.create", "faq");
  revalidatePath("/idare/sayt");
  revalidatePath("/", "layout");
  return { ok: true, message: "Sual əlavə olundu." };
}

export async function toggleFaq(id: string, published: boolean): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(faqs).set({ published }).where(eq(faqs.id, id));
  revalidatePath("/idare/sayt");
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(faqs).where(eq(faqs.id, id));
  await audit(a.id, "faq.delete", "faq", id);
  revalidatePath("/idare/sayt");
  return { ok: true };
}

export async function addTestimonial(_p: Res, fd: FormData): Promise<Res> {
  const a = await admin();
  if (isRes(a)) return a;
  const s = z.object({ authorName: z.string().trim().min(2, "Ad tələb olunur.").max(160), authorRole: z.string().trim().max(160), quote: z.string().trim().min(10, "Rəy ən azı 10 simvol.").max(1000) }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { fieldErrors: fieldErrors(s.error), values: formValues(fd) };
  if (!bool(fd, "consent")) return { fieldErrors: { consent: "Real rəy üçün müəllifin razılığını təsdiqləyin." }, values: formValues(fd) };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(testimonials);
  await db.insert(testimonials).values({ authorName: s.data.authorName, authorRole: s.data.authorRole || null, quote: s.data.quote, isPlaceholder: false, sortOrder: n });
  await audit(a.id, "testimonial.create", "testimonial");
  revalidatePath("/idare/sayt");
  revalidatePath("/");
  return { ok: true, message: "Rəy əlavə olundu." };
}

export async function toggleTestimonial(id: string, published: boolean): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.update(testimonials).set({ published }).where(eq(testimonials.id, id));
  revalidatePath("/idare/sayt");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<Simple> {
  const a = await admin();
  if (isRes(a)) return { error: a.error };
  await db.delete(testimonials).where(eq(testimonials.id, id));
  await audit(a.id, "testimonial.delete", "testimonial", id);
  revalidatePath("/idare/sayt");
  revalidatePath("/");
  return { ok: true };
}
