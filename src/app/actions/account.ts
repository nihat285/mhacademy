"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/ui/action-form";
import { db } from "@/db";
import { users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { AuthError, assertRole, assertUser } from "@/lib/auth";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { createSession, revokeAllSessions } from "@/lib/session";
import { fieldErrors, formValues } from "@/lib/validation";

const SECRETS = ["currentPassword", "password", "passwordConfirm"];

/** Admin's own display name (teachers edit theirs on their public profile page). */
export async function saveAdminProfile(_p: ActionState, fd: FormData): Promise<ActionState> {
  let u;
  try {
    u = await assertRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const parsed = z.object({ name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(120, "Ad çox uzundur.") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, u.id));
  await audit(u.id, "profile.update", "user", u.id);
  revalidatePath("/idare", "layout");
  return { ok: true, message: "Profil yadda saxlanıldı." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Cari şifrəni daxil edin.").max(200),
    password: z.string().superRefine((v, ctx) => {
      const problem = passwordProblems(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "Yeni şifrələr uyğun gəlmir." })
  .refine((d) => d.password !== d.currentPassword, { path: ["password"], message: "Yeni şifrə cari şifrədən fərqli olmalıdır." });

/** Any signed-in user changes their own password. Other devices are signed out; this one stays signed in. */
export async function changePasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let u;
  try {
    u = await assertUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  if (!(await rateLimit(`change-password:${u.id}`, 8, 3600)).ok) return { error: "Çox cəhd etdiniz. Bir az sonra yenidən yoxlayın." };
  const parsed = passwordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd, SECRETS) };
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, u.id)).limit(1);
  if (!row || !(await verifyPassword(row.hash, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: "Cari şifrə düzgün deyil." }, values: formValues(fd, SECRETS) };
  }
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() }).where(eq(users.id, u.id));
  await revokeAllSessions(u.id);
  await createSession(u.id);
  await audit(u.id, "user.password.change", "user", u.id);
  return { ok: true, message: "Şifrə dəyişdirildi. Digər cihazlardakı girişlər bağlandı." };
}
