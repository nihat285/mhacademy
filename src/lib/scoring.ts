/**
 * MH Academy scoring engine.
 *
 * Pure functions only (no DB, no I/O) so the exact same logic is used by the server
 * at grading time and by unit tests. The browser never runs this code with answer keys.
 */

export type QuestionType = "mcq" | "true_false" | "numeric";

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  /** Effective points for this exam (override already applied). */
  points: number;
  /** Ids of options that are correct (mcq / true_false). */
  correctOptionIds: string[];
  /** For numeric questions. */
  numericAnswer?: number | null;
  numericTolerance?: number | null;
}

export interface SubmittedAnswer {
  selectedOptionId?: string | null;
  numericValue?: number | null;
}

export type AnswerStatus = "correct" | "partial" | "incorrect" | "unanswered";

export interface QuestionGrade {
  questionId: string;
  status: AnswerStatus;
  /** 0..1 share of the question's points that is earned. */
  fraction: number;
  pointsAwarded: number;
  isCorrect: boolean | null;
}

export interface ScoringRules {
  /** Fraction of the question's points deducted for a wrong answer (0 disables). */
  negativeMarking: number;
  /** Percentage required to pass (0-100). */
  passingPercent: number;
}

export interface AttemptScore {
  grades: QuestionGrade[];
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function isAnswered(a: SubmittedAnswer | undefined | null): boolean {
  if (!a) return false;
  if (a.selectedOptionId) return true;
  return typeof a.numericValue === "number" && Number.isFinite(a.numericValue);
}

/** Share (0..1) of the points earned by an answer; `null` means unanswered. */
export function fractionCorrect(q: GradableQuestion, a: SubmittedAnswer | undefined | null): number | null {
  if (!isAnswered(a)) return null;
  switch (q.type) {
    case "mcq":
    case "true_false":
      return a!.selectedOptionId && q.correctOptionIds.includes(a!.selectedOptionId) ? 1 : 0;
    case "numeric": {
      if (typeof a!.numericValue !== "number" || q.numericAnswer == null) return 0;
      const tol = Math.abs(q.numericTolerance ?? 0);
      return Math.abs(a!.numericValue - q.numericAnswer) <= tol + 1e-9 ? 1 : 0;
    }
    default:
      return 0;
  }
}

/**
 * Converts a fraction into points and a status.
 * - unanswered (null): 0 points, never penalised
 * - fraction 1: full points
 * - 0 < fraction < 1: proportional points, no penalty (partial credit)
 * - fraction 0: 0 points, minus `negativeMarking * points`
 */
export function gradeFromFraction(
  questionId: string,
  points: number,
  fraction: number | null,
  negativeMarking: number,
): QuestionGrade {
  if (fraction === null) {
    return { questionId, status: "unanswered", fraction: 0, pointsAwarded: 0, isCorrect: null };
  }
  if (fraction >= 1) {
    return { questionId, status: "correct", fraction: 1, pointsAwarded: round2(points), isCorrect: true };
  }
  if (fraction > 0) {
    return { questionId, status: "partial", fraction, pointsAwarded: round2(points * fraction), isCorrect: false };
  }
  const penalty = Math.max(0, negativeMarking) * points;
  return { questionId, status: "incorrect", fraction: 0, pointsAwarded: round2(-penalty), isCorrect: false };
}

export function gradeQuestion(
  q: GradableQuestion,
  a: SubmittedAnswer | undefined | null,
  negativeMarking: number,
): QuestionGrade {
  return gradeFromFraction(q.id, q.points, fractionCorrect(q, a), negativeMarking);
}

/** Grades a whole attempt. The total never drops below zero. */
export function gradeAttempt(
  questions: GradableQuestion[],
  answers: Map<string, SubmittedAnswer>,
  rules: ScoringRules,
): AttemptScore {
  const grades = questions.map((q) => gradeQuestion(q, answers.get(q.id), rules.negativeMarking));
  const maxScore = round2(questions.reduce((s, q) => s + q.points, 0));
  const raw = grades.reduce((s, g) => s + g.pointsAwarded, 0);
  const score = Math.max(0, round2(raw));
  const percentage = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const count = (s: AnswerStatus) => grades.filter((g) => g.status === s).length;
  return {
    grades,
    score,
    maxScore,
    percentage,
    correctCount: count("correct"),
    partialCount: count("partial"),
    incorrectCount: count("incorrect"),
    unansweredCount: count("unanswered"),
    passed: percentage + 1e-9 >= rules.passingPercent,
  };
}
