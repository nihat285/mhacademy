import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { questionPassageLinks, questionPassages } from "@/db/passage-schema";
import { examAttempts, examQuestions, exams, questionOptions, questions, subjects, users } from "@/db/schema";
import { finalizeAttempt, getAttemptForTaking, startAttempt } from "@/lib/exam/engine";
import { getAttemptResult } from "@/lib/exam/results";
import { createPassage, deletePassage, getPassageDetail, linkQuestions, listPassages, unlinkQuestion, updatePassage } from "@/lib/passages/service";
import { validatePassage } from "@/lib/passages/rules";

const tag = `psg-${Date.now()}`;
const ids: Record<string, string> = {};
const qs: string[] = [];
let other: string;
let subjectId: string;
const perms = (...p: string[]) => new Set(p);
const teacher = () => ({ id: ids.t, role: "teacher" as const, permissions: perms("questions.manage") });
const teacher2 = () => ({ id: ids.t2, role: "teacher" as const, permissions: perms("questions.manage") });
const noPerm = () => ({ id: ids.t, role: "teacher" as const, permissions: perms() });
const admin = () => ({ id: ids.a, role: "admin" as const, permissions: perms() });
const data = (over: Record<string, string | boolean> = {}) => {
  const v = validatePassage({ title: "Dinləmə 1", subjectId, body: "Mətn burada.", transcript: "SECRET-TRANSCRIPT", maxPlays: "2", hasAudio: true, ...over });
  if (!v.ok) throw new Error(JSON.stringify(v.fieldErrors));
  return v.data;
};
const AUDIO = "/uploads/passage-audio/1-0123456789abcdef.mp3";

async function mkUser(key: string, role: "student" | "teacher" | "admin") {
  const [u] = await db.insert(users).values({ email: `${tag}-${key}@test.local`, name: `T ${key}`, passwordHash: "x", role }).returning({ id: users.id });
  ids[key] = u.id;
}
async function mkQuestion(authorId: string | null, text: string) {
  const [q] = await db.insert(questions).values({ subjectId, text, authorId, points: "1" }).returning({ id: questions.id });
  await db.insert(questionOptions).values([{ questionId: q.id, text: "Düz", isCorrect: true, orderIndex: 0 }, { questionId: q.id, text: "Səhv", isCorrect: false, orderIndex: 1 }]);
  return q.id;
}

beforeAll(async () => {
  const [s] = await db.select({ id: subjects.id }).from(subjects).limit(1);
  subjectId = s.id;
  await mkUser("t", "teacher"); await mkUser("t2", "teacher"); await mkUser("a", "admin");
  for (let i = 0; i < 6; i++) await mkUser(`s${i}`, "student");
  for (let i = 0; i < 6; i++) qs.push(await mkQuestion(ids.t, `${tag} sual ${i}`));
  other = await mkQuestion(ids.t2, `${tag} başqasının sualı`);
});

afterAll(async () => {
  await db.delete(exams).where(eq(exams.title, tag));
  await db.delete(questions).where(inArray(questions.id, [...qs, other])); // cascades the links
  await db.delete(questionPassages).where(inArray(questionPassages.authorId, [ids.t, ids.t2, ids.a]));
  await db.delete(users).where(inArray(users.id, Object.values(ids)));
  await pool.end();
});

describe("passage management", () => {
  it("only authors (with permission) manage passages; admin manages all", async () => {
    await expect(createPassage(noPerm(), data(), AUDIO)).rejects.toMatchObject({ code: "forbidden" });
    const id = await createPassage(teacher(), data(), AUDIO);
    await expect(getPassageDetail(teacher2(), id)).rejects.toMatchObject({ code: "not_found" });
    await expect(updatePassage(teacher2(), id, data(), undefined)).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePassage(teacher2(), id)).rejects.toMatchObject({ code: "not_found" });
    expect((await getPassageDetail(admin(), id)).passage.id).toBe(id);
    expect((await listPassages(teacher2())).some((p) => p.id === id)).toBe(false);
    expect((await listPassages(teacher())).some((p) => p.id === id)).toBe(true);
  });

  it("teachers can link only their own questions; a question belongs to one passage", async () => {
    const p1 = await createPassage(teacher(), data({ title: "Parça A" }), null);
    const p2 = await createPassage(teacher(), data({ title: "Parça B", hasAudio: false, maxPlays: "" }), null);
    expect(await linkQuestions(teacher(), p1, [qs[0], other])).toBe(1); // the other teacher's question is skipped
    await expect(linkQuestions(teacher(), p1, [other])).rejects.toMatchObject({ code: "invalid" });
    await linkQuestions(teacher(), p2, [qs[0]]); // moves
    expect((await getPassageDetail(teacher(), p1)).linked).toHaveLength(0);
    expect((await getPassageDetail(teacher(), p2)).linked.map((l) => l.id)).toEqual([qs[0]]);
    await unlinkQuestion(teacher(), p2, qs[0]);
    expect((await getPassageDetail(teacher(), p2)).linked).toHaveLength(0);
  });

  it("deleting a passage keeps the questions", async () => {
    const p = await createPassage(teacher(), data({ title: "Silinəcək" }), AUDIO);
    await linkQuestions(teacher(), p, [qs[5]]);
    await deletePassage(teacher(), p);
    expect(await db.select().from(questionPassageLinks).where(eq(questionPassageLinks.questionId, qs[5]))).toHaveLength(0);
    expect(await db.select({ id: questions.id }).from(questions).where(eq(questions.id, qs[5]))).toHaveLength(1);
  });
});

describe("passages in exams", () => {
  let examId: string, passageId: string;
  beforeAll(async () => {
    passageId = await createPassage(teacher(), data({ title: "Dinləmə parçası" }), AUDIO);
    await linkQuestions(teacher(), passageId, [qs[0], qs[1], qs[2]]);
    const [e] = await db.insert(exams).values({
      slug: `${tag}-e`, title: tag, subjectId, status: "published", visibility: "public", startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 3600_000),
      durationMin: 30, attemptLimit: 3, passingPercent: "50", negativeMarking: "0", shuffleQuestions: true, showExplanations: true, resultRelease: "immediate",
    }).returning({ id: exams.id });
    examId = e.id;
    // interleaved on purpose: passage questions are 0,2,4 in the exam order
    const order = [qs[0], qs[3], qs[1], qs[4], qs[2], qs[5]];
    await db.insert(examQuestions).values(order.map((questionId, i) => ({ examId, questionId, orderIndex: i })));
  });

  it("keeps the questions of one passage together and in order, even when shuffled", async () => {
    for (let i = 0; i < 6; i++) {
      const a = await startAttempt(ids[`s${i}`], examId);
      const [row] = await db.select({ o: examAttempts.questionOrder }).from(examAttempts).where(eq(examAttempts.id, a.id));
      const order = row.o;
      const pos = [qs[0], qs[1], qs[2]].map((q) => order.indexOf(q));
      expect(pos[1]).toBe(pos[0] + 1);
      expect(pos[2]).toBe(pos[0] + 2);
      expect(order).toHaveLength(6);
    }
  });

  it("sends the passage to the browser WITHOUT the transcript", async () => {
    const a = await startAttempt(ids.s0, examId);
    const state = await getAttemptForTaking(ids.s0, a.id);
    if (state === "finished" || !state) throw new Error("expected a live attempt");
    expect(state.passages).toHaveLength(1);
    expect(state.passages[0]).toMatchObject({ id: passageId, title: "Dinləmə parçası", audioUrl: AUDIO, maxPlays: 2 });
    expect(JSON.stringify(state)).not.toContain("SECRET-TRANSCRIPT");
    expect(state.questions.filter((q) => q.passageId === passageId)).toHaveLength(3);
    expect(state.questions.filter((q) => q.passageId === null)).toHaveLength(3);
  });

  it("shows the transcript in the review only when answer review is allowed", async () => {
    const a = await startAttempt(ids.s1, examId);
    await finalizeAttempt(a.id, { userId: ids.s1 });
    const r = await getAttemptResult(ids.s1, a.id);
    if (r?.state !== "released") throw new Error("expected released");
    expect(r.review.find((x) => x.passage)?.passage?.transcript).toBe("SECRET-TRANSCRIPT");

    await db.update(exams).set({ showExplanations: false }).where(eq(exams.id, examId));
    const r2 = await getAttemptResult(ids.s1, a.id);
    if (r2?.state !== "released") throw new Error("expected released");
    expect(r2.review.find((x) => x.passage)?.passage?.transcript).toBeNull();
    expect(JSON.stringify(r2.review)).not.toContain("SECRET-TRANSCRIPT");
  });
});
