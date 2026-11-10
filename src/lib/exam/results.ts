import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { attemptAnswers, examAttempts, exams, lessons, questionOptions, questions, subjects, topics } from "@/db/schema";
import { isReleased } from "./release";

export interface ReviewOption { id: string; text: string; chosen: boolean; correct: boolean; whyWrong: string | null }
export interface ReviewItem {
  n: number;
  questionId: string;
  status: "correct" | "partial" | "incorrect" | "unanswered";
  text: string;
  imageUrl: string | null;
  type: "mcq" | "true_false" | "numeric";
  points: number;
  pointsAwarded: number;
  difficulty: "easy" | "medium" | "hard";
  topic: string | null;
  subject: string;
  concept: string | null;
  chosenText: string | null;
  /** Everything below is null unless the exam allows answer review AND results are released. */
  options: ReviewOption[] | null;
  correctText: string | null;
  explanation: string | null;
  steps: string[] | null;
  whyWrong: string | null;
  lesson: { slug: string; title: string } | null;
}
export interface Breakdown { name: string; correct: number; total: number; percent: number }

export type AttemptResult =
  | { state: "pending"; exam: { id: string; title: string; slug: string; endsAt: Date; resultRelease: string }; submittedAt: Date | null; auto: boolean }
  | {
      state: "released";
      attempt: typeof examAttempts.$inferSelect;
      exam: typeof exams.$inferSelect & { subjectName: string };
      review: ReviewItem[];
      reviewAllowed: boolean;
      byTopic: Breakdown[];
      byDifficulty: Breakdown[];
      history: { id: string; no: number; percentage: number; submittedAt: Date | null; current: boolean }[];
      lessons: { slug: string; title: string; reason: string }[];
    };

const pct = (c: number, t: number) => (t ? Math.round((c / t) * 1000) / 10 : 0);

function tally(items: ReviewItem[], key: (i: ReviewItem) => string): Breakdown[] {
  const m = new Map<string, { c: number; t: number }>();
  for (const i of items) {
    const k = key(i);
    const e = m.get(k) ?? { c: 0, t: 0 };
    e.t += 1;
    if (i.status === "correct") e.c += 1;
    m.set(k, e);
  }
  return [...m].map(([name, { c, t }]) => ({ name, correct: c, total: t, percent: pct(c, t) })).sort((a, b) => a.percent - b.percent);
}

export async function getAttemptResult(userId: string, attemptId: string, now = new Date()): Promise<AttemptResult | null> {
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId))).limit(1);
  if (!attempt || attempt.status === "in_progress") return null;
  const [exam] = await db.select({ e: exams, subjectName: subjects.name }).from(exams).innerJoin(subjects, eq(subjects.id, exams.subjectId)).where(eq(exams.id, attempt.examId)).limit(1);

  if (!isReleased(exam.e, now)) {
    return { state: "pending", exam: { id: exam.e.id, title: exam.e.title, slug: exam.e.slug, endsAt: exam.e.endsAt, resultRelease: exam.e.resultRelease }, submittedAt: attempt.submittedAt, auto: attempt.status === "auto_submitted" };
  }

  const reviewAllowed = exam.e.showExplanations;
  const qids = attempt.questionOrder;
  const [qrows, answers, opts] = await Promise.all([
    db
      .select({ q: questions, topicName: topics.name, subjectName: subjects.name })
      .from(questions)
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .leftJoin(topics, eq(topics.id, questions.topicId))
      .where(inArray(questions.id, qids)),
    db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)),
    db.select().from(questionOptions).where(inArray(questionOptions.questionId, qids)).orderBy(asc(questionOptions.orderIndex)),
  ]);
  const qm = new Map(qrows.map((r) => [r.q.id, r]));
  const am = new Map(answers.map((a) => [a.questionId, a]));

  // Related lessons are looked up once for all questions.
  const lessonIds = [...new Set(qrows.map((r) => r.q.relatedLessonId).filter((x): x is string => !!x))];
  const topicIds = [...new Set(qrows.map((r) => r.q.topicId).filter((x): x is string => !!x))];
  const lessonRows = lessonIds.length || topicIds.length
    ? await db.select({ id: lessons.id, slug: lessons.slug, title: lessons.title, topicId: lessons.topicId }).from(lessons).where(and(eq(lessons.published, true), inArray(lessons.id, lessonIds.length ? lessonIds : ["00000000-0000-0000-0000-000000000000"])))
    : [];
  const topicLessons = topicIds.length
    ? await db.select({ id: lessons.id, slug: lessons.slug, title: lessons.title, topicId: lessons.topicId }).from(lessons).where(and(eq(lessons.published, true), inArray(lessons.topicId, topicIds))).orderBy(asc(lessons.orderIndex))
    : [];
  const lessonById = new Map(lessonRows.map((l) => [l.id, l]));

  const review: ReviewItem[] = qids.flatMap((id, i) => {
    const r = qm.get(id);
    if (!r) return [];
    const a = am.get(id);
    const answered = !!a && (a.selectedOptionId !== null || a.numericValue !== null);
    const awarded = Number(a?.pointsAwarded ?? 0);
    const status: ReviewItem["status"] = !answered ? "unanswered" : a!.isCorrect ? "correct" : awarded > 0 ? "partial" : "incorrect";
    const qopts = opts.filter((o) => o.questionId === id);
    const optionById = new Map(qopts.map((o) => [o.id, o]));
    const order = attempt.optionOrder[id] ?? qopts.map((o) => o.id);
    const chosen = a?.selectedOptionId ? optionById.get(a.selectedOptionId) : undefined;
    const lesson = (r.q.relatedLessonId && lessonById.get(r.q.relatedLessonId)) || topicLessons.find((l) => l.topicId === r.q.topicId) || null;
    const numericChosen = a?.numericValue != null ? String(Number(a.numericValue)) : null;
    return [{
      n: i + 1, questionId: id, status, text: r.q.text, imageUrl: r.q.imageUrl, type: r.q.type, points: Number(r.q.points), pointsAwarded: awarded,
      difficulty: r.q.difficulty, topic: r.topicName, subject: r.subjectName, concept: r.q.concept,
      chosenText: chosen?.text ?? numericChosen,
      // Answer-key material is attached ONLY when the exam permits review.
      options: reviewAllowed ? order.flatMap((oid) => { const o = optionById.get(oid); return o ? [{ id: o.id, text: o.text, chosen: o.id === a?.selectedOptionId, correct: o.isCorrect, whyWrong: o.whyWrong }] : []; }) : null,
      correctText: reviewAllowed ? (r.q.type === "numeric" ? (r.q.numericAnswer !== null ? String(Number(r.q.numericAnswer)) : null) : qopts.filter((o) => o.isCorrect).map((o) => o.text).join("; ") || null) : null,
      explanation: reviewAllowed ? r.q.explanation : null,
      steps: reviewAllowed ? r.q.steps : null,
      whyWrong: reviewAllowed && status !== "correct" && chosen ? chosen.whyWrong : null,
      lesson: lesson ? { slug: lesson.slug, title: lesson.title } : null,
    }];
  });

  const history = await db
    .select({ id: examAttempts.id, no: examAttempts.attemptNo, percentage: examAttempts.percentage, submittedAt: examAttempts.submittedAt })
    .from(examAttempts)
    .where(and(eq(examAttempts.examId, attempt.examId), eq(examAttempts.userId, userId), ne(examAttempts.status, "in_progress"), isNotNull(examAttempts.percentage)))
    .orderBy(asc(examAttempts.attemptNo));

  // Recommended lessons: from questions that were wrong or skipped, de-duplicated, weakest topics first.
  const missed = review.filter((r) => r.status !== "correct");
  const seen = new Set<string>();
  const recs: { slug: string; title: string; reason: string }[] = [];
  for (const m of missed) {
    if (m.lesson && !seen.has(m.lesson.slug)) {
      seen.add(m.lesson.slug);
      recs.push({ ...m.lesson, reason: m.topic ? `Mövzu: ${m.topic}` : `Fənn: ${m.subject}` });
    }
  }

  return {
    state: "released",
    attempt,
    exam: { ...exam.e, subjectName: exam.subjectName },
    review,
    reviewAllowed,
    byTopic: tally(review, (r) => r.topic ?? r.subject),
    byDifficulty: tally(review, (r) => r.difficulty),
    history: history.map((h) => ({ id: h.id, no: h.no, percentage: Number(h.percentage), submittedAt: h.submittedAt, current: h.id === attemptId })),
    lessons: recs.slice(0, 6),
  };
}

export async function listMyAttempts(userId: string) {
  return db
    .select({
      id: examAttempts.id, no: examAttempts.attemptNo, status: examAttempts.status, submittedAt: examAttempts.submittedAt, percentage: examAttempts.percentage,
      correct: examAttempts.correctCount, incorrect: examAttempts.incorrectCount, unanswered: examAttempts.unansweredCount, passed: examAttempts.passed, timeSpentSec: examAttempts.timeSpentSec,
      title: exams.title, subject: subjects.name, resultRelease: exams.resultRelease, endsAt: exams.endsAt, resultsReleasedAt: exams.resultsReleasedAt,
    })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(examAttempts.userId, userId), ne(examAttempts.status, "in_progress")))
    .orderBy(desc(examAttempts.submittedAt));
}
