"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { notifications, questionBookmarks, lessonBookmarks, studentProfiles, studentSubjects, subjects, users } from "@/db/schema";
import type { ActionState } from "@/components/ui/action-form";
import { assertRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { createSession, destroySession, revokeAllSessions } from "@/lib/session";
import { saveUpload, UploadError } from "@/lib/upload";
import { fieldErrors, formValues, profileSchema } from "@/lib/validation";

const TOO_MANY = "Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin.";
const idSchema = z.uuid();

/** Name, grade, goals, leaderboard preferences and chosen subjects. */
export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole(["student"]);
  const values = formValues(fd);
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { name, grade, goals, displayAlias } = parsed.data;
  const optIn = fd.get("leaderboardOptIn") === "on";

  // Only subjects that really exist are accepted, whatever the client sent.
  const chosen = z.array(z.uuid()).max(30).safeParse(fd.getAll("subjects").map(String));
  if (!chosen.success) return { error: "Fənn seçimi yanlışdır.", values };
  const valid = chosen.data.length ? await db.select({ id: subjects.id }).from(subjects).where(inArray(subjects.id, chosen.data)) : [];

  await db.transaction(async (tx) => {
    await tx.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx
      .insert(studentProfiles)
      .values({ userId: user.id, grade, goals: goals || null, displayAlias: displayAlias || null, leaderboardOptIn: optIn })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { grade, goals: goals || null, displayAlias: displayAlias || null, leaderboardOptIn: optIn, updatedAt: new Date() },
      });
    await tx.delete(studentSubjects).where(eq(studentSubjects.studentId, user.id));
    if (valid.length) await tx.insert(studentSubjects).values(valid.map((s) => ({ studentId: user.id, subjectId: s.id })));
  });
  revalidatePath("/panel", "layout");
  return { ok: true, message: "Profil yeniləndi." };
}

export async function updateAvatarAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole(["student"]);
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Şəkil seçin." };
  if (!(await rateLimit(`avatar:${user.id}`, 10, 3600)).ok) return { error: TOO_MANY };
  try {
    const stored = await saveUpload(file, "image", "avatars");
    await db.update(users).set({ avatarUrl: stored.url, updatedAt: new Date() }).where(eq(users.id, user.id));
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath("/panel", "layout");
  return { ok: true, message: "Profil şəkli yeniləndi." };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await assertRole(["student"]);
  await db.update(users).set({ avatarUrl: null, updatedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath("/panel", "layout");
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, "Cari şifrəni daxil edin.").max(200), password: z.string(), passwordConfirm: z.string() })
  .superRefine((d, ctx) => {
    const problem = passwordProblems(d.password);
    if (problem) ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    if (d.password !== d.passwordConfirm) ctx.addIssue({ code: "custom", path: ["passwordConfirm"], message: "Şifrələr uyğun gəlmir." });
    if (d.password === d.current) ctx.addIssue({ code: "custom", path: ["password"], message: "Yeni şifrə cari şifrədən fərqli olmalıdır." });
  });

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole(["student"]);
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit(`pwchange:${user.id}`, 6, 900)).ok) return { error: TOO_MANY };

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(row.hash, parsed.data.current))) {
    await audit(user.id, "auth.password_change_failed", "user", user.id);
    return { fieldErrors: { current: "Cari şifrə yanlışdır." } };
  }
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() }).where(eq(users.id, user.id));
  // Sign out every other device, then keep this one signed in with a fresh session.
  await revokeAllSessions(user.id);
  await createSession(user.id);
  await audit(user.id, "auth.password_changed", "user", user.id);
  return { ok: true, message: "Şifrə dəyişdirildi. Digər cihazlardakı sessiyalar bağlandı." };
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole(["student"]);
  const password = String(fd.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "Təsdiq üçün şifrənizi daxil edin." } };
  if (!(await rateLimit(`acctdel:${user.id}`, 5, 900)).ok) return { error: TOO_MANY };
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(row.hash, password))) return { fieldErrors: { password: "Şifrə yanlışdır." } };
  await audit(user.id, "account.delete_self", "user", user.id);
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id)); // cascades to profile, attempts, bookmarks, notifications
  redirect("/?hesab=silindi");
}

/* ----------------------------- Notifications ----------------------------- */

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await assertRole(["student"]);
  if (!idSchema.safeParse(id).success) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/panel", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await assertRole(["student"]);
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/panel", "layout");
}

/* ------------------------------- Bookmarks ------------------------------- */

export async function removeLessonBookmarkAction(lessonId: string): Promise<void> {
  const user = await assertRole(["student"]);
  if (!idSchema.safeParse(lessonId).success) return;
  await db.delete(lessonBookmarks).where(and(eq(lessonBookmarks.userId, user.id), eq(lessonBookmarks.lessonId, lessonId)));
  revalidatePath("/panel/yadda-saxlananlar");
}

export async function removeQuestionBookmarkAction(questionId: string): Promise<void> {
  const user = await assertRole(["student"]);
  if (!idSchema.safeParse(questionId).success) return;
  await db.delete(questionBookmarks).where(and(eq(questionBookmarks.userId, user.id), eq(questionBookmarks.questionId, questionId)));
  revalidatePath("/panel/yadda-saxlananlar");
}
