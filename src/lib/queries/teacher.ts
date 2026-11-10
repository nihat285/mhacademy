import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  classGroups,
  classMembers,
  examAssignments,
  examAttempts,
  examQuestions,
  exams,
  lessons,
  questionOptions,
  questions,
  subjects,
  teacherProfiles,
  topics,
  users,
} from "@/db/schema";
import type { Role } from "@/lib/permissions";

/** Teachers see their own content; admins see everything. */
export const ownerFilter = (u: { id: string; role: Role }, col: Parameters<typeof eq>[0]): SQL | undefined => (u.role === "admin" ? undefined : eq(col, u.id));

export async function getSubjectsWithTopics() {
  const [subs, tops] = await Promise.all([
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder), asc(subjects.name)),
    db.select({ id: topics.id, subjectId: topics.subjectId, name: topics.name }).from(topics).orderBy(asc(topics.sortOrder), asc(topics.name)),
  ]);
  return { subjects: subs, topics: tops };
}

export async function getTeacherProfile(userId: string) {
  const [row] = await db
    .select({ name: users.name, email: users.email, p: teacherProfiles })
    .from(users)
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function listLessons(u: { id: string; role: Role }) {
  return db
    .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, published: lessons.published, durationSec: lessons.durationSec, subject: subjects.name, updatedAt: lessons.updatedAt })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .where(ownerFilter(u, lessons.teacherId))
    .orderBy(desc(lessons.updatedAt));
}

export async function getLesson(u: { id: string; role: Role }, id: string) {
  const [row] = await db.select().from(lessons).where(and(eq(lessons.id, id), ownerFilter(u, lessons.teacherId))).limit(1);
  return row ?? null;
}

export async function listQuestions(u: { id: string; role: Role }, opts: { subjectId?: string; q?: string }) {
  const conds = [ownerFilter(u, questions.authorId), opts.subjectId ? eq(questions.subjectId, opts.subjectId) : undefined, opts.q ? sql`${questions.text} ILIKE ${"%" + opts.q.replace(/[%_]/g, "") + "%"}` : undefined];
  return db
    .select({ id: questions.id, text: questions.text, type: questions.type, difficulty: questions.difficulty, subject: subjects.name, subjectId: questions.subjectId })
    .from(questions)
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(and(...conds))
    .orderBy(desc(questions.createdAt))
    .limit(200);
}

export async function getQuestion(u: { id: string; role: Role }, id: string) {
  const [q] = await db.select().from(questions).where(and(eq(questions.id, id), ownerFilter(u, questions.authorId))).limit(1);
  if (!q) return null;
  const options = await db.select().from(questionOptions).where(eq(questionOptions.questionId, id)).orderBy(asc(questionOptions.orderIndex));
  return { ...q, options };
}

export async function listExams(u: { id: string; role: Role }) {
  return db
    .select({
      id: exams.id,
      title: exams.title,
      status: exams.status,
      visibility: exams.visibility,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
      subject: subjects.name,
      questionCount: sql<number>`(select count(*)::int from ${examQuestions} where ${examQuestions.examId} = ${exams.id})`,
      attemptCount: sql<number>`(select count(*)::int from ${examAttempts} where ${examAttempts.examId} = ${exams.id})`,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(ownerFilter(u, exams.createdBy))
    .orderBy(desc(exams.startsAt));
}

export async function getExam(u: { id: string; role: Role }, id: string) {
  const [e] = await db.select().from(exams).where(and(eq(exams.id, id), ownerFilter(u, exams.createdBy))).limit(1);
  if (!e) return null;
  const [qs, assigns, [att]] = await Promise.all([
    db.select({ questionId: examQuestions.questionId }).from(examQuestions).where(eq(examQuestions.examId, id)).orderBy(asc(examQuestions.orderIndex)),
    db.select({ classId: examAssignments.classId }).from(examAssignments).where(eq(examAssignments.examId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(eq(examAttempts.examId, id)),
  ]);
  return {
    ...e,
    questionIds: qs.map((x) => x.questionId),
    classIds: assigns.map((a) => a.classId).filter((x): x is string => !!x),
    attemptCount: att?.n ?? 0,
  };
}

export async function listClasses(u: { id: string; role: Role }) {
  return db
    .select({
      id: classGroups.id,
      name: classGroups.name,
      grade: classGroups.grade,
      members: sql<number>`(select count(*)::int from ${classMembers} where ${classMembers.classId} = ${classGroups.id})`,
    })
    .from(classGroups)
    .where(ownerFilter(u, classGroups.teacherId))
    .orderBy(asc(classGroups.name));
}

export async function getClassWithMembers(u: { id: string; role: Role }, id: string) {
  const [c] = await db.select().from(classGroups).where(and(eq(classGroups.id, id), ownerFilter(u, classGroups.teacherId))).limit(1);
  if (!c) return null;
  const members = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.studentId))
    .where(eq(classMembers.classId, id))
    .orderBy(asc(users.name));
  return { ...c, members };
}

export async function listAnnouncements(u: { id: string; role: Role }) {
  return db
    .select({ id: announcements.id, title: announcements.title, body: announcements.body, audience: announcements.audience, createdAt: announcements.createdAt, className: classGroups.name })
    .from(announcements)
    .leftJoin(classGroups, eq(classGroups.id, announcements.classId))
    .where(ownerFilter(u, announcements.authorId))
    .orderBy(desc(announcements.createdAt))
    .limit(100);
}

export async function questionIdsUsedInExams(ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const rows = await db.select({ id: examQuestions.questionId }).from(examQuestions).where(inArray(examQuestions.questionId, ids));
  return new Set(rows.map((r) => r.id));
}
