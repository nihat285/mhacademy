import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { attemptAnswers, examAttempts, exams, lessons, questions, subjects, topics } from "@/db/schema";
import { isReleased, type ResultRelease } from "@/lib/exam/release";

/** One finished attempt, as stored. Only attempts whose result the exam has RELEASED may count (no early score leaks). */
export interface AttemptRow {
  id: string;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  subject: string;
  submittedAt: Date;
  release: { resultRelease: ResultRelease; endsAt: Date; resultsReleasedAt: Date | null };
}
export interface TopicRow { topicId: string; topic: string; subject: string; total: number; wrong: number; lessonSlug: string | null }

export interface StudentStats {
  attempts: number;
  trend: { label: string; score: number }[];
  accuracy: { correct: number; incorrect: number; unanswered: number };
  subjects: { name: string; value: number }[];
  weakTopics: { topicId: string; name: string; subject: string; accuracy: number; wrong: number; lessonSlug: string | null }[];
}

export const TREND_POINTS = 8;
export const MIN_ANSWERS_PER_TOPIC = 3;

const dayLabel = (d: Date) => new Intl.DateTimeFormat("az", { timeZone: "Asia/Baku", day: "numeric", month: "short" }).format(d);
const short = (s: string, n = 10) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Pure aggregation (no DB): everything on the panel is derived from saved, released attempts. */
export function buildStats(attemptRows: AttemptRow[], topicRows: TopicRow[], now = new Date()): StudentStats {
  const rows = attemptRows.filter((a) => isReleased(a.release, now)).sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

  const bySubject = new Map<string, number[]>();
  for (const a of rows) bySubject.set(a.subject, [...(bySubject.get(a.subject) ?? []), a.percentage]);

  const weak = topicRows
    .filter((t) => t.total >= MIN_ANSWERS_PER_TOPIC && t.wrong > 0)
    .map((t) => ({ topicId: t.topicId, name: t.topic, subject: t.subject, accuracy: Math.round(((t.total - t.wrong) / t.total) * 100), wrong: t.wrong, lessonSlug: t.lessonSlug }))
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong)
    .slice(0, 3);

  return {
    attempts: rows.length,
    trend: rows.slice(-TREND_POINTS).map((a) => ({ label: dayLabel(a.submittedAt), score: Math.round(a.percentage) })),
    accuracy: rows.reduce((s, a) => ({ correct: s.correct + a.correct, incorrect: s.incorrect + a.incorrect, unanswered: s.unanswered + a.unanswered }), { correct: 0, incorrect: 0, unanswered: 0 }),
    subjects: [...bySubject.entries()]
      .map(([name, v]) => ({ name: short(name), value: Math.round(v.reduce((x, y) => x + y, 0) / v.length) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    weakTopics: weak,
  };
}

/** Loads the signed-in student's own finished attempts and topic outcomes, then aggregates. */
export async function getStudentStats(userId: string, now = new Date()): Promise<StudentStats> {
  const raw = await db
    .select({
      id: examAttempts.id, percentage: examAttempts.percentage, correct: examAttempts.correctCount, incorrect: examAttempts.incorrectCount,
      unanswered: examAttempts.unansweredCount, subject: subjects.name, submittedAt: examAttempts.submittedAt,
      resultRelease: exams.resultRelease, endsAt: exams.endsAt, resultsReleasedAt: exams.resultsReleasedAt,
    })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(examAttempts.userId, userId), ne(examAttempts.status, "in_progress"), isNotNull(examAttempts.gradedAt), isNotNull(examAttempts.percentage), isNotNull(examAttempts.submittedAt)))
    .orderBy(desc(examAttempts.submittedAt))
    .limit(500);

  const attempts: AttemptRow[] = raw.map((r) => ({
    id: r.id, percentage: Number(r.percentage), correct: r.correct ?? 0, incorrect: r.incorrect ?? 0, unanswered: r.unanswered ?? 0, subject: r.subject, submittedAt: r.submittedAt!,
    release: { resultRelease: r.resultRelease, endsAt: r.endsAt, resultsReleasedAt: r.resultsReleasedAt },
  }));
  const releasedIds = attempts.filter((a) => isReleased(a.release, now)).map((a) => a.id);
  if (releasedIds.length === 0) return buildStats([], [], now);

  const perQuestion = await db
    .select({ topicId: questions.topicId, isCorrect: attemptAnswers.isCorrect })
    .from(attemptAnswers)
    .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
    .where(and(inArray(attemptAnswers.attemptId, releasedIds), isNotNull(questions.topicId), isNotNull(attemptAnswers.isCorrect)));
  const agg = new Map<string, { total: number; wrong: number }>();
  for (const r of perQuestion) {
    const a = agg.get(r.topicId!) ?? { total: 0, wrong: 0 };
    a.total++;
    if (!r.isCorrect) a.wrong++;
    agg.set(r.topicId!, a);
  }
  const ids = [...agg.keys()];
  const names = ids.length
    ? await db.select({ id: topics.id, name: topics.name, subject: subjects.name }).from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId)).where(inArray(topics.id, ids))
    : [];
  const lessonRows = ids.length
    ? await db.select({ topicId: lessons.topicId, slug: lessons.slug }).from(lessons).where(and(inArray(lessons.topicId, ids), eq(lessons.published, true))).orderBy(asc(lessons.orderIndex))
    : [];
  const firstLesson = new Map<string, string>();
  for (const l of lessonRows) if (l.topicId && !firstLesson.has(l.topicId)) firstLesson.set(l.topicId, l.slug);

  const topicRows: TopicRow[] = names.map((n) => ({ topicId: n.id, topic: n.name, subject: n.subject, total: agg.get(n.id)!.total, wrong: agg.get(n.id)!.wrong, lessonSlug: firstLesson.get(n.id) ?? null }));
  return buildStats(attempts, topicRows, now);
}
