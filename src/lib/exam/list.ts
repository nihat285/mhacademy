import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classMembers, examAssignments, examAttempts, examRegistrations, exams, subjects } from "@/db/schema";
import { examPhase, type ExamPhase } from "@/lib/exam-phase";
import { isReleased } from "./release";

export interface StudentExam {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  subjectName: string;
  difficulty: "easy" | "medium" | "hard";
  startsAt: Date;
  endsAt: Date;
  durationMin: number;
  attemptLimit: number;
  questionCount: number;
  phase: ExamPhase;
  assigned: boolean;
  registered: boolean;
  attemptsUsed: number;
  openAttempt: { id: string; deadlineAt: Date } | null;
  lastAttempt: { id: string; percentage: number | null; released: boolean } | null;
}

/** Exams a student may see: published public exams plus those assigned to them (directly or through a class). */
export async function listExamsForStudent(userId: string, now = new Date()): Promise<StudentExam[]> {
  const myClasses = db.select({ id: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, userId));
  const [assigned, registrations, attempts] = await Promise.all([
    db.select({ examId: examAssignments.examId }).from(examAssignments).where(or(eq(examAssignments.studentId, userId), inArray(examAssignments.classId, myClasses))),
    db.select({ examId: examRegistrations.examId }).from(examRegistrations).where(eq(examRegistrations.userId, userId)),
    db.select().from(examAttempts).where(eq(examAttempts.userId, userId)),
  ]);
  const assignedIds = new Set(assigned.map((a) => a.examId));
  const registeredIds = new Set(registrations.map((r) => r.examId));

  const rows = await db
    .select({
      e: exams,
      subjectName: subjects.name,
      questionCount: sql<number>`(select count(*)::int from exam_questions eq where eq.exam_id = ${exams.id})`,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(exams.status, "published")));

  return rows
    .filter(({ e }) => e.visibility === "public" || assignedIds.has(e.id))
    .map(({ e, subjectName, questionCount }) => {
      const mine = attempts.filter((a) => a.examId === e.id).sort((a, b) => b.attemptNo - a.attemptNo);
      const open = mine.find((a) => a.status === "in_progress" && a.deadlineAt > now);
      const last = mine.find((a) => a.status !== "in_progress");
      return {
        id: e.id, slug: e.slug, title: e.title, description: e.description, subjectName, difficulty: e.difficulty,
        startsAt: e.startsAt, endsAt: e.endsAt, durationMin: e.durationMin, attemptLimit: e.attemptLimit, questionCount,
        phase: examPhase(e, now), assigned: assignedIds.has(e.id), registered: registeredIds.has(e.id), attemptsUsed: mine.length,
        openAttempt: open ? { id: open.id, deadlineAt: open.deadlineAt } : null,
        lastAttempt: last ? { id: last.id, percentage: last.percentage === null ? null : Number(last.percentage), released: isReleased(e, now) } : null,
      };
    });
}
