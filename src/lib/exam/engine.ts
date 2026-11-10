import { and, asc, count, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  attemptAnswers, classMembers, examAssignments, examAttempts, examQuestions, exams, questionOptions, questions, studentProfiles,
} from "@/db/schema";
import { notify } from "@/lib/notify";
import { gradeAttempt, type GradableQuestion, type SubmittedAnswer } from "@/lib/scoring";
import { bakuDay, isReleased, nextStreak } from "./release";
import { shuffle } from "./shuffle";

/**
 * Exam engine. Everything that decides who may sit an exam, until when, and what the score is lives here and runs on
 * the server. The browser countdown is cosmetic: `deadlineAt` (stored at start) is what is enforced.
 */

export type ExamErrorCode = "not_found" | "not_started" | "ended" | "limit" | "empty" | "closed" | "expired" | "invalid";
export class ExamError extends Error {
  constructor(public code: ExamErrorCode, message: string) {
    super(message);
  }
}

/** Autosaves that arrive a moment after the deadline (network latency) are still accepted; nothing later is. */
export const SAVE_GRACE_MS = 5_000;

type ExamRow = typeof exams.$inferSelect;
type DbLike = typeof db | Tx;

const isUniqueViolation = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code === "23505" || x?.cause?.code === "23505";
};

/** Published public exams are open to every student; private/assigned exams need a direct or class assignment. */
export async function hasExamAccess(exam: Pick<ExamRow, "id" | "status" | "visibility">, userId: string, d: DbLike = db): Promise<boolean> {
  if (exam.status !== "published") return false;
  if (exam.visibility === "public") return true;
  const myClasses = d.select({ id: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, userId));
  const [row] = await d
    .select({ n: count() })
    .from(examAssignments)
    .where(and(eq(examAssignments.examId, exam.id), or(eq(examAssignments.studentId, userId), inArray(examAssignments.classId, myClasses))));
  return row.n > 0;
}

export interface StartedAttempt {
  id: string;
  resumed: boolean;
}

/** Starts a new attempt, or resumes the open one. Safe under concurrent calls (unique index on the open attempt). */
export async function startAttempt(userId: string, examId: string, now = new Date()): Promise<StartedAttempt> {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam || !(await hasExamAccess(exam, userId))) throw new ExamError("not_found", "Sınaq tapılmadı.");

  const findOpen = () =>
    db.select().from(examAttempts).where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId), eq(examAttempts.status, "in_progress"))).limit(1);

  const [open] = await findOpen();
  if (open) {
    if (open.deadlineAt.getTime() > now.getTime()) return { id: open.id, resumed: true };
    await finalizeAttempt(open.id, { auto: true });
  }
  if (now < exam.startsAt) throw new ExamError("not_started", "Sınaq hələ başlamayıb.");
  if (now >= exam.endsAt) throw new ExamError("ended", "Sınağın vaxtı bitib.");

  const [{ used }] = await db.select({ used: count() }).from(examAttempts).where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId)));
  if (used >= exam.attemptLimit) throw new ExamError("limit", `Bu sınaq üçün cəhd limiti (${exam.attemptLimit}) dolub.`);

  const qrows = await db
    .select({ id: examQuestions.questionId, type: questions.type })
    .from(examQuestions)
    .innerJoin(questions, eq(questions.id, examQuestions.questionId))
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.orderIndex));
  if (qrows.length === 0) throw new ExamError("empty", "Bu sınaqda hələ sual yoxdur.");

  const orderedIds = exam.shuffleQuestions ? shuffle(qrows.map((q) => q.id)) : qrows.map((q) => q.id);
  const opts = await db
    .select({ id: questionOptions.id, questionId: questionOptions.questionId })
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, orderedIds))
    .orderBy(asc(questionOptions.orderIndex));
  const typeOf = new Map(qrows.map((q) => [q.id, q.type]));
  const optionOrder: Record<string, string[]> = {};
  for (const q of orderedIds) {
    const ids = opts.filter((o) => o.questionId === q).map((o) => o.id);
    optionOrder[q] = exam.shuffleOptions && typeOf.get(q) === "mcq" ? shuffle(ids) : ids;
  }

  const deadlineAt = new Date(Math.min(now.getTime() + exam.durationMin * 60_000, exam.endsAt.getTime()));
  try {
    const [created] = await db
      .insert(examAttempts)
      .values({ examId, userId, attemptNo: used + 1, startedAt: now, deadlineAt, questionOrder: orderedIds, optionOrder })
      .returning({ id: examAttempts.id });
    return { id: created.id, resumed: false };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const [again] = await findOpen(); // a parallel request won the race
    if (again) return { id: again.id, resumed: true };
    throw e;
  }
}

export interface SaveInput {
  questionId: string;
  optionId: string | null;
  numericValue: number | null;
  flagged: boolean;
}

/** Stores one question's state. Rejects anything after the server-side deadline (+ small grace). */
export async function saveAnswer(userId: string, attemptId: string, input: SaveInput, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    // FOR SHARE makes this wait for an in-flight grading transaction and then see its final status.
    const [attempt] = await tx.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId))).for("share");
    if (!attempt) throw new ExamError("not_found", "Cəhd tapılmadı.");
    if (attempt.status !== "in_progress") throw new ExamError("closed", "Sınaq artıq təqdim olunub.");
    if (now.getTime() > attempt.deadlineAt.getTime() + SAVE_GRACE_MS) throw new ExamError("expired", "Sınağın vaxtı bitib.");
    if (!attempt.questionOrder.includes(input.questionId)) throw new ExamError("invalid", "Sual bu sınağa aid deyil.");

    const [q] = await tx.select({ type: questions.type }).from(questions).where(eq(questions.id, input.questionId)).limit(1);
    if (!q) throw new ExamError("invalid", "Sual tapılmadı.");

    let optionId: string | null = null;
    let numericValue: number | null = null;
    if (q.type === "numeric") {
      if (input.numericValue !== null) {
        if (!Number.isFinite(input.numericValue) || Math.abs(input.numericValue) > 1e12) throw new ExamError("invalid", "Rəqəm yanlışdır.");
        numericValue = input.numericValue;
      }
    } else if (input.optionId) {
      if (!(attempt.optionOrder[input.questionId] ?? []).includes(input.optionId)) throw new ExamError("invalid", "Cavab variantı yanlışdır.");
      optionId = input.optionId;
    }
    const answered = optionId !== null || numericValue !== null;
    const row = {
      attemptId,
      questionId: input.questionId,
      selectedOptionId: optionId,
      numericValue: numericValue === null ? null : String(numericValue),
      flagged: input.flagged,
      answeredAt: answered ? now : null,
    };
    await tx
      .insert(attemptAnswers)
      .values(row)
      .onConflictDoUpdate({
        target: [attemptAnswers.attemptId, attemptAnswers.questionId],
        set: { selectedOptionId: row.selectedOptionId, numericValue: row.numericValue, flagged: row.flagged, answeredAt: row.answeredAt },
      });
  });
}

/**
 * Grades and closes an attempt exactly once. The attempt row is locked (FOR UPDATE), so concurrent submits,
 * a submit racing the deadline sweep, and double clicks all collapse into a single grading.
 */
export async function finalizeAttempt(attemptId: string, opts: { userId?: string; auto?: boolean } = {}, now = new Date()) {
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).for("update");
    if (!attempt || (opts.userId && attempt.userId !== opts.userId)) throw new ExamError("not_found", "Cəhd tapılmadı.");
    if (attempt.status !== "in_progress") return { attemptId, alreadyDone: true as const };

    const [exam] = await tx.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
    const qids = attempt.questionOrder;
    // Sequential on purpose: a transaction owns a single connection.
    const qrows = await tx.select().from(questions).where(inArray(questions.id, qids));
    const orows = await tx.select({ id: questionOptions.id, questionId: questionOptions.questionId, isCorrect: questionOptions.isCorrect }).from(questionOptions).where(inArray(questionOptions.questionId, qids));
    const arows = await tx.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId));
    const overrides = await tx.select({ questionId: examQuestions.questionId, pointsOverride: examQuestions.pointsOverride }).from(examQuestions).where(eq(examQuestions.examId, attempt.examId));
    const overrideOf = new Map(overrides.map((o) => [o.questionId, o.pointsOverride]));
    const byId = new Map(qrows.map((q) => [q.id, q]));
    const gradable: GradableQuestion[] = qids.flatMap((id) => {
      const q = byId.get(id);
      if (!q) return [];
      return [{
        id,
        type: q.type,
        points: Number(overrideOf.get(id) ?? q.points),
        correctOptionIds: orows.filter((o) => o.questionId === id && o.isCorrect).map((o) => o.id),
        numericAnswer: q.numericAnswer === null ? null : Number(q.numericAnswer),
        numericTolerance: q.numericTolerance === null ? 0 : Number(q.numericTolerance),
      }];
    });
    const answers = new Map<string, SubmittedAnswer>(
      arows.map((a) => [a.questionId, { selectedOptionId: a.selectedOptionId, numericValue: a.numericValue === null ? null : Number(a.numericValue) }]),
    );
    const result = gradeAttempt(gradable, answers, { negativeMarking: Number(exam.negativeMarking), passingPercent: Number(exam.passingPercent) });

    if (result.grades.length) {
      await tx
        .insert(attemptAnswers)
        .values(result.grades.map((g) => ({ attemptId, questionId: g.questionId, isCorrect: g.isCorrect, pointsAwarded: String(g.pointsAwarded) })))
        .onConflictDoUpdate({
          target: [attemptAnswers.attemptId, attemptAnswers.questionId],
          set: { isCorrect: sql`excluded.is_correct`, pointsAwarded: sql`excluded.points_awarded` },
        });
    }

    const expired = now.getTime() > attempt.deadlineAt.getTime();
    const effectiveEnd = Math.min(now.getTime(), attempt.deadlineAt.getTime());
    await tx
      .update(examAttempts)
      .set({
        status: opts.auto || expired ? "auto_submitted" : "submitted",
        submittedAt: now,
        score: String(result.score),
        maxScore: String(result.maxScore),
        percentage: String(result.percentage),
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount + result.partialCount,
        unansweredCount: result.unansweredCount,
        passed: result.passed,
        timeSpentSec: Math.max(0, Math.round((effectiveEnd - attempt.startedAt.getTime()) / 1000)),
        gradedAt: now,
      })
      .where(eq(examAttempts.id, attemptId));

    await touchStreak(tx, attempt.userId, now);
    if (isReleased(exam, now)) {
      await notify({ userId: attempt.userId, type: "result", title: `Nəticə hazırdır: ${exam.title}`, body: `Nəticəniz: ${result.percentage}%.`, href: `/panel/neticelerim/${attemptId}` }, tx);
    }
    return { attemptId, alreadyDone: false as const, result };
  });
}

async function touchStreak(tx: Tx, userId: string, now: Date) {
  const today = bakuDay(now);
  const [p] = await tx.select({ day: studentProfiles.lastActiveOn, streak: studentProfiles.streakDays }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const streak = nextStreak(p?.day ?? null, p?.streak ?? 0, today);
  await tx
    .insert(studentProfiles)
    .values({ userId, streakDays: streak, lastActiveOn: today })
    .onConflictDoUpdate({ target: studentProfiles.userId, set: { streakDays: streak, lastActiveOn: today } });
}

/** Grades every attempt whose deadline has passed (browser closed, laptop lid shut…). Run on a schedule and lazily on page loads. */
export async function finalizeExpiredAttempts(opts: { userId?: string } = {}, now = new Date()): Promise<number> {
  const rows = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(and(eq(examAttempts.status, "in_progress"), lte(examAttempts.deadlineAt, now), opts.userId ? eq(examAttempts.userId, opts.userId) : undefined))
    .limit(500);
  for (const r of rows) await finalizeAttempt(r.id, { auto: true }, now);
  return rows.length;
}

export interface TakingQuestion {
  id: string;
  type: "mcq" | "true_false" | "numeric";
  text: string;
  imageUrl: string | null;
  points: number;
  options: { id: string; text: string }[];
}
export interface TakingState {
  title: string;
  attemptId: string;
  deadlineMs: number;
  serverNowMs: number;
  questions: TakingQuestion[];
  answers: Record<string, { optionId: string | null; numeric: string | null; flagged: boolean }>;
}

/**
 * Payload for the exam screen. Deliberately selects NO answer-key columns (is_correct, numeric_answer,
 * explanation, why_wrong, steps) — correct answers never reach the browser during an attempt.
 */
export async function getAttemptForTaking(userId: string, attemptId: string, now = new Date()): Promise<TakingState | "finished" | null> {
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId))).limit(1);
  if (!attempt) return null;
  if (attempt.status !== "in_progress") return "finished";
  if (attempt.deadlineAt.getTime() <= now.getTime()) {
    await finalizeAttempt(attemptId, { userId, auto: true }, now);
    return "finished";
  }
  const [exam] = await db.select({ title: exams.title }).from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const [qrows, orows, arows, overrides] = await Promise.all([
    db.select({ id: questions.id, type: questions.type, text: questions.text, imageUrl: questions.imageUrl, points: questions.points }).from(questions).where(inArray(questions.id, attempt.questionOrder)),
    db.select({ id: questionOptions.id, text: questionOptions.text }).from(questionOptions).where(inArray(questionOptions.questionId, attempt.questionOrder)),
    db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)),
    db.select({ questionId: examQuestions.questionId, pointsOverride: examQuestions.pointsOverride }).from(examQuestions).where(eq(examQuestions.examId, attempt.examId)),
  ]);
  const q = new Map(qrows.map((x) => [x.id, x]));
  const o = new Map(orows.map((x) => [x.id, x]));
  const po = new Map(overrides.map((x) => [x.questionId, x.pointsOverride]));
  const list: TakingQuestion[] = attempt.questionOrder.flatMap((id) => {
    const row = q.get(id);
    if (!row) return [];
    return [{
      id, type: row.type, text: row.text, imageUrl: row.imageUrl, points: Number(po.get(id) ?? row.points),
      options: (attempt.optionOrder[id] ?? []).flatMap((oid) => (o.get(oid) ? [o.get(oid)!] : [])),
    }];
  });
  return {
    title: exam.title,
    attemptId,
    deadlineMs: attempt.deadlineAt.getTime(),
    serverNowMs: now.getTime(),
    questions: list,
    answers: Object.fromEntries(arows.map((a) => [a.questionId, { optionId: a.selectedOptionId, numeric: a.numericValue === null ? null : String(Number(a.numericValue)), flagged: a.flagged }])),
  };
}
