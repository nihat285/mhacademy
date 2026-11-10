import { and, asc, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  examAttempts,
  exams,
  examQuestions,
  faqs,
  lessons,
  subjects,
  teacherProfiles,
  teacherSubjects,
  testimonials,
  users,
} from "@/db/schema";

export async function getPlatformStats() {
  const [[students], [attempts], [lessonCount], [teachers]] = await Promise.all([
    db.select({ n: count() }).from(users).where(and(eq(users.role, "student"), eq(users.status, "active"))),
    db.select({ n: count() }).from(examAttempts).where(sql`${examAttempts.status} <> 'in_progress'`),
    db.select({ n: count() }).from(lessons).where(eq(lessons.published, true)),
    db.select({ n: count() }).from(teacherProfiles).where(eq(teacherProfiles.published, true)),
  ]);
  return { students: students.n, completedExams: attempts.n, lessons: lessonCount.n, teachers: teachers.n };
}

export async function getSubjectsWithCounts(onlyFeatured = false) {
  return db
    .select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      description: subjects.description,
      accent: subjects.accent,
      lessonCount: sql<number>`(select count(*)::int from lessons l where l.subject_id = ${subjects.id} and l.published)`,
      examCount: sql<number>`(select count(*)::int from exams e where e.subject_id = ${subjects.id} and e.status = 'published')`,
      teacherCount: sql<number>`(select count(*)::int from teacher_subjects ts where ts.subject_id = ${subjects.id})`,
    })
    .from(subjects)
    .where(onlyFeatured ? eq(subjects.featured, true) : undefined)
    .orderBy(asc(subjects.sortOrder));
}

export async function getFeaturedCourses(limit = 6) {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      thumbnailUrl: courses.thumbnailUrl,
      grade: courses.grade,
      subjectName: subjects.name,
      subjectSlug: subjects.slug,
      teacherName: users.name,
      lessonCount: sql<number>`(select count(*)::int from lessons l where l.course_id = ${courses.id} and l.published)`,
    })
    .from(courses)
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(and(eq(courses.published, true), eq(courses.featured, true)))
    .orderBy(asc(subjects.sortOrder))
    .limit(limit);
}

export async function getTeachers(opts: { featuredOnly?: boolean; limit?: number } = {}) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      isDemo: users.isDemo,
      slug: teacherProfiles.slug,
      headline: teacherProfiles.headline,
      bio: teacherProfiles.bio,
      qualifications: teacherProfiles.qualifications,
      experienceYears: teacherProfiles.experienceYears,
      photoUrl: teacherProfiles.photoUrl,
      subjectNames: sql<string[]>`coalesce((select array_agg(s.name order by s.sort_order) from teacher_subjects ts join subjects s on s.id = ts.subject_id where ts.teacher_id = ${users.id}), '{}')`,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(users.id, teacherProfiles.userId))
    .where(and(eq(teacherProfiles.published, true), eq(users.status, "active"), opts.featuredOnly ? eq(teacherProfiles.featured, true) : undefined))
    .orderBy(asc(users.name))
    .limit(opts.limit ?? 100);
}

export async function getUpcomingExams(limit = 4) {
  const now = new Date();
  return db
    .select({
      id: exams.id,
      slug: exams.slug,
      title: exams.title,
      description: exams.description,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
      durationMin: exams.durationMin,
      difficulty: exams.difficulty,
      subjectName: subjects.name,
      subjectAccent: subjects.accent,
      questionCount: sql<number>`(select count(*)::int from exam_questions eq where eq.exam_id = ${exams.id})`,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(exams.status, "published"), eq(exams.visibility, "public"), gt(exams.endsAt, now)))
    .orderBy(asc(exams.startsAt))
    .limit(limit);
}

export async function getFeaturedLessons(limit = 6) {
  return db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      description: lessons.description,
      durationSec: lessons.durationSec,
      thumbnailUrl: lessons.thumbnailUrl,
      hasVideo: sql<boolean>`${lessons.videoRef} is not null`,
      subjectName: subjects.name,
      teacherName: users.name,
    })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(eq(lessons.published, true), eq(lessons.featured, true)))
    .orderBy(desc(lessons.createdAt), asc(lessons.orderIndex))
    .limit(limit);
}

export async function getTestimonials() {
  return db.select().from(testimonials).where(eq(testimonials.published, true)).orderBy(asc(testimonials.sortOrder));
}

export async function getFaqs() {
  return db.select().from(faqs).where(eq(faqs.published, true)).orderBy(asc(faqs.sortOrder));
}

export async function countExamQuestions(examIds: string[]) {
  if (examIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({ examId: examQuestions.examId, n: count() })
    .from(examQuestions)
    .where(inArray(examQuestions.examId, examIds))
    .groupBy(examQuestions.examId);
  return new Map(rows.map((r) => [r.examId, r.n]));
}

export { teacherSubjects };
