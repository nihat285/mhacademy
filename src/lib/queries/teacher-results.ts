import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { attemptAnswers, classMembers, examAttempts, examQuestions, exams, questions, subjects, users } from "@/db/schema";
import type { Role } from "@/lib/permissions";
import { listClasses, ownerFilter } from "./teacher";

type U = { id: string; role: Role };

/** One row per exam the teacher owns (admins: every exam), with result statistics over submitted attempts. */
export async function listExamResultSummaries(u: U) {
  const rows = await db
    .select({
      id: exams.id,
      title: exams.title,
      subject: subjects.name,
      startsAt: exams.startsAt,
      status: exams.status,
      submitted: sql<number>`count(${examAttempts.id}) filter (where ${examAttempts.status} <> 'in_progress')::int`,
      inProgress: sql<number>`count(${examAttempts.id}) filter (where ${examAttempts.status} = 'in_progress')::int`,
      students: sql<number>`count(distinct ${examAttempts.userId})::int`,
      avg: sql<string | null>`avg(${examAttempts.percentage}) filter (where ${examAttempts.status} <> 'in_progress')`,
      passed: sql<number>`count(${examAttempts.id}) filter (where ${examAttempts.passed} = true)::int`,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .leftJoin(examAttempts, eq(examAttempts.examId, exams.id))
    .where(ownerFilter(u, exams.createdBy))
    .groupBy(exams.id, subjects.name)
    .orderBy(desc(exams.startsAt));
  return rows.map((r) => ({ ...r, avg: r.avg === null ? null : Number(r.avg) }));
}

/**
 * Full result view of one exam. `classId` narrows it to the members of one of the teacher's own classes.
 * Returns null when the exam does not exist or is not the teacher's.
 */
export async function getExamResults(u: U, examId: string, classId?: string) {
  const [exam] = await db
    .select({ id: exams.id, title: exams.title, passingPercent: exams.passingPercent, subject: subjects.name })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(exams.id, examId), ownerFilter(u, exams.createdBy)))
    .limit(1);
  if (!exam) return null;

  const classes = await listClasses(u);
  const activeClass = classId ? classes.find((c) => c.id === classId) : undefined;
  const inClass: SQL | undefined = activeClass
    ? inArray(examAttempts.userId, db.select({ id: classMembers.studentId }).from(classMembers).where(eq(classMembers.classId, activeClass.id)))
    : undefined;

  const attempts = await db
    .select({
      id: examAttempts.id,
      studentId: users.id,
      student: users.name,
      email: users.email,
      attemptNo: examAttempts.attemptNo,
      status: examAttempts.status,
      score: examAttempts.score,
      maxScore: examAttempts.maxScore,
      percentage: examAttempts.percentage,
      correct: examAttempts.correctCount,
      incorrect: examAttempts.incorrectCount,
      unanswered: examAttempts.unansweredCount,
      passed: examAttempts.passed,
      timeSpentSec: examAttempts.timeSpentSec,
      submittedAt: examAttempts.submittedAt,
      startedAt: examAttempts.startedAt,
    })
    .from(examAttempts)
    .innerJoin(users, eq(users.id, examAttempts.userId))
    .where(and(eq(examAttempts.examId, examId), inClass))
    .orderBy(asc(users.name), asc(examAttempts.attemptNo));

  const done = attempts.filter((a) => a.status !== "in_progress" && a.percentage !== null);
  const pct = done.map((a) => Number(a.percentage));
  const stats = {
    attempts: done.length,
    students: new Set(done.map((a) => a.studentId)).size,
    inProgress: attempts.length - done.length,
    avg: pct.length ? pct.reduce((s, n) => s + n, 0) / pct.length : null,
    max: pct.length ? Math.max(...pct) : null,
    min: pct.length ? Math.min(...pct) : null,
    passRate: done.length ? (done.filter((a) => a.passed).length / done.length) * 100 : null,
  };

  // Per-question analysis over the same set of submitted attempts.
  const doneIds = done.map((a) => a.id);
  let questionStats: { id: string; text: string; position: number; correct: number; wrong: number; total: number }[] = [];
  if (doneIds.length > 0) {
    const qs = await db
      .select({
        id: questions.id,
        text: questions.text,
        position: examQuestions.orderIndex,
        correct: sql<number>`count(${attemptAnswers.attemptId}) filter (where ${attemptAnswers.isCorrect} = true)::int`,
        wrong: sql<number>`count(${attemptAnswers.attemptId}) filter (where ${attemptAnswers.isCorrect} = false)::int`,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(questions.id, examQuestions.questionId))
      .leftJoin(attemptAnswers, and(eq(attemptAnswers.questionId, examQuestions.questionId), inArray(attemptAnswers.attemptId, doneIds)))
      .where(eq(examQuestions.examId, examId))
      .groupBy(questions.id, examQuestions.orderIndex)
      .orderBy(asc(examQuestions.orderIndex));
    questionStats = qs.map((q) => ({ ...q, total: doneIds.length }));
  }

  return { exam, classes, activeClass: activeClass ?? null, attempts, stats, questionStats };
}
