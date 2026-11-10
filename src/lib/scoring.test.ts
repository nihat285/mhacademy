import { describe, expect, it } from "vitest";
import {
  gradeAttempt,
  gradeFromFraction,
  gradeQuestion,
  type GradableQuestion,
  type SubmittedAnswer,
} from "./scoring";

const mcq = (id: string, correct: string, points = 1): GradableQuestion => ({
  id,
  type: "mcq",
  points,
  correctOptionIds: [correct],
});

const rules = { negativeMarking: 0, passingPercent: 50 };

describe("gradeQuestion", () => {
  it("awards full points for a correct MCQ answer", () => {
    const g = gradeQuestion(mcq("q1", "a", 2), { selectedOptionId: "a" }, 0);
    expect(g).toMatchObject({ status: "correct", pointsAwarded: 2, isCorrect: true });
  });

  it("awards zero for an incorrect answer when negative marking is off", () => {
    const g = gradeQuestion(mcq("q1", "a", 2), { selectedOptionId: "b" }, 0);
    expect(g).toMatchObject({ status: "incorrect", pointsAwarded: 0, isCorrect: false });
  });

  it("deducts a fraction of the points for an incorrect answer with negative marking", () => {
    const g = gradeQuestion(mcq("q1", "a", 4), { selectedOptionId: "b" }, 0.25);
    expect(g.status).toBe("incorrect");
    expect(g.pointsAwarded).toBe(-1);
  });

  it("never penalises unanswered questions", () => {
    const g = gradeQuestion(mcq("q1", "a", 4), undefined, 0.5);
    expect(g).toMatchObject({ status: "unanswered", pointsAwarded: 0, isCorrect: null });
    expect(gradeQuestion(mcq("q1", "a"), { selectedOptionId: null }, 0.5).status).toBe("unanswered");
  });

  it("grades true/false like a single-choice question", () => {
    const q: GradableQuestion = { id: "t", type: "true_false", points: 1, correctOptionIds: ["yes"] };
    expect(gradeQuestion(q, { selectedOptionId: "yes" }, 0).status).toBe("correct");
    expect(gradeQuestion(q, { selectedOptionId: "no" }, 0).status).toBe("incorrect");
  });

  it("grades numeric answers within tolerance", () => {
    const q: GradableQuestion = { id: "n", type: "numeric", points: 3, correctOptionIds: [], numericAnswer: 3.14, numericTolerance: 0.01 };
    expect(gradeQuestion(q, { numericValue: 3.145 }, 0).status).toBe("correct");
    expect(gradeQuestion(q, { numericValue: 3.2 }, 0).status).toBe("incorrect");
    expect(gradeQuestion(q, { numericValue: null }, 0).status).toBe("unanswered");
  });

  it("treats a numeric answer of 0 as answered", () => {
    const q: GradableQuestion = { id: "n", type: "numeric", points: 1, correctOptionIds: [], numericAnswer: 0, numericTolerance: 0 };
    expect(gradeQuestion(q, { numericValue: 0 }, 0).status).toBe("correct");
  });

  it("ignores an option id that is not a correct option", () => {
    expect(gradeQuestion(mcq("q", "a"), { selectedOptionId: "zzz" }, 0).status).toBe("incorrect");
  });
});

describe("gradeFromFraction (partial credit)", () => {
  it("awards proportional points without penalty", () => {
    const g = gradeFromFraction("q", 4, 0.5, 0.25);
    expect(g).toMatchObject({ status: "partial", pointsAwarded: 2, isCorrect: false });
  });
});

describe("gradeAttempt", () => {
  const questions = [mcq("q1", "a", 1), mcq("q2", "b", 1), mcq("q3", "c", 2), mcq("q4", "d", 1)];

  it("counts correct, incorrect and unanswered and computes the percentage", () => {
    const answers = new Map<string, SubmittedAnswer>([
      ["q1", { selectedOptionId: "a" }], // correct
      ["q2", { selectedOptionId: "x" }], // incorrect
      ["q3", { selectedOptionId: "c" }], // correct (2 pts)
      // q4 unanswered
    ]);
    const r = gradeAttempt(questions, answers, rules);
    expect(r).toMatchObject({
      score: 3,
      maxScore: 5,
      percentage: 60,
      correctCount: 2,
      incorrectCount: 1,
      unansweredCount: 1,
      passed: true,
    });
  });

  it("applies negative marking across the attempt", () => {
    const answers = new Map<string, SubmittedAnswer>([
      ["q1", { selectedOptionId: "a" }], // +1
      ["q2", { selectedOptionId: "x" }], // -0.25
      ["q3", { selectedOptionId: "x" }], // -0.5
    ]);
    const r = gradeAttempt(questions, answers, { negativeMarking: 0.25, passingPercent: 50 });
    expect(r.score).toBe(0.25);
    expect(r.percentage).toBe(5);
    expect(r.passed).toBe(false);
  });

  it("never produces a negative total score", () => {
    const answers = new Map<string, SubmittedAnswer>([
      ["q1", { selectedOptionId: "x" }],
      ["q2", { selectedOptionId: "x" }],
    ]);
    const r = gradeAttempt(questions, answers, { negativeMarking: 1, passingPercent: 50 });
    expect(r.score).toBe(0);
    expect(r.percentage).toBe(0);
  });

  it("marks everything unanswered for an empty submission", () => {
    const r = gradeAttempt(questions, new Map(), rules);
    expect(r).toMatchObject({ score: 0, unansweredCount: 4, correctCount: 0, incorrectCount: 0, passed: false });
  });

  it("passes exactly at the passing threshold", () => {
    const answers = new Map<string, SubmittedAnswer>([
      ["q3", { selectedOptionId: "c" }], // 2 of 5 = 40%
    ]);
    expect(gradeAttempt(questions, answers, { negativeMarking: 0, passingPercent: 40 }).passed).toBe(true);
    expect(gradeAttempt(questions, answers, { negativeMarking: 0, passingPercent: 41 }).passed).toBe(false);
  });

  it("handles an exam with no questions without dividing by zero", () => {
    const r = gradeAttempt([], new Map(), rules);
    expect(r).toMatchObject({ maxScore: 0, percentage: 0, score: 0 });
  });
});
