import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  auditLogs,
  contactMessages,
  courses,
  examAttempts,
  exams,
  faqs,
  lessons,
  questions,
  subjects,
  teacherSubjects,
  testimonials,
  topics,
  userPermissions,
  users,
} from "@/db/schema";
import { PAGE_SIZE } from "@/components/ui/pagination";

const like = (q: string) => `%${q.replace(/[%_\\]/g, "")}%`;

export async function listUsers(opts: { role: "student" | "teacher"; q?: string; status?: string; page: number }) {
  const where: (SQL | undefined)[] = [
    eq(users.role, opts.role),
    opts.status === "active" || opts.status === "suspended" ? eq(users.status, opts.status) : undefined,
    opts.q ? or(ilike(users.name, like(opts.q)), ilike(users.email, like(opts.q))) : undefined,
  ];
  const w = and(...where);
  const [rows, [t]] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, status: users.status, isDemo: users.isDemo, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
      .from(users)
      .where(w)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(w),
  ]);
  return { rows, total: t.n };
}

export async function getUserDetail(id: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, isDemo: users.isDemo, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!u) return null;
  const [perms, subs, attempts] = await Promise.all([
    db.select({ p: userPermissions.permission }).from(userPermissions).where(eq(userPermissions.userId, id)),
    db.select({ s: teacherSubjects.subjectId }).from(teacherSubjects).where(eq(teacherSubjects.teacherId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(eq(examAttempts.userId, id)),
  ]);
  return { ...u, permissions: perms.map((x) => x.p), subjectIds: subs.map((x) => x.s), attemptCount: attempts[0].n };
}

export const allSubjects = () => db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder), asc(subjects.name));

export async function listSubjectsAdmin() {
  return db
    .select({
      id: subjects.id,
      name: subjects.name,
      accent: subjects.accent,
      featured: subjects.featured,
      sortOrder: subjects.sortOrder,
      topicCount: sql<number>`(select count(*)::int from ${topics} where ${topics.subjectId} = ${subjects.id})`,
      lessonCount: sql<number>`(select count(*)::int from ${lessons} where ${lessons.subjectId} = ${subjects.id})`,
      courseCount: sql<number>`(select count(*)::int from ${courses} where ${courses.subjectId} = ${subjects.id})`,
    })
    .from(subjects)
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
}

export async function getSubjectAdmin(id: string) {
  const [s] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  if (!s) return null;
  const tops = await db.select({ id: topics.id, name: topics.name }).from(topics).where(eq(topics.subjectId, id)).orderBy(asc(topics.sortOrder), asc(topics.name));
  return { ...s, topics: tops };
}

export const listTeachersLite = () =>
  db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.role, ["teacher", "admin"])).orderBy(asc(users.name));

export async function listCoursesAdmin() {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      published: courses.published,
      subject: subjects.name,
      teacher: users.name,
      lessonCount: sql<number>`(select count(*)::int from ${lessons} where ${lessons.courseId} = ${courses.id})`,
    })
    .from(courses)
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .orderBy(asc(subjects.name), asc(courses.title));
}

export async function getCourseAdmin(id: string) {
  const [c] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return c ?? null;
}

export async function listAllLessons(q?: string) {
  return db
    .select({ id: lessons.id, title: lessons.title, published: lessons.published, subject: subjects.name, teacher: users.name, updatedAt: lessons.updatedAt })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(q ? ilike(lessons.title, like(q)) : undefined)
    .orderBy(desc(lessons.updatedAt))
    .limit(200);
}

export async function listAllQuestions(q?: string) {
  return db
    .select({ id: questions.id, text: questions.text, type: questions.type, difficulty: questions.difficulty, subject: subjects.name, author: users.name })
    .from(questions)
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .leftJoin(users, eq(users.id, questions.authorId))
    .where(q ? ilike(questions.text, like(q)) : undefined)
    .orderBy(desc(questions.createdAt))
    .limit(200);
}

export async function listAllExams() {
  return db
    .select({
      id: exams.id,
      title: exams.title,
      status: exams.status,
      endsAt: exams.endsAt,
      resultRelease: exams.resultRelease,
      resultsReleasedAt: exams.resultsReleasedAt,
      subject: subjects.name,
      author: users.name,
      attempts: sql<number>`(select count(*)::int from ${examAttempts} where ${examAttempts.examId} = ${exams.id} and ${examAttempts.status} <> 'in_progress')`,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .leftJoin(users, eq(users.id, exams.createdBy))
    .orderBy(desc(exams.startsAt))
    .limit(200);
}

export async function listAttempts(opts: { examId?: string; page: number }) {
  const w = and(sql`${examAttempts.status} <> 'in_progress'`, opts.examId ? eq(examAttempts.examId, opts.examId) : undefined);
  const [rows, [t]] = await Promise.all([
    db
      .select({
        id: examAttempts.id,
        exam: exams.title,
        student: users.name,
        email: users.email,
        percentage: examAttempts.percentage,
        passed: examAttempts.passed,
        attemptNo: examAttempts.attemptNo,
        submittedAt: examAttempts.submittedAt,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(exams.id, examAttempts.examId))
      .innerJoin(users, eq(users.id, examAttempts.userId))
      .where(w)
      .orderBy(desc(examAttempts.submittedAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(w),
  ]);
  return { rows, total: t.n };
}

export async function listAnnouncementsAdmin() {
  return db
    .select({ id: announcements.id, title: announcements.title, body: announcements.body, audience: announcements.audience, createdAt: announcements.createdAt, author: users.name })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.authorId))
    .orderBy(desc(announcements.createdAt))
    .limit(100);
}

export const listMessages = (onlyOpen: boolean) =>
  db.select().from(contactMessages).where(onlyOpen ? isNull(contactMessages.handledAt) : undefined).orderBy(desc(contactMessages.createdAt)).limit(200);

export async function listAudit(opts: { q?: string; page: number }) {
  const w = opts.q ? or(ilike(auditLogs.action, like(opts.q)), ilike(auditLogs.entity, like(opts.q)), ilike(users.name, like(opts.q))) : undefined;
  const [rows, [t]] = await Promise.all([
    db
      .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, meta: auditLogs.meta, ip: auditLogs.ip, createdAt: auditLogs.createdAt, actor: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(w)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(w),
  ]);
  return { rows, total: t.n };
}

export const listFaqs = () => db.select().from(faqs).orderBy(asc(faqs.sortOrder));
export const listTestimonials = () => db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
