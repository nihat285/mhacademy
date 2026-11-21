import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionPassageLinks, questionPassages } from "@/db/passage-schema";
import { questions, subjects } from "@/db/schema";
import { audit } from "@/lib/audit";
import { can, type Actor } from "@/lib/permissions";
import type { PassageInput } from "./rules";

export class PassageError extends Error {
  constructor(public code: "not_found" | "forbidden" | "invalid", message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

type Who = Pick<Actor, "id" | "role" | "permissions">;
type Row = typeof questionPassages.$inferSelect;

/** Admin: everything. Teacher: needs "questions.manage" and only their own passages. */
export function canManagePassage(actor: Who, p: Pick<Row, "authorId">): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "teacher" && can(actor, "questions.manage") && p.authorId === actor.id;
}

async function loadOwned(actor: Who, id: string): Promise<Row> {
  const [p] = await db.select().from(questionPassages).where(eq(questionPassages.id, id)).limit(1);
  if (!p || !canManagePassage(actor, p)) throw new PassageError("not_found", "Parça tapılmadı.");
  return p;
}

export async function listPassages(actor: Who) {
  const own = actor.role === "admin" ? undefined : eq(questionPassages.authorId, actor.id);
  return db
    .select({
      id: questionPassages.id, title: questionPassages.title, hasBody: sql<boolean>`${questionPassages.body} is not null`,
      hasAudio: sql<boolean>`${questionPassages.audioUrl} is not null`, subjectName: subjects.name, createdAt: questionPassages.createdAt,
      questionCount: sql<number>`(select count(*)::int from question_passage_links l where l.passage_id = ${questionPassages.id})`,
    })
    .from(questionPassages)
    .leftJoin(subjects, eq(subjects.id, questionPassages.subjectId))
    .where(own)
    .orderBy(desc(questionPassages.createdAt))
    .limit(300);
}

export async function createPassage(actor: Who, data: PassageInput, audioUrl: string | null): Promise<string> {
  if (actor.role === "teacher" && !can(actor, "questions.manage")) throw new PassageError("forbidden", "Bu əməliyyat üçün icazəniz yoxdur.");
  const [row] = await db
    .insert(questionPassages)
    .values({ title: data.title, subjectId: data.subjectId, body: data.body, transcript: data.transcript, maxPlays: data.maxPlays, audioUrl, authorId: actor.id })
    .returning({ id: questionPassages.id });
  await audit(actor.id, "passage.create", "question_passage", row.id);
  return row.id;
}

/** `audio`: undefined = keep, null = remove, string = replace. */
export async function updatePassage(actor: Who, id: string, data: PassageInput, audio: string | null | undefined) {
  await loadOwned(actor, id);
  await db
    .update(questionPassages)
    .set({
      title: data.title, subjectId: data.subjectId, body: data.body, transcript: data.transcript, maxPlays: data.maxPlays,
      ...(audio === undefined ? {} : { audioUrl: audio }), updatedAt: new Date(),
    })
    .where(eq(questionPassages.id, id));
  await audit(actor.id, "passage.update", "question_passage", id);
}

export async function deletePassage(actor: Who, id: string) {
  await loadOwned(actor, id);
  await db.transaction(async (tx) => {
    await tx.delete(questionPassageLinks).where(eq(questionPassageLinks.passageId, id));
    await tx.delete(questionPassages).where(eq(questionPassages.id, id));
  });
  await audit(actor.id, "passage.delete", "question_passage", id);
}

/** Links questions to a passage. A teacher may only link questions they authored; each question has at most one passage. */
export async function linkQuestions(actor: Who, passageId: string, questionIds: string[]) {
  await loadOwned(actor, passageId);
  if (questionIds.length === 0) return 0;
  const rows = await db.select({ id: questions.id, authorId: questions.authorId }).from(questions).where(inArray(questions.id, questionIds));
  const allowed = rows.filter((q) => actor.role === "admin" || q.authorId === actor.id).map((q) => q.id);
  if (allowed.length === 0) throw new PassageError("invalid", "Seçilmiş suallar tapılmadı və ya sizə aid deyil.");
  await db
    .insert(questionPassageLinks)
    .values(allowed.map((questionId) => ({ questionId, passageId })))
    .onConflictDoUpdate({ target: questionPassageLinks.questionId, set: { passageId } });
  await audit(actor.id, "passage.link", "question_passage", passageId, { count: allowed.length });
  return allowed.length;
}

export async function unlinkQuestion(actor: Who, passageId: string, questionId: string) {
  await loadOwned(actor, passageId);
  await db.delete(questionPassageLinks).where(and(eq(questionPassageLinks.passageId, passageId), eq(questionPassageLinks.questionId, questionId)));
  await audit(actor.id, "passage.unlink", "question_passage", passageId, { questionId });
}

export async function getPassageDetail(actor: Who, id: string) {
  const passage = await loadOwned(actor, id);
  const linked = await db
    .select({ id: questions.id, text: questions.text })
    .from(questionPassageLinks)
    .innerJoin(questions, eq(questions.id, questionPassageLinks.questionId))
    .where(eq(questionPassageLinks.passageId, id))
    .orderBy(asc(questions.createdAt));
  const linkedIds = linked.map((l) => l.id);
  const mine = actor.role === "admin" ? undefined : eq(questions.authorId, actor.id);
  // Candidates: same subject (when the passage has one), not already in this passage. Questions of another passage can be moved here.
  const candidates = await db
    .select({ id: questions.id, text: questions.text, otherPassage: sql<boolean>`exists (select 1 from question_passage_links l where l.question_id = ${questions.id})` })
    .from(questions)
    .where(and(mine, passage.subjectId ? eq(questions.subjectId, passage.subjectId) : undefined, linkedIds.length ? notInArray(questions.id, linkedIds) : undefined))
    .orderBy(desc(questions.createdAt))
    .limit(200);
  return { passage, linked, candidates };
}

export async function passageSubjects() {
  return db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name));
}

/** Passage for a question on the review page, transcript included. Call only after the result is released. */
export async function passagesForReview(questionIds: string[]) {
  if (questionIds.length === 0) return { byQuestion: new Map<string, string>(), passages: [] as Row[] };
  const links = await db.select().from(questionPassageLinks).where(inArray(questionPassageLinks.questionId, questionIds));
  const ids = [...new Set(links.map((l) => l.passageId))];
  const passages = ids.length ? await db.select().from(questionPassages).where(inArray(questionPassages.id, ids)) : [];
  return { byQuestion: new Map(links.map((l) => [l.questionId, l.passageId])), passages };
}
