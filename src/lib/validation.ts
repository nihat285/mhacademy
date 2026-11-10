import { z } from "zod";
import { passwordProblems } from "./password";

/** Maps Zod issues to { field: firstMessage } for display next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}

/** Plain string values of a FormData (files and secrets excluded) so forms can re-fill after an error. */
export function formValues(fd: FormData, exclude: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION") && !exclude.includes(k)) out[k] = v;
  }
  return out;
}

const email = z
  .string({ error: "E-poçt ünvanı tələb olunur." })
  .trim()
  .toLowerCase()
  .max(255, "E-poçt çox uzundur.")
  .pipe(z.email({ error: "E-poçt ünvanını düzgün daxil edin." }));

const password = z
  .string({ error: "Şifrə tələb olunur." })
  .superRefine((v, ctx) => {
    const problem = passwordProblems(v);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const registerSchema = z
  .object({
    name: z.string({ error: "Ad tələb olunur." }).trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(120, "Ad çox uzundur."),
    email,
    password,
    passwordConfirm: z.string(),
    grade: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .pipe(z.number().int().min(1, "Sinif 1–11 arasında olmalıdır.").max(11, "Sinif 1–11 arasında olmalıdır.").optional()),
    terms: z.literal("on", { error: "Davam etmək üçün qaydalarla razılaşmalısınız." }),
  })
  .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "Şifrələr uyğun gəlmir." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Şifrə tələb olunur.").max(200),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    token: z.string().min(10, "Bağlantı etibarsızdır.").max(200),
    password,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "Şifrələr uyğun gəlmir." });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Adınızı daxil edin.").max(120),
  email,
  message: z.string().trim().min(10, "Mesaj ən azı 10 simvol olmalıdır.").max(3000, "Mesaj çox uzundur."),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(120),
  grade: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(1).max(11).nullable()),
  goals: z.string().trim().max(1000, "Məqsəd mətni çox uzundur.").optional(),
  displayAlias: z.string().trim().max(40, "Təxəllüs çox uzundur.").optional(),
});

/** Only same-site relative paths are allowed as post-login redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/panel"): string {
  // Control characters (tab/newline) are stripped by browsers, so "/\t/evil.com" would become "//evil.com".
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}
