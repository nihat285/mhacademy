import { and, count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, examAttempts, lessonBookmarks, lessonProgress, lessons, questions, users, exams } from "@/db/schema";

/** Small headline numbers for each role's dashboard. Each query is a cheap indexed count. */
export async function getStudentOverview(userId: string) {
  const [[done], [saved], [attempts]] = await Promise.all([
    db.select({ n: count() }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true))),
    db.select({ n: count() }).from(lessonBookmarks).where(eq(lessonBookmarks.userId, userId)),
    db.select({ n: count() }).from(examAttempts).where(and(eq(examAttempts.userId, userId), ne(examAttempts.status, "in_progress"))),
  ]);
  return { completedLessons: done.n, bookmarkedLessons: saved.n, finishedAttempts: attempts.n };
}

export async function getTeacherOverview(userId: string) {
  const [[l], [q], [e]] = await Promise.all([
    db.select({ n: count() }).from(lessons).where(eq(lessons.teacherId, userId)),
    db.select({ n: count() }).from(questions).where(eq(questions.authorId, userId)),
    db.select({ n: count() }).from(exams).where(eq(exams.createdBy, userId)),
  ]);
  return { lessons: l.n, questions: q.n, exams: e.n };
}

export async function getAdminOverview() {
  const [[stu], [tea], [les], [exa], [msg]] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.role, "student")),
    db.select({ n: count() }).from(users).where(eq(users.role, "teacher")),
    db.select({ n: count() }).from(lessons),
    db.select({ n: count() }).from(exams),
    db.select({ n: count() }).from(contactMessages).where(isNull(contactMessages.handledAt)),
  ]);
  return { students: stu.n, teachers: tea.n, lessons: les.n, exams: exa.n, unreadMessages: msg.n };
}
