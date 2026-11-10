"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/ui/action-form";
import { db } from "@/db";
import {
  announcements,
  classGroups,
  classMembers,
  examAssignments,
  examAttempts,
  examQuestions,
  exams,
  lessons,
  notifications,
  questionOptions,
  questions,
  teacherProfiles,
  users,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { AuthError, assertPermission, assertRole } from "@/lib/auth";
import type { CurrentUser } from "@/lib/session";
import type { Permission } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { resolveVideo } from "@/components/catalog/video-source";
import { isSafeHttpsUrl } from "@/lib/safe-url";
import { slugify } from "@/lib/slug";
import { fieldErrors, formValues } from "@/lib/validation";

type Res = ActionState;
const fail = (error: string, fd?: FormData): Res => ({ error, values: fd ? formValues(fd) : undefined });

/** Resolves the acting user, or an error state. Never throws for auth problems. */
async function actor(perm: Permission | null): Promise<CurrentUser | Res> {
  try {
    const u = perm ? await assertPermission(perm) : await assertRole(["teacher", "admin"]);
    if (!(await rateLimit(`teacher-write:${u.id}`, 120, 600)).ok) return { error: "Çox sayda əməliyyat. Bir az sonra yenidən cəhd edin." };
    return u;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat üçün icazəniz yoxdur." };
    throw e;
  }
}
const isRes = (x: CurrentUser | Res): x is Res => !("id" in x);

/** Empty, a site-relative path ("/images/x.jpg"), or a safe https URL. */
const optionalImageUrl = z
  .string()
  .trim()
  .max(300, "Ünvan çox uzundur.")
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//") && !/[\s\\]/.test(v)) || isSafeHttpsUrl(v), "Yalnız https:// ilə başlayan və ya sayt daxili (/…) ünvan daxil edin.");

const owns = (u: CurrentUser, ownerId: string | null) => u.role === "admin" || ownerId === u.id;
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const optUuid = z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional());
const optInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).optional());

async function uniqueSlug(table: typeof lessons | typeof exams, col: typeof lessons.slug | typeof exams.slug, title: string) {
  const base = slugify(title, 120);
  for (let i = 0; i < 50; i++) {
    const cand = i === 0 ? base : `${base}-${i + 1}`;
    const [hit] = await db.select({ x: sql`1` }).from(table).where(eq(col, cand)).limit(1);
    if (!hit) return cand;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* ------------------------------------------------------------------ Profil */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(160),
  headline: z.string().trim().max(200, "Qısa təqdimat çox uzundur."),
  bio: z.string().trim().max(4000, "Haqqında mətni çox uzundur."),
  qualifications: z.string().trim().max(3000),
  experienceYears: optInt(0, 70, "Təcrübə 0–70 il arasında olmalıdır."),
  officeHours: z.string().trim().max(500),
  contactEmail: z.union([z.literal(""), z.email("E-poçt ünvanını düzgün daxil edin.")]),
  photoUrl: optionalImageUrl,
});

export async function saveTeacherProfile(_p: Res, fd: FormData): Promise<Res> {
  const u = await actor(null);
  if (isRes(u)) return u;
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  await db.update(users).set({ name: d.name, updatedAt: new Date() }).where(eq(users.id, u.id));
  const values = {
    headline: d.headline || null,
    bio: d.bio || null,
    qualifications: d.qualifications || null,
    experienceYears: d.experienceYears ?? null,
    officeHours: d.officeHours || null,
    contactEmail: d.contactEmail || null,
    photoUrl: d.photoUrl || null,
    published: bool(fd, "published"),
    updatedAt: new Date(),
  };
  const [existing] = await db.select({ id: teacherProfiles.userId }).from(teacherProfiles).where(eq(teacherProfiles.userId, u.id)).limit(1);
  if (existing) await db.update(teacherProfiles).set(values).where(eq(teacherProfiles.userId, u.id));
  else {
    let slug = slugify(d.name);
    const [clash] = await db.select({ x: sql`1` }).from(teacherProfiles).where(eq(teacherProfiles.slug, slug)).limit(1);
    if (clash) slug = `${slug}-${u.id.slice(0, 6)}`;
    await db.insert(teacherProfiles).values({ userId: u.id, slug, ...values });
  }
  await audit(u.id, "teacher.profile.update", "user", u.id);
  revalidatePath("/muellim/profil");
  revalidatePath("/muellimler");
  return { ok: true, message: "Profil yadda saxlanıldı." };
}

/* ------------------------------------------------------------------ Dərslər */

function videoRef(provider: string, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (provider === "youtube") {
    if (/^[\w-]{11}$/.test(v)) return v;
    try {
      const url = new URL(v);
      if (url.hostname === "youtu.be") return /^[\w-]{11}$/.test(url.pathname.slice(1)) ? url.pathname.slice(1) : null;
      if (/(^|\.)youtube\.com$/.test(url.hostname)) {
        const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
        return /^[\w-]{11}$/.test(id) ? id : null;
      }
    } catch {}
    return null;
  }
  if (provider === "vimeo") {
    const m = /(\d{6,})/.exec(v);
    return m ? m[1] : null;
  }
  if (provider === "embed") return resolveVideo("embed", v) ? v : null; // only the supported video hosts
  return isSafeHttpsUrl(v) ? v : null;
}

const lessonSchema = z.object({
  title: z.string().trim().min(3, "Başlıq ən azı 3 simvol olmalıdır.").max(220),
  subjectId: z.uuid("Fənn seçin."),
  topicId: optUuid,
  provider: z.enum(["youtube", "vimeo", "mp4", "embed"]),
  videoRef: z.string().trim().max(500),
  durationMin: optInt(0, 600, "Müddət 0–600 dəqiqə arasında olmalıdır."),
  description: z.string().trim().max(2000),
  notes: z.string().trim().max(20000, "Qeydlər çox uzundur."),
});

function parseLesson(fd: FormData) {
  const parsed = lessonSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) } as Res };
  const d = parsed.data;
  const ref = videoRef(d.provider, d.videoRef);
  if (d.videoRef && !ref) return { error: { fieldErrors: { videoRef: "Video ünvanı/identifikatoru düzgün deyil." }, values: formValues(fd) } as Res };
  const published = bool(fd, "published");
  if (published && !ref && !d.notes) return { error: { fieldErrors: { notes: "Dərc etmək üçün video və ya yazılı qeyd əlavə edin." }, values: formValues(fd) } as Res };
  return { d, ref, published };
}

export async function createLesson(_p: Res, fd: FormData): Promise<Res> {
  const u = await actor("lessons.manage");
  if (isRes(u)) return u;
  const r = parseLesson(fd);
  if ("error" in r) return r.error as Res;
  const slug = await uniqueSlug(lessons, lessons.slug, r.d.title);
  const [row] = await db
    .insert(lessons)
    .values({
      slug,
      title: r.d.title,
      subjectId: r.d.subjectId,
      topicId: r.d.topicId ?? null,
      teacherId: u.id,
      provider: r.d.provider,
      videoRef: r.ref,
      durationSec: (r.d.durationMin ?? 0) * 60,
      description: r.d.description || null,
      notes: r.d.notes || null,
      published: r.published,
    })
    .returning({ id: lessons.id });
  await audit(u.id, "lesson.create", "lesson", row.id);
  revalidatePath("/muellim/dersler");
  redirect("/muellim/dersler");
}

export async function updateLesson(id: string, _p: Res, fd: FormData): Promise<Res> {
  const u = await actor("lessons.manage");
  if (isRes(u)) return u;
  const [cur] = await db.select({ teacherId: lessons.teacherId }).from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!cur || !owns(u, cur.teacherId)) return fail("Dərs tapılmadı.");
  const r = parseLesson(fd);
  if ("error" in r) return r.error as Res;
  await db
    .update(lessons)
    .set({
      title: r.d.title,
      subjectId: r.d.subjectId,
      topicId: r.d.topicId ?? null,
      provider: r.d.provider,
      videoRef: r.ref,
      durationSec: (r.d.durationMin ?? 0) * 60,
      description: r.d.description || null,
      notes: r.d.notes || null,
      published: r.published,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, id));
  await audit(u.id, "lesson.update", "lesson", id);
  revalidatePath("/muellim/dersler");
  revalidatePath("/dersler");
  return { ok: true, message: "Dərs yadda saxlanıldı." };
}

export async function deleteLesson(id: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("lessons.manage");
  if (isRes(u)) return { error: u.error };
  const [cur] = await db.select({ teacherId: lessons.teacherId }).from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!cur || !owns(u, cur.teacherId)) return { error: "Dərs tapılmadı." };
  await db.delete(lessons).where(eq(lessons.id, id));
  await audit(u.id, "lesson.delete", "lesson", id);
  revalidatePath("/muellim/dersler");
  revalidatePath("/dersler");
  return { ok: true };
}

/* ------------------------------------------------------------------ Suallar */

const OPTION_SLOTS = 5;
const questionSchema = z.object({
  subjectId: z.uuid("Fənn seçin."),
  topicId: optUuid,
  type: z.enum(["mcq", "true_false", "numeric"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  text: z.string().trim().min(5, "Sual mətni ən azı 5 simvol olmalıdır.").max(5000),
  explanation: z.string().trim().max(5000),
  concept: z.string().trim().max(200),
  steps: z.string().trim().max(5000),
  points: z.preprocess((v) => Number(v || 1), z.number({ error: "Bal rəqəm olmalıdır." }).min(0.25, "Bal ən azı 0.25 olmalıdır.").max(100)),
  numericAnswer: z.string().trim(),
  numericTolerance: z.string().trim(),
  imageUrl: optionalImageUrl,
});

interface ParsedQuestion {
  d: z.infer<typeof questionSchema>;
  opts: { text: string; isCorrect: boolean; whyWrong: string | null }[];
  numeric: { answer: string; tol: string } | null;
}

function parseQuestion(fd: FormData, lockedType?: "mcq" | "true_false" | "numeric"): { err: Res } | ParsedQuestion {
  const raw = Object.fromEntries(fd);
  if (lockedType) raw.type = lockedType;
  // fields of other question types are absent from the form: treat them as empty
  for (const k of ["numericAnswer", "numericTolerance", "explanation", "concept", "steps", "imageUrl"]) raw[k] ??= "";
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) return { err: { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) } };
  const d = parsed.data;
  const bad = (field: string, msg: string) => ({ err: { fieldErrors: { [field]: msg }, values: formValues(fd) } as Res });
  if (d.type === "numeric") {
    const a = Number(d.numericAnswer.replace(",", "."));
    const t = Number((d.numericTolerance || "0").replace(",", "."));
    if (d.numericAnswer === "" || !Number.isFinite(a)) return bad("numericAnswer", "Düzgün ədədi cavabı daxil edin.");
    if (!Number.isFinite(t) || t < 0) return bad("numericTolerance", "Dəqiqlik mənfi ola bilməz.");
    return { d, opts: [], numeric: { answer: String(a), tol: String(t) } };
  }
  if (d.type === "true_false") {
    const correct = str(fd, "correctTf") === "false" ? 1 : 0;
    return {
      d,
      numeric: null,
      opts: [
        { text: "Doğru", isCorrect: correct === 0, whyWrong: null },
        { text: "Yanlış", isCorrect: correct === 1, whyWrong: null },
      ],
    };
  }
  const correct = Number(str(fd, "correct"));
  const opts: ParsedQuestion["opts"] = [];
  for (let i = 0; i < OPTION_SLOTS; i++) {
    const text = str(fd, `opt${i}`).trim();
    if (!text) continue;
    opts.push({ text: text.slice(0, 1000), isCorrect: i === correct, whyWrong: str(fd, `why${i}`).trim().slice(0, 1000) || null });
  }
  if (opts.length < 2) return bad("opt0", "Ən azı 2 variant daxil edin.");
  if (!opts.some((o) => o.isCorrect)) return bad("correct", "Düzgün cavab olan variantı seçin (boş variant seçilə bilməz).");
  return { d, opts, numeric: null };
}

const stepsOf = (s: string) => {
  const arr = s.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30);
  return arr.length ? arr : null;
};

async function topicBelongs(topicId: string | undefined, subjectId: string) {
  if (!topicId) return true;
  const { topics } = await import("@/db/schema");
  const [t] = await db.select({ s: topics.subjectId }).from(topics).where(eq(topics.id, topicId)).limit(1);
  return t?.s === subjectId;
}

export async function createQuestion(_p: Res, fd: FormData): Promise<Res> {
  const u = await actor("questions.manage");
  if (isRes(u)) return u;
  const r = parseQuestion(fd);
  if ("err" in r) return r.err;
  if (!(await topicBelongs(r.d.topicId, r.d.subjectId))) return { fieldErrors: { topicId: "Mövzu seçilmiş fənnə aid deyil." }, values: formValues(fd) };
  const id = await db.transaction(async (tx) => {
    const [q] = await tx
      .insert(questions)
      .values({
        subjectId: r.d.subjectId,
        topicId: r.d.topicId ?? null,
        authorId: u.id,
        type: r.d.type,
        difficulty: r.d.difficulty,
        text: r.d.text,
        imageUrl: r.d.imageUrl || null,
        explanation: r.d.explanation || null,
        steps: stepsOf(r.d.steps),
        concept: r.d.concept || null,
        points: String(r.d.points),
        numericAnswer: r.numeric?.answer ?? null,
        numericTolerance: r.numeric?.tol ?? "0",
      })
      .returning({ id: questions.id });
    if (r.opts.length) await tx.insert(questionOptions).values(r.opts.map((o, i) => ({ questionId: q.id, orderIndex: i, ...o })));
    return q.id;
  });
  await audit(u.id, "question.create", "question", id);
  revalidatePath("/muellim/suallar");
  redirect("/muellim/suallar");
}

export async function updateQuestion(id: string, _p: Res, fd: FormData): Promise<Res> {
  const u = await actor("questions.manage");
  if (isRes(u)) return u;
  const [cur] = await db.select({ authorId: questions.authorId, type: questions.type }).from(questions).where(eq(questions.id, id)).limit(1);
  if (!cur || !owns(u, cur.authorId)) return fail("Sual tapılmadı.");
  const r = parseQuestion(fd, cur.type); // the type is fixed after creation (answers already reference its options)
  if ("err" in r) return r.err;
  if (!(await topicBelongs(r.d.topicId, r.d.subjectId))) return { fieldErrors: { topicId: "Mövzu seçilmiş fənnə aid deyil." }, values: formValues(fd) };
  await db.transaction(async (tx) => {
    await tx
      .update(questions)
      .set({
        subjectId: r.d.subjectId,
        topicId: r.d.topicId ?? null,
        difficulty: r.d.difficulty,
        text: r.d.text,
        imageUrl: r.d.imageUrl || null,
        explanation: r.d.explanation || null,
        steps: stepsOf(r.d.steps),
        concept: r.d.concept || null,
        points: String(r.d.points),
        numericAnswer: r.numeric?.answer ?? null,
        numericTolerance: r.numeric?.tol ?? "0",
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));
    if (cur.type !== "numeric") {
      // Update options in place (by position) so earlier answers keep pointing at the same option rows.
      const existing = await tx.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, id)).orderBy(questionOptions.orderIndex);
      for (let i = 0; i < r.opts.length; i++) {
        const o = r.opts[i];
        if (existing[i]) await tx.update(questionOptions).set({ ...o, orderIndex: i }).where(eq(questionOptions.id, existing[i].id));
        else await tx.insert(questionOptions).values({ questionId: id, orderIndex: i, ...o });
      }
      const extra = existing.slice(r.opts.length).map((e) => e.id);
      if (extra.length) await tx.delete(questionOptions).where(inArray(questionOptions.id, extra));
    }
  });
  await audit(u.id, "question.update", "question", id);
  revalidatePath("/muellim/suallar");
  return { ok: true, message: "Sual yadda saxlanıldı." };
}

export async function deleteQuestion(id: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("questions.manage");
  if (isRes(u)) return { error: u.error };
  const [cur] = await db.select({ authorId: questions.authorId }).from(questions).where(eq(questions.id, id)).limit(1);
  if (!cur || !owns(u, cur.authorId)) return { error: "Sual tapılmadı." };
  const [used] = await db.select({ x: sql`1` }).from(examQuestions).where(eq(examQuestions.questionId, id)).limit(1);
  if (used) return { error: "Bu sual sınaqda istifadə olunur. Əvvəl sınaqdan çıxarın." };
  try {
    await db.delete(questions).where(eq(questions.id, id));
  } catch {
    return { error: "Sual silinə bilmədi (başqa qeydlərə bağlıdır)." };
  }
  await audit(u.id, "question.delete", "question", id);
  revalidatePath("/muellim/suallar");
  return { ok: true };
}

/* ------------------------------------------------------------------ Sınaqlar */

/** `datetime-local` values are wall-clock Asia/Baku time (UTC+4, no DST). */
const bakuDate = (label: string) =>
  z
    .string({ error: `${label} tələb olunur.` })
    .min(1, `${label} tələb olunur.`)
    .transform((v) => new Date(`${v.length === 16 ? v + ":00" : v}+04:00`))
    .refine((d) => !Number.isNaN(d.getTime()), `${label} düzgün deyil.`);

const examSchema = z.object({
  title: z.string().trim().min(3, "Başlıq ən azı 3 simvol olmalıdır.").max(220),
  description: z.string().trim().max(3000),
  subjectId: z.uuid("Fənn seçin."),
  topicId: optUuid,
  grade: optInt(1, 11, "Sinif 1–11 arasında olmalıdır."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  visibility: z.enum(["public", "private", "assigned"]),
  status: z.enum(["draft", "published", "archived"]),
  startsAt: bakuDate("Başlama vaxtı"),
  endsAt: bakuDate("Bitmə vaxtı"),
  durationMin: z.preprocess((v) => Number(v), z.number({ error: "Müddət rəqəm olmalıdır." }).int("Müddət tam ədəd olmalıdır.").min(1, "Müddət ən azı 1 dəqiqə.").max(600, "Müddət 600 dəqiqədən çox ola bilməz.")),
  passingPercent: z.preprocess((v) => Number(v || 50), z.number().min(0, "0–100 arası").max(100, "0–100 arası")),
  negativeMarking: z.preprocess((v) => Number(v || 0), z.number().min(0, "0–1 arası").max(1, "0–1 arası")),
  attemptLimit: z.preprocess((v) => Number(v || 1), z.number().int().min(1, "Ən azı 1").max(20, "Ən çox 20")),
  resultRelease: z.enum(["immediate", "after_end", "manual"]),
});

export async function saveExam(examId: string | null, _p: Res, fd: FormData): Promise<Res> {
  const u = await actor("exams.manage");
  if (isRes(u)) return u;
  const parsed = examSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  const err = (field: string, msg: string): Res => ({ fieldErrors: { [field]: msg }, values: formValues(fd) });
  if (d.endsAt <= d.startsAt) return err("endsAt", "Bitmə vaxtı başlama vaxtından sonra olmalıdır.");
  if (!(await topicBelongs(d.topicId, d.subjectId))) return err("topicId", "Mövzu seçilmiş fənnə aid deyil.");

  let locked = false;
  let questionIds = [...new Set(fd.getAll("questionIds").filter((x): x is string => typeof x === "string"))];
  if (examId) {
    const [att] = await db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(eq(examAttempts.examId, examId));
    locked = (att?.n ?? 0) > 0;
    if (locked) questionIds = (await db.select({ id: examQuestions.questionId }).from(examQuestions).where(eq(examQuestions.examId, examId))).map((x) => x.id);
  }
  if (!questionIds.every((x) => z.uuid().safeParse(x).success)) return fail("Sual siyahısı etibarsızdır.", fd);
  if (d.status === "published" && questionIds.length === 0) return err("questionIds", "Dərc etmək üçün ən azı bir sual seçin.");

  const allowedQs = questionIds.length
    ? await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(inArray(questions.id, questionIds), u.role === "admin" ? undefined : eq(questions.authorId, u.id)))
    : [];
  if (!locked && allowedQs.length !== questionIds.length) return fail("Seçilmiş suallardan bəziləri tapılmadı.", fd);

  let classIds: string[] = [];
  if (d.visibility === "assigned") {
    classIds = [...new Set(fd.getAll("classIds").filter((x): x is string => typeof x === "string"))];
    if (classIds.length) {
      if (!(u.role === "admin" || u.permissions.has("exams.assign"))) return fail("Sınağı siniflərə təyin etmək icazəniz yoxdur.", fd);
      const mine = await db
        .select({ id: classGroups.id })
        .from(classGroups)
        .where(and(inArray(classGroups.id, classIds), u.role === "admin" ? undefined : eq(classGroups.teacherId, u.id)));
      if (mine.length !== classIds.length) return fail("Seçilmiş siniflərdən bəziləri tapılmadı.", fd);
    }
    if (d.status === "published" && classIds.length === 0) return err("classIds", "Təyin olunmuş sınaq üçün ən azı bir sinif seçin.");
  }

  const base = {
    title: d.title,
    description: d.description || null,
    subjectId: d.subjectId,
    topicId: d.topicId ?? null,
    grade: d.grade ?? null,
    difficulty: d.difficulty,
    visibility: d.visibility,
    status: d.status,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    durationMin: d.durationMin,
    passingPercent: String(d.passingPercent),
    negativeMarking: String(d.negativeMarking),
    shuffleQuestions: bool(fd, "shuffleQuestions"),
    shuffleOptions: bool(fd, "shuffleOptions"),
    attemptLimit: d.attemptLimit,
    showExplanations: bool(fd, "showExplanations"),
    resultRelease: d.resultRelease,
  };

  let id = examId;
  if (examId) {
    const [cur] = await db.select({ createdBy: exams.createdBy }).from(exams).where(eq(exams.id, examId)).limit(1);
    if (!cur || !owns(u, cur.createdBy)) return fail("Sınaq tapılmadı.");
    await db.transaction(async (tx) => {
      await tx.update(exams).set({ ...base, updatedAt: new Date() }).where(eq(exams.id, examId));
      if (!locked) {
        await tx.delete(examQuestions).where(eq(examQuestions.examId, examId));
        if (questionIds.length) await tx.insert(examQuestions).values(questionIds.map((qid, i) => ({ examId, questionId: qid, orderIndex: i })));
      }
      await tx.delete(examAssignments).where(eq(examAssignments.examId, examId));
      if (classIds.length) await tx.insert(examAssignments).values(classIds.map((cid) => ({ examId, classId: cid })));
    });
    await audit(u.id, "exam.update", "exam", examId);
  } else {
    const slug = await uniqueSlug(exams, exams.slug, d.title);
    id = await db.transaction(async (tx) => {
      const [e] = await tx.insert(exams).values({ ...base, slug, createdBy: u.id }).returning({ id: exams.id });
      if (questionIds.length) await tx.insert(examQuestions).values(questionIds.map((qid, i) => ({ examId: e.id, questionId: qid, orderIndex: i })));
      if (classIds.length) await tx.insert(examAssignments).values(classIds.map((cid) => ({ examId: e.id, classId: cid })));
      return e.id;
    });
    await audit(u.id, "exam.create", "exam", id!);
  }
  revalidatePath("/muellim/sinaqlar");
  revalidatePath("/sinaqlar");
  if (!examId) redirect("/muellim/sinaqlar");
  return { ok: true, message: "Sınaq yadda saxlanıldı." };
}

export async function deleteExam(id: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("exams.manage");
  if (isRes(u)) return { error: u.error };
  const [cur] = await db.select({ createdBy: exams.createdBy }).from(exams).where(eq(exams.id, id)).limit(1);
  if (!cur || !owns(u, cur.createdBy)) return { error: "Sınaq tapılmadı." };
  const [att] = await db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(eq(examAttempts.examId, id));
  if ((att?.n ?? 0) > 0) return { error: "Bu sınaqda iştirak edən şagirdlər var. Silmək əvəzinə arxivə göndərin." };
  await db.delete(exams).where(eq(exams.id, id));
  await audit(u.id, "exam.delete", "exam", id);
  revalidatePath("/muellim/sinaqlar");
  revalidatePath("/sinaqlar");
  return { ok: true };
}

/* ------------------------------------------------------------------ Siniflər */

const classSchema = z.object({
  name: z.string().trim().min(2, "Sinif adı ən azı 2 simvol olmalıdır.").max(160),
  grade: optInt(1, 11, "Sinif 1–11 arasında olmalıdır."),
});

export async function createClass(_p: Res, fd: FormData): Promise<Res> {
  const u = await actor("exams.assign");
  if (isRes(u)) return u;
  const parsed = classSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const [c] = await db.insert(classGroups).values({ name: parsed.data.name, grade: parsed.data.grade ?? null, teacherId: u.id }).returning({ id: classGroups.id });
  await audit(u.id, "class.create", "class", c.id);
  revalidatePath("/muellim/sinifler");
  redirect(`/muellim/sinifler/${c.id}`);
}

async function ownClass(u: CurrentUser, id: string) {
  const [c] = await db.select({ teacherId: classGroups.teacherId }).from(classGroups).where(eq(classGroups.id, id)).limit(1);
  return c && owns(u, c.teacherId) ? c : null;
}

export async function deleteClass(id: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("exams.assign");
  if (isRes(u)) return { error: u.error };
  if (!(await ownClass(u, id))) return { error: "Sinif tapılmadı." };
  await db.delete(classGroups).where(eq(classGroups.id, id));
  await audit(u.id, "class.delete", "class", id);
  revalidatePath("/muellim/sinifler");
  return { ok: true };
}

export async function addClassMember(classId: string, _p: Res, fd: FormData): Promise<Res> {
  const u = await actor("exams.assign");
  if (isRes(u)) return u;
  if (!(await ownClass(u, classId))) return fail("Sinif tapılmadı.");
  const emails = str(fd, "emails")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 100);
  if (emails.length === 0) return { fieldErrors: { emails: "Ən azı bir e-poçt ünvanı daxil edin." }, values: formValues(fd) };
  const found = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.role, "student"), inArray(sql`lower(${users.email})`, emails)));
  if (found.length) await db.insert(classMembers).values(found.map((s) => ({ classId, studentId: s.id }))).onConflictDoNothing();
  const foundSet = new Set(found.map((f) => f.email.toLowerCase()));
  const missing = emails.filter((e) => !foundSet.has(e));
  revalidatePath(`/muellim/sinifler/${classId}`);
  revalidatePath("/muellim/sinifler");
  if (found.length === 0) return { error: "Bu e-poçtlarla qeydiyyatlı şagird tapılmadı." };
  return { ok: true, message: `${found.length} şagird əlavə olundu.${missing.length ? ` Tapılmadı: ${missing.join(", ")}` : ""}` };
}

export async function removeClassMember(classId: string, studentId: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("exams.assign");
  if (isRes(u)) return { error: u.error };
  if (!(await ownClass(u, classId))) return { error: "Sinif tapılmadı." };
  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)));
  revalidatePath(`/muellim/sinifler/${classId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ Elanlar */

const announceSchema = z.object({
  title: z.string().trim().min(3, "Başlıq ən azı 3 simvol olmalıdır.").max(200),
  body: z.string().trim().min(5, "Mətn ən azı 5 simvol olmalıdır.").max(5000),
  audience: z.enum(["all", "students", "class"]),
  classId: optUuid,
});

export async function createAnnouncement(_p: Res, fd: FormData): Promise<Res> {
  const u = await actor("announcements.publish");
  if (isRes(u)) return u;
  const parsed = announceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd) };
  const d = parsed.data;
  if (d.audience === "class") {
    if (!d.classId) return { fieldErrors: { classId: "Sinif seçin." }, values: formValues(fd) };
    if (!(await ownClass(u, d.classId))) return fail("Sinif tapılmadı.", fd);
  }
  const [a] = await db
    .insert(announcements)
    .values({ authorId: u.id, title: d.title, body: d.body, audience: d.audience, classId: d.audience === "class" ? d.classId! : null })
    .returning({ id: announcements.id });
  if (d.audience === "class" && d.classId) {
    const members = await db.select({ id: classMembers.studentId }).from(classMembers).where(eq(classMembers.classId, d.classId));
    if (members.length) await db.insert(notifications).values(members.map((m) => ({ userId: m.id, type: "announcement" as const, title: d.title, body: d.body.slice(0, 200) })));
  }
  await audit(u.id, "announcement.create", "announcement", a.id);
  revalidatePath("/muellim/elanlar");
  return { ok: true, message: "Elan dərc olundu." };
}

export async function deleteAnnouncement(id: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await actor("announcements.publish");
  if (isRes(u)) return { error: u.error };
  const [cur] = await db.select({ authorId: announcements.authorId }).from(announcements).where(eq(announcements.id, id)).limit(1);
  if (!cur || !owns(u, cur.authorId)) return { error: "Elan tapılmadı." };
  await db.delete(announcements).where(eq(announcements.id, id));
  await audit(u.id, "announcement.delete", "announcement", id);
  revalidatePath("/muellim/elanlar");
  return { ok: true };
}
