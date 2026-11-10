import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { attemptAnswers, examAttempts, examQuestions, exams, notifications, questionOptions, questions, subjects, users } from "@/db/schema";
import { ExamError, finalizeAttempt, finalizeExpiredAttempts, getAttemptForTaking, saveAnswer, startAttempt } from "@/lib/exam/engine";

const tag = `it-${Date.now()}`;
let studentId: string, otherId: string, examId: string, subjectId: string;
const qids: string[] = [];
const correct: Record<string, string> = {};
const wrong: Record<string, string> = {};
const created = { users: [] as string[] };

async function makeExam(opts: Partial<typeof exams.$inferInsert> = {}) {
  const [e] = await db.insert(exams).values({
    slug: `${tag}-${Math.random().toString(36).slice(2, 8)}`, title: "Test sınağı", subjectId, status: "published", visibility: "public",
    startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 3600_000), durationMin: 30, attemptLimit: 2,
    passingPercent: "50", negativeMarking: "0", ...opts,
  }).returning();
  await db.insert(examQuestions).values(qids.map((q, i) => ({ examId: e.id, questionId: q, orderIndex: i })));
  return e.id;
}

beforeAll(async () => {
  const [s] = await db.select({ id: subjects.id }).from(subjects).limit(1);
  subjectId = s.id;
  const mk = async (n: string) => {
    const [u] = await db.insert(users).values({ email: `${tag}-${n}@test.local`, name: `Test ${n}`, passwordHash: "x", role: "student" }).returning({ id: users.id });
    created.users.push(u.id);
    return u.id;
  };
  studentId = await mk("a");
  otherId = await mk("b");
  for (let i = 0; i < 3; i++) {
    const [q] = await db.insert(questions).values({ subjectId, text: `Sual ${i}`, explanation: "SECRET-EXPLANATION", points: "2", difficulty: "easy" }).returning({ id: questions.id });
    qids.push(q.id);
    const opts = await db.insert(questionOptions).values([
      { questionId: q.id, text: "Düz", isCorrect: true, orderIndex: 0, whyWrong: null },
      { questionId: q.id, text: "Səhv", isCorrect: false, orderIndex: 1, whyWrong: "SECRET-WHYWRONG" },
    ]).returning();
    correct[q.id] = opts[0].id;
    wrong[q.id] = opts[1].id;
  }
  examId = await makeExam();
});

afterAll(async () => {
  await db.delete(exams).where(inArray(exams.title, ["Test sınağı"]));
  await db.delete(questions).where(inArray(questions.id, qids));
  await db.delete(users).where(inArray(users.id, created.users));
  await pool.end();
});

describe("exam engine (real database)", () => {
  it("rejects exams that have not started, ended, or do not exist", async () => {
    const future = await makeExam({ startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000) });
    await expect(startAttempt(studentId, future)).rejects.toMatchObject({ code: "not_started" });
    const past = await makeExam({ startsAt: new Date(Date.now() - 7200_000), endsAt: new Date(Date.now() - 3600_000) });
    await expect(startAttempt(studentId, past)).rejects.toMatchObject({ code: "ended" });
    await expect(startAttempt(studentId, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "not_found" });
  });

  it("hides draft and assigned-only exams from students without access", async () => {
    const draft = await makeExam({ status: "draft" });
    await expect(startAttempt(studentId, draft)).rejects.toMatchObject({ code: "not_found" });
    const assigned = await makeExam({ visibility: "assigned" });
    await expect(startAttempt(studentId, assigned)).rejects.toMatchObject({ code: "not_found" });
  });

  it("concurrent starts create exactly one open attempt", async () => {
    const ids = await Promise.all(Array.from({ length: 6 }, () => startAttempt(studentId, examId)));
    expect(new Set(ids.map((i) => i.id)).size).toBe(1);
    const rows = await db.select().from(examAttempts).where(eq(examAttempts.userId, studentId));
    expect(rows.filter((r) => r.examId === examId)).toHaveLength(1);
  });

  it("deadline is min(start + duration, window end) and orders are frozen", async () => {
    const tight = await makeExam({ endsAt: new Date(Date.now() + 5 * 60_000), durationMin: 60 });
    const { id } = await startAttempt(studentId, tight);
    const [a] = await db.select().from(examAttempts).where(eq(examAttempts.id, id));
    expect(a.deadlineAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60_000 + 1000);
    expect(a.questionOrder.sort()).toEqual([...qids].sort());
    await finalizeAttempt(id, { userId: studentId });
  });

  it("never sends the answer key to the browser payload", async () => {
    const { id } = await startAttempt(studentId, examId);
    const state = await getAttemptForTaking(studentId, id);
    const json = JSON.stringify(state);
    expect(json).not.toContain("SECRET-EXPLANATION");
    expect(json).not.toContain("SECRET-WHYWRONG");
    expect(json).not.toMatch(/isCorrect|is_correct|numericAnswer|explanation/);
    expect(await getAttemptForTaking(otherId, id)).toBeNull();
  });

  it("validates autosaves: ownership, question membership, option membership", async () => {
    const { id } = await startAttempt(studentId, examId);
    await saveAnswer(studentId, id, { questionId: qids[0], optionId: correct[qids[0]], numericValue: null, flagged: true });
    await expect(saveAnswer(otherId, id, { questionId: qids[0], optionId: null, numericValue: null, flagged: false })).rejects.toMatchObject({ code: "not_found" });
    await expect(saveAnswer(studentId, id, { questionId: "00000000-0000-4000-8000-000000000001", optionId: null, numericValue: null, flagged: false })).rejects.toMatchObject({ code: "invalid" });
    await expect(saveAnswer(studentId, id, { questionId: qids[0], optionId: correct[qids[1]], numericValue: null, flagged: false })).rejects.toMatchObject({ code: "invalid" });
    const [row] = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, id));
    expect(row.flagged).toBe(true);
    expect(row.selectedOptionId).toBe(correct[qids[0]]);
    // answer can be changed and cleared
    await saveAnswer(studentId, id, { questionId: qids[0], optionId: wrong[qids[0]], numericValue: null, flagged: false });
    await saveAnswer(studentId, id, { questionId: qids[1], optionId: correct[qids[1]], numericValue: null, flagged: false });
  });

  it("concurrent submits grade exactly once with the right score; later saves are refused", async () => {
    const { id } = await startAttempt(studentId, examId); // resumes: q0 wrong, q1 correct, q2 unanswered
    const results = await Promise.all(Array.from({ length: 6 }, () => finalizeAttempt(id, { userId: studentId })));
    expect(results.filter((r) => !r.alreadyDone)).toHaveLength(1);
    const [a] = await db.select().from(examAttempts).where(eq(examAttempts.id, id));
    expect(a.status).toBe("submitted");
    expect(Number(a.score)).toBe(2);
    expect(Number(a.maxScore)).toBe(6);
    expect(Number(a.percentage)).toBeCloseTo(33.33, 1);
    expect([a.correctCount, a.incorrectCount, a.unansweredCount]).toEqual([1, 1, 1]);
    expect(a.passed).toBe(false);
    const notes = await db.select().from(notifications).where(eq(notifications.userId, studentId));
    expect(notes.filter((n) => n.href?.includes(id))).toHaveLength(1);
    await expect(saveAnswer(studentId, id, { questionId: qids[2], optionId: correct[qids[2]], numericValue: null, flagged: false })).rejects.toMatchObject({ code: "closed" });
    expect(await getAttemptForTaking(studentId, id)).toBe("finished");
  });

  it("enforces the attempt limit", async () => {
    const second = await startAttempt(studentId, examId);
    expect(second.resumed).toBe(false);
    await finalizeAttempt(second.id, { userId: studentId });
    await expect(startAttempt(studentId, examId)).rejects.toMatchObject({ code: "limit" });
  });

  it("refuses saves after the deadline and auto-submits expired attempts", async () => {
    const e = await makeExam({ attemptLimit: 1 });
    const { id } = await startAttempt(otherId, e);
    await saveAnswer(otherId, id, { questionId: qids[0], optionId: correct[qids[0]], numericValue: null, flagged: false });
    await db.update(examAttempts).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(examAttempts.id, id));
    await expect(saveAnswer(otherId, id, { questionId: qids[1], optionId: correct[qids[1]], numericValue: null, flagged: false })).rejects.toBeInstanceOf(ExamError);
    expect(await finalizeExpiredAttempts({ userId: otherId })).toBeGreaterThanOrEqual(1);
    const [a] = await db.select().from(examAttempts).where(eq(examAttempts.id, id));
    expect(a.status).toBe("auto_submitted");
    expect(Number(a.score)).toBe(2); // only the answer saved before the deadline counts
    expect(a.timeSpentSec).toBeLessThanOrEqual(30 * 60);
  });
});
