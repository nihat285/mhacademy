"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { examRegistrations, exams } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ExamError, finalizeAttempt, hasExamAccess, saveAnswer, startAttempt } from "@/lib/exam/engine";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { formatDateTime } from "@/lib/format";

const uuid = z.uuid();
const GENERIC = "Əməliyyat alınmadı. Bir az sonra yenidən cəhd edin.";

function message(e: unknown): string {
  if (e instanceof ExamError) return e.message;
  console.error("exam action failed", e);
  return GENERIC;
}

/** Starts (or resumes) an attempt and sends the student to the exam screen. */
export async function startExamAction(examId: string): Promise<{ error: string } | void> {
  const user = await assertRole(["student"]);
  if (!uuid.safeParse(examId).success) return { error: "Sınaq tapılmadı." };
  if (!(await rateLimit(`exam-start:${user.id}`, 20, 600)).ok) return { error: "Çox sayda cəhd edildi. Bir az gözləyin." };
  let id: string;
  try {
    id = (await startAttempt(user.id, examId)).id;
  } catch (e) {
    return { error: message(e) };
  }
  await audit(user.id, "exam.start", "exam", examId, { attemptId: id });
  redirect(`/imtahan/${id}`);
}

export interface SaveResult { ok: boolean; code?: "closed" | "expired" | "invalid" | "error"; error?: string }

/** Autosave. Never trusts the client's clock: the server compares against the stored deadline. */
export async function saveAnswerAction(
  attemptId: string,
  input: { questionId: string; optionId: string | null; numeric: string | null; flagged: boolean },
): Promise<SaveResult> {
  const user = await assertRole(["student"]);
  const parsed = z
    .object({ attemptId: uuid, questionId: uuid, optionId: uuid.nullable(), numeric: z.string().max(40).nullable(), flagged: z.boolean() })
    .safeParse({ attemptId, ...input });
  if (!parsed.success) return { ok: false, code: "invalid", error: "Yanlış sorğu." };
  let numericValue: number | null = null;
  if (parsed.data.numeric !== null && parsed.data.numeric.trim() !== "") {
    numericValue = Number(parsed.data.numeric.trim().replace(",", "."));
    if (!Number.isFinite(numericValue)) return { ok: false, code: "invalid", error: "Rəqəmi düzgün daxil edin." };
  }
  if (!(await rateLimit(`exam-save:${user.id}`, 600, 60)).ok) return { ok: false, code: "error", error: "Çox tez-tez yadda saxlanılır." };
  try {
    await saveAnswer(user.id, attemptId, { questionId: parsed.data.questionId, optionId: parsed.data.optionId, numericValue, flagged: parsed.data.flagged });
    return { ok: true };
  } catch (e) {
    if (e instanceof ExamError) return { ok: false, code: e.code === "closed" || e.code === "expired" ? e.code : "invalid", error: e.message };
    console.error("autosave failed", e);
    return { ok: false, code: "error", error: GENERIC };
  }
}

/** Final submission (also used by the timer reaching zero). Idempotent: repeats just return the existing result. */
export async function submitAttemptAction(attemptId: string, auto = false): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const user = await assertRole(["student"]);
  if (!uuid.safeParse(attemptId).success) return { ok: false, error: "Cəhd tapılmadı." };
  try {
    const res = await finalizeAttempt(attemptId, { userId: user.id, auto });
    if (!res.alreadyDone) await audit(user.id, auto ? "exam.auto_submit" : "exam.submit", "attempt", attemptId);
    revalidatePath("/panel", "layout");
    return { ok: true, href: `/panel/neticelerim/${attemptId}` };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** Register for / cancel registration for an upcoming exam (creates a confirmation notification). */
export async function toggleRegistrationAction(examId: string): Promise<{ error: string } | void> {
  const user = await assertRole(["student"]);
  if (!uuid.safeParse(examId).success) return { error: "Sınaq tapılmadı." };
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam || !(await hasExamAccess(exam, user.id))) return { error: "Sınaq tapılmadı." };
  if (new Date() >= exam.endsAt) return { error: "Sınağın vaxtı bitib." };
  const [existing] = await db.select().from(examRegistrations).where(and(eq(examRegistrations.examId, examId), eq(examRegistrations.userId, user.id))).limit(1);
  if (existing) {
    await db.delete(examRegistrations).where(and(eq(examRegistrations.examId, examId), eq(examRegistrations.userId, user.id)));
  } else {
    await db.insert(examRegistrations).values({ examId, userId: user.id }).onConflictDoNothing();
    await notify({ userId: user.id, type: "exam", title: `Qeydiyyat təsdiqləndi: ${exam.title}`, body: `Sınaq ${formatDateTime(exam.startsAt)} tarixində başlayır. Müddət: ${exam.durationMin} dəqiqə.`, href: "/panel/sinaqlar" });
  }
  revalidatePath("/panel/sinaqlar");
}
