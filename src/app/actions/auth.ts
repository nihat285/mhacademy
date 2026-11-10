"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { emailTokens, studentProfiles, users } from "@/db/schema";
import type { ActionState } from "@/components/ui/action-form";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { appUrl, sendMail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createSession, destroySession, getCurrentUser, revokeAllSessions } from "@/lib/session";
import { fieldErrors, forgotSchema, formValues, loginSchema, registerSchema, resetSchema, safeNext } from "@/lib/validation";

const SECRETS = ["password", "passwordConfirm", "token"];
const TOO_MANY = "Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin.";
const homeFor = (role: string) => (role === "admin" ? "/idare" : role === "teacher" ? "/muellim" : "/panel");

async function issueToken(userId: string, type: "verify_email" | "reset_password", ttlMs: number) {
  const token = randomToken();
  // Invalidate previous unused tokens of the same type.
  await db.update(emailTokens).set({ usedAt: new Date() }).where(and(eq(emailTokens.userId, userId), eq(emailTokens.type, type), isNull(emailTokens.usedAt)));
  await db.insert(emailTokens).values({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

async function sendVerification(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "verify_email", 48 * 3600_000);
  await sendMail({
    to: user.email,
    subject: "MH Academy — e-poçt ünvanınızı təsdiqləyin",
    text: `Salam, ${user.name}!\n\nHesabınızı təsdiqləmək üçün bu bağlantıya keçin (48 saat etibarlıdır):\n${appUrl()}/tesdiq?token=${token}\n\nBu sorğunu siz etməmisinizsə, bu məktuba məhəl qoymayın.`,
  });
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd, SECRETS);
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}`, 8, 3600)).ok) return { error: TOO_MANY, values };

  const { name, email, password, grade } = parsed.data;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    // Do not reveal whether the e-mail is registered beyond what sign-up inherently must.
    return { fieldErrors: { email: "Bu e-poçt ilə hesab artıq mövcuddur. Daxil olun və ya şifrəni bərpa edin." }, values };
  }

  const passwordHash = await hashPassword(password);
  let created: { id: string; email: string; name: string };
  try {
    [created] = await db.transaction(async (tx) => {
      const rows = await tx.insert(users).values({ email, name, passwordHash, role: "student" }).returning({ id: users.id, email: users.email, name: users.name });
      await tx.insert(studentProfiles).values({ userId: rows[0].id, grade: grade ?? null });
      await notify({ userId: rows[0].id, type: "system", title: "Xoş gəlmisiniz!", body: "Hesabınız yaradıldı. İlk sınağınıza Sınaqlar bölməsindən başlayın.", href: "/sinaqlar" }, tx);
      return rows;
    });
  } catch {
    return { fieldErrors: { email: "Bu e-poçt ilə hesab artıq mövcuddur." }, values };
  }
  await audit(created.id, "auth.register", "user", created.id);
  try {
    await sendVerification(created);
  } catch (e) {
    console.error("Verification e-mail failed", e);
  }
  await createSession(created.id);
  redirect("/panel?yeni=1");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd, SECRETS);
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([rateLimit(`login-ip:${ip}`, 30, 900), rateLimit(`login-email:${email}`, 8, 900)]);
  if (!byIp.ok || !byEmail.ok) return { error: TOO_MANY, values };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Always run a hash verification so response time doesn't reveal whether the account exists.
  const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  if (!user || !ok) {
    await audit(user?.id ?? null, "auth.login_failed", "user", user?.id, { email });
    return { error: "E-poçt və ya şifrə yanlışdır.", values };
  }
  if (user.status !== "active") return { error: "Hesabınız deaktiv edilib. Dəstək ilə əlaqə saxlayın.", values };

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await audit(user.id, "auth.login", "user", user.id);
  redirect(safeNext(String(fd.get("next") ?? ""), homeFor(user.role)));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "auth.logout", "user", user.id);
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const ip = await clientIp();
  const { email } = parsed.data;
  if (!(await rateLimit(`forgot-ip:${ip}`, 10, 3600)).ok || !(await rateLimit(`forgot-email:${email}`, 3, 3600)).ok) return { error: TOO_MANY };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user && user.status === "active") {
    const token = await issueToken(user.id, "reset_password", 60 * 60_000);
    try {
      await sendMail({
        to: user.email,
        subject: "MH Academy — şifrənin bərpası",
        text: `Salam, ${user.name}!\n\nŞifrəni yeniləmək üçün bu bağlantıya keçin (1 saat etibarlıdır):\n${appUrl()}/sifre-yenile?token=${token}\n\nBu sorğunu siz etməmisinizsə, məktuba məhəl qoymayın — şifrəniz dəyişməyəcək.`,
      });
    } catch (e) {
      console.error("Reset e-mail failed", e);
    }
    await audit(user.id, "auth.reset_requested", "user", user.id);
  }
  // Same response whether or not the account exists.
  return { ok: true, message: "Əgər bu e-poçt ünvanı ilə hesab varsa, şifrənin bərpası üçün bağlantı göndərildi." };
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { token, password } = parsed.data;
  if (!(await rateLimit(`reset:${await clientIp()}`, 15, 3600)).ok) return { error: TOO_MANY };

  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    // Atomically consume the token: only one concurrent request can flip usedAt from NULL.
    const [row] = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailTokens.tokenHash, sha256(token)), eq(emailTokens.type, "reset_password"), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date())))
      .returning({ userId: emailTokens.userId });
    if (!row) return null;
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    return row.userId;
  });
  if (!userId) return { error: "Bağlantının müddəti bitib və ya artıq istifadə olunub. Yeni bərpa sorğusu göndərin." };
  await revokeAllSessions(userId);
  await audit(userId, "auth.password_reset", "user", userId);
  redirect("/giris?sifre=yenilendi");
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Daxil olmaq tələb olunur." };
  if (user.emailVerified) return { ok: true, message: "E-poçtunuz artıq təsdiqlənib." };
  if (!(await rateLimit(`verify-resend:${user.id}`, 3, 3600)).ok) return { error: TOO_MANY };
  await sendVerification({ id: user.id, email: user.email, name: user.name });
  return { ok: true, message: "Təsdiq bağlantısı e-poçtunuza göndərildi." };
}

/** Used by the /tesdiq page. Returns true when the token was valid and consumed. */
export async function consumeVerificationToken(token: string): Promise<boolean> {
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailTokens.tokenHash, sha256(token)), eq(emailTokens.type, "verify_email"), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date())))
    .returning({ userId: emailTokens.userId });
  if (!row) return false;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
  await audit(row.userId, "auth.email_verified", "user", row.userId);
  return true;
}
