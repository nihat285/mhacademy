import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  examAttempts,
  exams,
  lessonBookmarks,
  lessonMaterials,
  lessonProgress,
  lessons,
  siteSettings,
  studentProfiles,
  subjects,
  teacherProfiles,
  teacherSubjects,
  testimonials,
  topics,
  users,
} from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Escapes LIKE wildcards in user input so "%" and "_" are matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const likePattern = (q: string) => `%${escapeLike(q)}%`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

const questionCountSql = sql<number>`(select count(*)::int from exam_questions eq where eq.exam_id = ${exams.id})`;

const publicExam = () => and(eq(exams.status, "published"), eq(exams.visibility, "public"));

/* -------------------------------------------------------------------------- */
/*  Subjects                                                                  */
/* -------------------------------------------------------------------------- */

export async function getSubjectOptions() {
  return db.select({ id: subjects.id, slug: subjects.slug, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder), asc(subjects.name));
}

export async function getSubjectBySlug(slug: string) {
  const [row] = await db.select().from(subjects).where(eq(subjects.slug, slug)).limit(1);
  return row ?? null;
}

export type TopicNode = { id: string; slug: string; name: string; lessonCount: number; children: TopicNode[] };

/** Topics of a subject as a tree, with the number of published lessons per topic. */
export async function getTopicTree(subjectId: string): Promise<TopicNode[]> {
  const rows = await db
    .select({
      id: topics.id,
      parentId: topics.parentId,
      slug: topics.slug,
      name: topics.name,
      lessonCount: sql<number>`(select count(*)::int from lessons l where l.topic_id = ${topics.id} and l.published)`,
    })
    .from(topics)
    .where(eq(topics.subjectId, subjectId))
    .orderBy(asc(topics.sortOrder), asc(topics.name));
  const nodes = new Map<string, TopicNode>(rows.map((r) => [r.id, { id: r.id, slug: r.slug, name: r.name, lessonCount: r.lessonCount, children: [] }]));
  const roots: TopicNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id)!;
    const parent = r.parentId ? nodes.get(r.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getSubjectCourses(subjectId: string) {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      thumbnailUrl: courses.thumbnailUrl,
      grade: courses.grade,
      subjectName: subjects.name,
      teacherName: users.name,
      lessonCount: sql<number>`(select count(*)::int from lessons l where l.course_id = ${courses.id} and l.published)`,
    })
    .from(courses)
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(and(eq(courses.subjectId, subjectId), eq(courses.published, true)))
    .orderBy(desc(courses.featured), asc(courses.title));
}

const lessonCardSelect = {
  id: lessons.id,
  slug: lessons.slug,
  title: lessons.title,
  description: lessons.description,
  durationSec: lessons.durationSec,
  thumbnailUrl: lessons.thumbnailUrl,
  hasVideo: sql<boolean>`(${lessons.videoRef} is not null and ${lessons.videoRef} <> '')`,
  subjectName: subjects.name,
  teacherName: users.name,
};

export async function getSubjectLessons(subjectId: string, limit = 9) {
  return db
    .select(lessonCardSelect)
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(eq(lessons.subjectId, subjectId), eq(lessons.published, true)))
    .orderBy(desc(lessons.featured), asc(lessons.orderIndex), desc(lessons.createdAt))
    .limit(limit);
}

export async function getSubjectUpcomingExams(subjectId: string, limit = 6) {
  return db
    .select({
      id: exams.id,
      slug: exams.slug,
      title: exams.title,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
      durationMin: exams.durationMin,
      difficulty: exams.difficulty,
      subjectName: subjects.name,
      questionCount: questionCountSql,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(publicExam(), eq(exams.subjectId, subjectId), gt(exams.endsAt, new Date())))
    .orderBy(asc(exams.startsAt))
    .limit(limit);
}

/* -------------------------------------------------------------------------- */
/*  Public exams                                                              */
/* -------------------------------------------------------------------------- */

const publicExamSelect = {
  id: exams.id,
  slug: exams.slug,
  title: exams.title,
  description: exams.description,
  startsAt: exams.startsAt,
  endsAt: exams.endsAt,
  durationMin: exams.durationMin,
  difficulty: exams.difficulty,
  passingPercent: exams.passingPercent,
  negativeMarking: exams.negativeMarking,
  attemptLimit: exams.attemptLimit,
  subjectName: subjects.name,
  subjectSlug: subjects.slug,
  questionCount: questionCountSql,
};

/** Public exams: live/upcoming by default, past ones (newest first) with `ended: true`. */
export async function getPublicExams(opts: { subject?: string; ended?: boolean; limit?: number } = {}) {
  const now = new Date();
  return db
    .select(publicExamSelect)
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(publicExam(), opts.subject ? eq(subjects.slug, opts.subject) : undefined, opts.ended ? lt(exams.endsAt, now) : gt(exams.endsAt, now)))
    .orderBy(opts.ended ? desc(exams.endsAt) : asc(exams.startsAt))
    .limit(opts.limit ?? 60);
}

export async function getPublicExamBySlug(slug: string) {
  const [row] = await db
    .select(publicExamSelect)
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(publicExam(), eq(exams.slug, slug)))
    .limit(1);
  return row ?? null;
}

const teacherCardSelect = {
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
};

const visibleTeacher = () => and(eq(teacherProfiles.published, true), eq(users.status, "active"));

export async function getSubjectTeachers(subjectId: string) {
  return db
    .select(teacherCardSelect)
    .from(teacherProfiles)
    .innerJoin(users, eq(users.id, teacherProfiles.userId))
    .where(and(visibleTeacher(), sql`exists (select 1 from teacher_subjects ts where ts.teacher_id = ${users.id} and ts.subject_id = ${subjectId})`))
    .orderBy(desc(teacherProfiles.featured), asc(users.name));
}

/* -------------------------------------------------------------------------- */
/*  Teachers                                                                  */
/* -------------------------------------------------------------------------- */

export async function getTeacherDirectory(subjectSlug?: string) {
  const subject = subjectSlug ? await getSubjectBySlug(subjectSlug) : null;
  const rows = await db
    .select(teacherCardSelect)
    .from(teacherProfiles)
    .innerJoin(users, eq(users.id, teacherProfiles.userId))
    .where(
      and(
        visibleTeacher(),
        subject ? sql`exists (select 1 from teacher_subjects ts where ts.teacher_id = ${users.id} and ts.subject_id = ${subject.id})` : undefined,
      ),
    )
    .orderBy(desc(teacherProfiles.featured), asc(users.name));
  return { rows, subject };
}

export async function getTeacherBySlug(slug: string) {
  const [row] = await db
    .select({
      ...teacherCardSelect,
      officeHours: teacherProfiles.officeHours,
      contactEmail: teacherProfiles.contactEmail,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(users.id, teacherProfiles.userId))
    .where(and(visibleTeacher(), eq(teacherProfiles.slug, slug)))
    .limit(1);
  if (!row) return null;
  const subjectRows = await db
    .select({ slug: subjects.slug, name: subjects.name })
    .from(teacherSubjects)
    .innerJoin(subjects, eq(subjects.id, teacherSubjects.subjectId))
    .where(eq(teacherSubjects.teacherId, row.userId))
    .orderBy(asc(subjects.sortOrder));
  return { ...row, subjects: subjectRows };
}

export async function getTeacherCourses(teacherId: string) {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      thumbnailUrl: courses.thumbnailUrl,
      grade: courses.grade,
      subjectName: subjects.name,
      teacherName: users.name,
      lessonCount: sql<number>`(select count(*)::int from lessons l where l.course_id = ${courses.id} and l.published)`,
    })
    .from(courses)
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(and(eq(courses.teacherId, teacherId), eq(courses.published, true)))
    .orderBy(asc(courses.title));
}

export async function getTeacherLessons(teacherId: string, limit = 12) {
  return db
    .select(lessonCardSelect)
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(eq(lessons.teacherId, teacherId), eq(lessons.published, true)))
    .orderBy(asc(lessons.orderIndex), desc(lessons.createdAt))
    .limit(limit);
}

export async function getTeacherExams(teacherId: string, limit = 6) {
  return db
    .select({
      id: exams.id,
      slug: exams.slug,
      title: exams.title,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
      durationMin: exams.durationMin,
      difficulty: exams.difficulty,
      subjectName: subjects.name,
      questionCount: questionCountSql,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(publicExam(), eq(exams.createdBy, teacherId)))
    .orderBy(desc(exams.startsAt))
    .limit(limit);
}

/* -------------------------------------------------------------------------- */
/*  Lesson library                                                            */
/* -------------------------------------------------------------------------- */

export const LESSON_SORTS = ["yeni", "muddet", "ad"] as const;
export type LessonSort = (typeof LESSON_SORTS)[number];
export const LESSONS_PAGE_SIZE = 12;

export interface LessonFilters {
  q?: string;
  subject?: string;
  topic?: string;
  teacher?: string;
  course?: string;
  sort: LessonSort;
  page: number;
}

export async function getLessonFilterOptions() {
  const [subjectRows, topicRows, teacherRows, courseRows] = await Promise.all([
    getSubjectOptions(),
    db
      .select({ slug: topics.slug, name: topics.name, subjectSlug: subjects.slug })
      .from(topics)
      .innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .orderBy(asc(subjects.sortOrder), asc(topics.sortOrder), asc(topics.name)),
    db
      .select({ slug: teacherProfiles.slug, name: users.name })
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(visibleTeacher())
      .orderBy(asc(users.name)),
    db.select({ slug: courses.slug, title: courses.title, subjectSlug: subjects.slug }).from(courses).innerJoin(subjects, eq(subjects.id, courses.subjectId)).where(eq(courses.published, true)).orderBy(asc(courses.title)),
  ]);
  return { subjects: subjectRows, topics: topicRows, teachers: teacherRows, courses: courseRows };
}

export async function searchLessons(f: LessonFilters) {
  const conds: (SQL | undefined)[] = [eq(lessons.published, true)];
  if (f.q) {
    const p = likePattern(f.q);
    conds.push(or(ilike(lessons.title, p), ilike(lessons.description, p), ilike(subjects.name, p), ilike(topics.name, p)));
  }
  if (f.subject) conds.push(eq(subjects.slug, f.subject));
  if (f.topic) conds.push(eq(topics.slug, f.topic));
  if (f.teacher) conds.push(eq(teacherProfiles.slug, f.teacher));
  if (f.course) conds.push(eq(courses.slug, f.course));
  const where = and(...conds);
  const order =
    f.sort === "muddet" ? [desc(lessons.durationSec), asc(lessons.title)] : f.sort === "ad" ? [asc(lessons.title)] : [desc(lessons.createdAt), asc(lessons.orderIndex)];

  const base = () =>
    db
      .select({ n: count() })
      .from(lessons)
      .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(topics, eq(topics.id, lessons.topicId))
      .leftJoin(courses, eq(courses.id, lessons.courseId))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, lessons.teacherId))
      .where(where);
  const [[total], rows] = await Promise.all([
    base(),
    db
      .select(lessonCardSelect)
      .from(lessons)
      .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(topics, eq(topics.id, lessons.topicId))
      .leftJoin(courses, eq(courses.id, lessons.courseId))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, lessons.teacherId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .where(where)
      .orderBy(...order)
      .limit(LESSONS_PAGE_SIZE)
      .offset((f.page - 1) * LESSONS_PAGE_SIZE),
  ]);
  return { rows, total: total.n };
}

/* -------------------------------------------------------------------------- */
/*  Lesson detail                                                             */
/* -------------------------------------------------------------------------- */

export async function getLessonBySlug(slug: string) {
  const [row] = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      description: lessons.description,
      notes: lessons.notes,
      provider: lessons.provider,
      videoRef: lessons.videoRef,
      durationSec: lessons.durationSec,
      thumbnailUrl: lessons.thumbnailUrl,
      orderIndex: lessons.orderIndex,
      subjectId: lessons.subjectId,
      subjectSlug: subjects.slug,
      subjectName: subjects.name,
      topicId: lessons.topicId,
      topicName: topics.name,
      topicSlug: topics.slug,
      courseId: lessons.courseId,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      teacherId: lessons.teacherId,
      teacherName: users.name,
      teacherSlug: teacherProfiles.slug,
      teacherPhoto: teacherProfiles.photoUrl,
      teacherHeadline: teacherProfiles.headline,
      teacherPublished: teacherProfiles.published,
    })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(topics, eq(topics.id, lessons.topicId))
    .leftJoin(courses, eq(courses.id, lessons.courseId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, lessons.teacherId))
    .where(and(eq(lessons.slug, slug), eq(lessons.published, true)))
    .limit(1);
  return row ?? null;
}

export async function getLessonMaterials(lessonId: string) {
  return db
    .select({ id: lessonMaterials.id, title: lessonMaterials.title, fileUrl: lessonMaterials.fileUrl, mimeType: lessonMaterials.mimeType, sizeBytes: lessonMaterials.sizeBytes })
    .from(lessonMaterials)
    .where(eq(lessonMaterials.lessonId, lessonId))
    .orderBy(asc(lessonMaterials.createdAt));
}

export async function getCourseLessonList(courseId: string) {
  return db
    .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, durationSec: lessons.durationSec })
    .from(lessons)
    .where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
    .orderBy(asc(lessons.orderIndex), asc(lessons.createdAt));
}

/** Same topic first, then same subject; never the lesson itself. */
export async function getRelatedLessons(lesson: { id: string; subjectId: string; topicId: string | null }, limit = 4) {
  const rows = await db
    .select(lessonCardSelect)
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(eq(lessons.published, true), eq(lessons.subjectId, lesson.subjectId), ne(lessons.id, lesson.id)))
    .orderBy(sql`case when ${lesson.topicId ? sql`${lessons.topicId} = ${lesson.topicId}` : sql`false`} then 0 else 1 end`, asc(lessons.orderIndex), desc(lessons.createdAt))
    .limit(limit);
  return rows;
}

export async function getLessonStudentState(userId: string, lessonId: string) {
  const [[progress], [bookmark]] = await Promise.all([
    db.select({ positionSec: lessonProgress.positionSec, completed: lessonProgress.completed }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId))).limit(1),
    db.select({ lessonId: lessonBookmarks.lessonId }).from(lessonBookmarks).where(and(eq(lessonBookmarks.userId, userId), eq(lessonBookmarks.lessonId, lessonId))).limit(1),
  ]);
  return { positionSec: progress?.positionSec ?? 0, completed: progress?.completed ?? false, bookmarked: !!bookmark };
}

export async function getCompletedLessonIds(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true), inArray(lessonProgress.lessonId, lessonIds)));
  return new Set(rows.map((r) => r.lessonId));
}

/* -------------------------------------------------------------------------- */
/*  Global search                                                             */
/* -------------------------------------------------------------------------- */

export async function globalSearch(q: string, limit = 8) {
  const p = likePattern(q);
  const [lessonRows, examRows, teacherRows, subjectRows, courseRows] = await Promise.all([
    db
      .select(lessonCardSelect)
      .from(lessons)
      .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .where(and(eq(lessons.published, true), or(ilike(lessons.title, p), ilike(lessons.description, p))))
      .orderBy(desc(lessons.featured), asc(lessons.title))
      .limit(limit),
    db
      .select({
        id: exams.id,
        slug: exams.slug,
        title: exams.title,
        startsAt: exams.startsAt,
        endsAt: exams.endsAt,
        durationMin: exams.durationMin,
        difficulty: exams.difficulty,
        subjectName: subjects.name,
        questionCount: questionCountSql,
      })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(and(publicExam(), or(ilike(exams.title, p), ilike(exams.description, p))))
      .orderBy(desc(exams.startsAt))
      .limit(limit),
    db
      .select(teacherCardSelect)
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(and(visibleTeacher(), or(ilike(users.name, p), ilike(teacherProfiles.headline, p), ilike(teacherProfiles.bio, p))))
      .orderBy(asc(users.name))
      .limit(limit),
    db
      .select({ id: subjects.id, slug: subjects.slug, name: subjects.name, description: subjects.description, accent: subjects.accent, lessonCount: sql<number>`(select count(*)::int from lessons l where l.subject_id = ${subjects.id} and l.published)`, examCount: sql<number>`(select count(*)::int from exams e where e.subject_id = ${subjects.id} and e.status = 'published')` })
      .from(subjects)
      .where(or(ilike(subjects.name, p), ilike(subjects.description, p)))
      .orderBy(asc(subjects.sortOrder))
      .limit(limit),
    db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        thumbnailUrl: courses.thumbnailUrl,
        grade: courses.grade,
        subjectName: subjects.name,
        teacherName: users.name,
        lessonCount: sql<number>`(select count(*)::int from lessons l where l.course_id = ${courses.id} and l.published)`,
      })
      .from(courses)
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .leftJoin(users, eq(users.id, courses.teacherId))
      .where(and(eq(courses.published, true), or(ilike(courses.title, p), ilike(courses.description, p))))
      .orderBy(asc(courses.title))
      .limit(limit),
  ]);
  return { lessons: lessonRows, exams: examRows, teachers: teacherRows, subjects: subjectRows, courses: courseRows };
}

/* -------------------------------------------------------------------------- */
/*  Results page                                                              */
/* -------------------------------------------------------------------------- */

const finished = () => and(ne(examAttempts.status, "in_progress"), isNotNull(examAttempts.percentage));

export async function getResultsOverview() {
  const [[agg], perSubject] = await Promise.all([
    db
      .select({
        attempts: count(),
        avg: sql<number | null>`avg(${examAttempts.percentage})::float`,
        passed: sql<number>`count(*) filter (where ${examAttempts.passed})::int`,
        graded: sql<number>`count(*) filter (where ${examAttempts.passed} is not null)::int`,
      })
      .from(examAttempts)
      .where(finished()),
    db
      .select({
        name: subjects.name,
        accent: subjects.accent,
        attempts: count(),
        avg: sql<number>`avg(${examAttempts.percentage})::float`,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(exams.id, examAttempts.examId))
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(finished())
      .groupBy(subjects.id, subjects.name, subjects.accent, subjects.sortOrder)
      .orderBy(asc(subjects.sortOrder)),
  ]);
  return {
    attempts: agg?.attempts ?? 0,
    avgPercent: agg?.avg ?? null,
    passRate: agg && agg.graded > 0 ? (agg.passed / agg.graded) * 100 : null,
    perSubject,
  };
}

function publicName(name: string, alias: string | null): string {
  const a = alias?.trim();
  if (a) return a;
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/**
 * Leaderboard of the most recently ended published public exam whose results are released.
 * Only students who explicitly opted in (student_profiles.leaderboard_opt_in) appear.
 */
export async function getLatestLeaderboard(limit = 10) {
  const now = new Date();
  const [exam] = await db
    .select({ id: exams.id, slug: exams.slug, title: exams.title, endsAt: exams.endsAt, subjectName: subjects.name })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(publicExam(), lt(exams.endsAt, now), or(ne(exams.resultRelease, "manual"), isNotNull(exams.resultsReleasedAt))))
    .orderBy(desc(exams.endsAt))
    .limit(1);
  if (!exam) return null;
  const rows = await db
    .select({
      name: users.name,
      alias: studentProfiles.displayAlias,
      percentage: sql<number>`max(${examAttempts.percentage})::float`,
      timeSpentSec: sql<number | null>`min(${examAttempts.timeSpentSec})`,
    })
    .from(examAttempts)
    .innerJoin(users, eq(users.id, examAttempts.userId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(and(eq(examAttempts.examId, exam.id), finished(), eq(studentProfiles.leaderboardOptIn, true), eq(users.status, "active")))
    .groupBy(users.id, users.name, studentProfiles.displayAlias)
    .orderBy(desc(sql`max(${examAttempts.percentage})`), asc(sql`min(${examAttempts.timeSpentSec})`))
    .limit(limit);
  return { exam, entries: rows.map((r) => ({ displayName: publicName(r.name, r.alias), percentage: r.percentage, timeSpentSec: r.timeSpentSec })) };
}

export async function getPublishedTestimonials() {
  return db.select().from(testimonials).where(eq(testimonials.published, true)).orderBy(asc(testimonials.sortOrder));
}

/* -------------------------------------------------------------------------- */
/*  Site settings & sitemap                                                   */
/* -------------------------------------------------------------------------- */

export type ContactSettings = { email?: string; phone?: string; address?: string; demo?: boolean };

export async function getContactSettings(): Promise<ContactSettings> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "contact")).limit(1);
  const v = row?.value;
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : undefined);
  return { email: str(o.email), phone: str(o.phone), address: str(o.address), demo: o.demo === true };
}

export async function getSitemapEntries() {
  const [t, s, l] = await Promise.all([
    db.select({ slug: teacherProfiles.slug, updatedAt: teacherProfiles.updatedAt }).from(teacherProfiles).innerJoin(users, eq(users.id, teacherProfiles.userId)).where(visibleTeacher()),
    db.select({ slug: subjects.slug }).from(subjects),
    db.select({ slug: lessons.slug, updatedAt: lessons.updatedAt }).from(lessons).where(eq(lessons.published, true)),
  ]);
  return { teachers: t, subjects: s, lessons: l };
}
