"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lessons, practiceAnswers, questionOptions, questions } from "@/db/schema";
import { AuthError, assertRole } from "@/lib/auth";
import { getActiveMistakes } from "@/lib/queries/mistakes";
import { rateLimit } from "@/lib/rate-limit";
import { fractionCorrect, type GradableQuestion } from "@/lib/scoring";

export interface PracticeResult {
  ok: boolean;
  error?: string;
  isCorrect?: boolean;
  correctOptionIds?: string[];
  correctNumeric?: number | null;
  whyWrong?: string | null;
  explanation?: string | null;
  steps?: string[] | null;
  concept?: string | null;
  lesson?: { slug: string; title: string } | null;
}

const input = z.object({
  questionId: z.uuid(),
  optionId: z.uuid().optional(),
  numeric: z.number().finite().optional(),
});

/**
 * Checks one practice answer. The answer key is only returned AFTER the answer is stored, and only for
 * questions that are in the student's own mistake list (so this cannot be used to peek at arbitrary questions).
 */
export async function checkPracticeAnswer(raw: { questionId: string; optionId?: string; numeric?: number }): Promise<PracticeResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Etibarsız cavab." };
  let userId: string;
  try {
    userId = (await assertRole(["student"])).id;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat yalnız şagirdlər üçündür." };
    throw e;
  }
  if (!(await rateLimit(`practice:${userId}`, 300, 3600)).ok) return { ok: false, error: "Çox sayda cavab. Bir az sonra yenidən cəhd edin." };

  const { questionId, optionId, numeric } = parsed.data;
  if (optionId === undefined && numeric === undefined) return { ok: false, error: "Cavab seçin." };

  const mistakes = await getActiveMistakes(userId);
  if (!mistakes.some((m) => m.questionId === questionId)) return { ok: false, error: "Bu sual təkrar siyahınızda deyil." };

  const [q] = await db
    .select({
      id: questions.id,
      type: questions.type,
      points: questions.points,
      numericAnswer: questions.numericAnswer,
      numericTolerance: questions.numericTolerance,
      explanation: questions.explanation,
      steps: questions.steps,
      concept: questions.concept,
      lessonSlug: lessons.slug,
      lessonTitle: lessons.title,
    })
    .from(questions)
    .leftJoin(lessons, and(eq(lessons.id, questions.relatedLessonId), eq(lessons.published, true)))
    .where(eq(questions.id, questionId))
    .limit(1);
  if (!q) return { ok: false, error: "Sual tapılmadı." };
  const opts = await db
    .select({ id: questionOptions.id, isCorrect: questionOptions.isCorrect, whyWrong: questionOptions.whyWrong })
    .from(questionOptions)
    .where(eq(questionOptions.questionId, questionId));

  if (q.type !== "numeric" && optionId !== undefined && !opts.some((o) => o.id === optionId)) return { ok: false, error: "Etibarsız variant." };

  const gradable: GradableQuestion = {
    id: q.id,
    type: q.type as GradableQuestion["type"],
    points: Number(q.points),
    correctOptionIds: opts.filter((o) => o.isCorrect).map((o) => o.id),
    numericAnswer: q.numericAnswer === null ? null : Number(q.numericAnswer),
    numericTolerance: q.numericTolerance === null ? 0 : Number(q.numericTolerance),
  };
  const fraction = fractionCorrect(gradable, q.type === "numeric" ? { numericValue: numeric ?? null } : { selectedOptionId: optionId ?? null });
  if (fraction === null) return { ok: false, error: "Cavab seçin." };
  const isCorrect = fraction >= 1;

  await db.insert(practiceAnswers).values({
    userId,
    questionId,
    selectedOptionId: q.type === "numeric" ? null : (optionId ?? null),
    numericValue: q.type === "numeric" && numeric !== undefined ? String(numeric) : null,
    isCorrect,
  });

  const chosen = opts.find((o) => o.id === optionId);
  return {
    ok: true,
    isCorrect,
    correctOptionIds: gradable.correctOptionIds,
    correctNumeric: gradable.numericAnswer ?? null,
    whyWrong: !isCorrect ? (chosen?.whyWrong ?? null) : null,
    explanation: q.explanation,
    steps: q.steps,
    concept: q.concept,
    lesson: q.lessonSlug && q.lessonTitle ? { slug: q.lessonSlug, title: q.lessonTitle } : null,
  };
}
