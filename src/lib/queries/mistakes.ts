import { and, asc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { lessons, questionOptions, questions, subjects, topics } from "@/db/schema";

/**
 * A student's "active mistakes": questions whose MOST RECENT answer was wrong.
 * Sources: graded exam attempts whose results are released, and practice answers.
 * Answering a question correctly in practice removes it from the list.
 */
export interface MistakeRef {
  questionId: string;
  subjectId: string;
  subjectSlug: string;
  subjectName: string;
  at: Date;
  source: "exam" | "practice";
  selectedOptionId: string | null;
  numericValue: number | null;
  /** Exam explanations can be switched off by the exam; practice always shows them. */
  showExplanations: boolean;
  examTitle: string | null;
}

export async function getActiveMistakes(userId: string): Promise<MistakeRef[]> {
  const res = await db.execute(sql`
    with events as (
      select aa.question_id, aa.selected_option_id, aa.numeric_value, aa.is_correct,
             coalesce(ea.submitted_at, ea.deadline_at) as at, 'exam'::text as source,
             e.show_explanations, e.title as exam_title
      from attempt_answers aa
      join exam_attempts ea on ea.id = aa.attempt_id
      join exams e on e.id = ea.exam_id
      where ea.user_id = ${userId}
        and ea.status <> 'in_progress'
        and aa.is_correct is not null
        and (e.result_release = 'immediate' or e.results_released_at is not null)
      union all
      select pa.question_id, pa.selected_option_id, pa.numeric_value, pa.is_correct,
             pa.created_at, 'practice'::text, true, null
      from practice_answers pa
      where pa.user_id = ${userId}
    ), latest as (
      select distinct on (question_id) * from events order by question_id, at desc
    )
    select l.question_id as "questionId", s.id as "subjectId", s.slug as "subjectSlug", s.name as "subjectName",
           l.at as "at", l.source as "source", l.selected_option_id as "selectedOptionId",
           l.numeric_value as "numericValue", l.show_explanations as "showExplanations", l.exam_title as "examTitle"
    from latest l
    join questions q on q.id = l.question_id
    join subjects s on s.id = q.subject_id
    where l.is_correct = false
    order by l.at desc
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    questionId: r.questionId as string,
    subjectId: r.subjectId as string,
    subjectSlug: r.subjectSlug as string,
    subjectName: r.subjectName as string,
    at: new Date(r.at as string),
    source: r.source as "exam" | "practice",
    selectedOptionId: (r.selectedOptionId as string | null) ?? null,
    numericValue: r.numericValue === null || r.numericValue === undefined ? null : Number(r.numericValue),
    showExplanations: Boolean(r.showExplanations),
    examTitle: (r.examTitle as string | null) ?? null,
  }));
}

/** Full review details (with the answer key) for questions that are already in the student's mistake list. */
export async function getMistakeDetails(ids: string[]) {
  if (ids.length === 0) return new Map<string, MistakeDetail>();
  const [qs, opts] = await Promise.all([
    db
      .select({
        id: questions.id,
        type: questions.type,
        difficulty: questions.difficulty,
        text: questions.text,
        imageUrl: questions.imageUrl,
        explanation: questions.explanation,
        steps: questions.steps,
        concept: questions.concept,
        numericAnswer: questions.numericAnswer,
        topicName: topics.name,
        lessonSlug: lessons.slug,
        lessonTitle: lessons.title,
      })
      .from(questions)
      .leftJoin(topics, eq(topics.id, questions.topicId))
      .leftJoin(lessons, and(eq(lessons.id, questions.relatedLessonId), eq(lessons.published, true)))
      .where(inArray(questions.id, ids)),
    db
      .select({ id: questionOptions.id, questionId: questionOptions.questionId, text: questionOptions.text, isCorrect: questionOptions.isCorrect, whyWrong: questionOptions.whyWrong })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, ids))
      .orderBy(asc(questionOptions.orderIndex)),
  ]);
  const out = new Map<string, MistakeDetail>();
  for (const q of qs) {
    out.set(q.id, {
      ...q,
      numericAnswer: q.numericAnswer === null ? null : Number(q.numericAnswer),
      options: opts.filter((o) => o.questionId === q.id),
    });
  }
  return out;
}

export interface MistakeDetail {
  id: string;
  type: "mcq" | "true_false" | "numeric";
  difficulty: "easy" | "medium" | "hard";
  text: string;
  imageUrl: string | null;
  explanation: string | null;
  steps: string[] | null;
  concept: string | null;
  numericAnswer: number | null;
  topicName: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  options: { id: string; questionId: string; text: string; isCorrect: boolean; whyWrong: string | null }[];
}

/** Question text + options WITHOUT any answer key, safe to send to the browser for a practice session. */
export async function getPracticeQuestions(ids: string[]) {
  if (ids.length === 0) return [];
  const [qs, opts] = await Promise.all([
    db
      .select({ id: questions.id, type: questions.type, text: questions.text, imageUrl: questions.imageUrl, subjectName: subjects.name, topicName: topics.name })
      .from(questions)
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .leftJoin(topics, eq(topics.id, questions.topicId))
      .where(inArray(questions.id, ids)),
    db
      .select({ id: questionOptions.id, questionId: questionOptions.questionId, text: questionOptions.text })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, ids)),
  ]);
  const shuffle = <T,>(a: T[]) => {
    const x = [...a];
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  };
  return shuffle(
    qs.map((q) => ({
      id: q.id,
      type: q.type as "mcq" | "true_false" | "numeric",
      text: q.text,
      imageUrl: q.imageUrl,
      subjectName: q.subjectName,
      topicName: q.topicName,
      options: shuffle(opts.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, text: o.text }))),
    })),
  );
}

/** Random sample of `n` question ids from a mistake list (Fisher–Yates). */
export function sampleMistakeIds(pool: MistakeRef[], n: number): string[] {
  const a = pool.map((m) => m.questionId);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
