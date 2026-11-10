import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import * as s from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { FAQS, LESSONS, QUESTIONS, SUBJECTS, TEACHERS, TESTIMONIALS, TOPICS } from "./seed-data";
import { writePlaceholders } from "./placeholders";

/**
 * Development / demo seed.
 *   npm run db:seed            -> seeds an empty database
 *   npm run db:seed -- --reset -> wipes every table first
 * Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=true.
 * All accounts created here are flagged is_demo and share DEMO_PASSWORD.
 */
export const DEMO_PASSWORD = "Demo-Parol-2026";

const DAY = 86_400_000;
const at = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed demo data in production.");
  }
  const reset = process.argv.includes("--reset");
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.users);
  if (count > 0 && !reset) {
    console.log("Database already has users. Re-run with --reset to wipe and re-seed.");
    return;
  }
  if (reset) {
    const tables = await pool.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname='public' and tablename not like '\\_\\_drizzle%' and tablename <> '__drizzle_migrations'",
    );
    const names = tables.rows.map((t) => `"${t.tablename}"`).join(", ");
    await pool.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
    console.log("Wiped existing data.");
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();

  /* ------------------------------ users ------------------------------ */
  const [admin] = await db
    .insert(s.users)
    .values({ email: "admin@demo.mhacademy.local", name: "Demo Administrator", role: "admin", passwordHash, emailVerifiedAt: now, isDemo: true })
    .returning();
  const [student] = await db
    .insert(s.users)
    .values({ email: "student@demo.mhacademy.local", name: "Demo Şagird", role: "student", passwordHash, emailVerifiedAt: now, isDemo: true })
    .returning();
  await db.insert(s.studentProfiles).values({ userId: student.id, grade: 11, goals: "Buraxılış imtahanında riyaziyyat üzrə yüksək nəticə." });

  /* ----------------------------- subjects ---------------------------- */
  const subjectRows = await db
    .insert(s.subjects)
    .values(SUBJECTS.map((x, i) => ({ ...x, sortOrder: i })))
    .returning();
  const subjectId = Object.fromEntries(subjectRows.map((r) => [r.slug, r.id]));

  const topicRows = await db
    .insert(s.topics)
    .values(TOPICS.map((t, i) => ({ subjectId: subjectId[t.subject], slug: t.slug, name: t.name, sortOrder: i })))
    .returning();
  const topicId = Object.fromEntries(topicRows.map((r) => [`${r.subjectId}:${r.slug}`, r.id]));
  const topicOf = (subject: string, slug: string) => topicId[`${subjectId[subject]}:${slug}`];

  /* ----------------------------- teachers ---------------------------- */
  writePlaceholders(TEACHERS, SUBJECTS as unknown as { slug: string; accent: string }[]);
  const teacherId: Record<string, string> = {};
  for (const t of TEACHERS) {
    const [u] = await db
      .insert(s.users)
      .values({ email: t.email, name: t.name, role: "teacher", passwordHash, emailVerifiedAt: now, isDemo: true })
      .returning();
    teacherId[t.slug] = u.id;
    await db.insert(s.teacherProfiles).values({
      userId: u.id,
      slug: t.slug,
      headline: t.headline,
      bio: t.bio,
      qualifications: t.qualifications,
      experienceYears: t.years,
      photoUrl: `/demo/teachers/${t.slug}.svg`,
      featured: t.featured,
    });
    await db.insert(s.teacherSubjects).values(t.subjects.map((sl) => ({ teacherId: u.id, subjectId: subjectId[sl] })));
    await db.insert(s.userPermissions).values(t.permissions.map((permission) => ({ userId: u.id, permission, grantedBy: admin.id })));
  }
  const teacherBySubject: Record<string, string> = {};
  for (const t of TEACHERS) for (const sl of t.subjects) teacherBySubject[sl] ??= teacherId[t.slug];

  /* ----------------------------- courses ----------------------------- */
  const COURSE_TITLES: Record<string, string> = {
    riyaziyyat: "Riyaziyyat: əsas səviyyədən buraxılışa",
    fizika: "Fizika: mexanika, elektrik və istilik",
    kimya: "Kimya: əsas anlayışlar",
    "azerbaycan-dili": "Azərbaycan dili: qrammatika əsasları",
    "ingilis-dili": "İngilis dili: Grammar & Vocabulary",
  };
  const courseRows = await db
    .insert(s.courses)
    .values(
      SUBJECTS.map((sub) => ({
        subjectId: subjectId[sub.slug],
        teacherId: teacherBySubject[sub.slug],
        slug: `${sub.slug}-kursu`,
        title: COURSE_TITLES[sub.slug],
        description: sub.description,
        thumbnailUrl: `/demo/courses/${sub.slug}.svg`,
        grade: 11,
        featured: true,
      })),
    )
    .returning();
  const courseId = Object.fromEntries(courseRows.map((c) => [c.subjectId, c.id]));

  /* ----------------------------- lessons ----------------------------- */
  const topicSubject = Object.fromEntries(TOPICS.map((t) => [t.slug, t.subject]));
  const lessonRows: { id: string; topicSlug: string }[] = [];
  for (const [i, l] of LESSONS.entries()) {
    const sub = topicSubject[l.topic];
    const [row] = await db
      .insert(s.lessons)
      .values({
        courseId: courseId[subjectId[sub]],
        subjectId: subjectId[sub],
        topicId: topicOf(sub, l.topic),
        teacherId: teacherId[l.teacher],
        slug: l.slug,
        title: l.title,
        description: l.description,
        notes: l.notes,
        provider: "youtube",
        videoRef: null, // Attach a real video via Admin/Teacher → Dərslər. No fake video IDs are seeded.
        durationSec: l.minutes * 60,
        thumbnailUrl: `/demo/courses/${sub}.svg`,
        orderIndex: i,
        featured: !!l.featured,
      })
      .returning({ id: s.lessons.id });
    lessonRows.push({ id: row.id, topicSlug: l.topic });
  }
  const lessonByTopic = Object.fromEntries(lessonRows.map((l) => [l.topicSlug, l.id]));

  /* ---------------------------- questions ---------------------------- */
  const POINTS = { easy: 1, medium: 1, hard: 2 } as const;
  const questionIds: { id: string; subject: string; topic: string; diff: string }[] = [];
  for (const q of QUESTIONS) {
    const [row] = await db
      .insert(s.questions)
      .values({
        subjectId: subjectId[q.subject],
        topicId: topicOf(q.subject, q.topic),
        authorId: teacherBySubject[q.subject],
        type: "mcq",
        difficulty: q.diff,
        text: q.text,
        explanation: q.explanation,
        steps: q.steps ?? null,
        concept: q.concept,
        points: String(q.points ?? POINTS[q.diff]),
        source: "MH Academy demo bankı",
        tags: [q.subject, q.topic],
        relatedLessonId: lessonByTopic[q.topic] ?? null,
      })
      .returning({ id: s.questions.id });
    await db.insert(s.questionOptions).values([
      { questionId: row.id, text: q.correct, isCorrect: true, orderIndex: 0 },
      ...q.wrong.map(([text, whyWrong], i) => ({ questionId: row.id, text, whyWrong, isCorrect: false, orderIndex: i + 1 })),
    ]);
    questionIds.push({ id: row.id, subject: q.subject, topic: q.topic, diff: q.diff });
  }
  const bySubject = (sub: string) => questionIds.filter((q) => q.subject === sub).map((q) => q.id);

  /* ------------------------------ exams ------------------------------ */
  const examDefs = [
    {
      slug: "riyaziyyat-buraxilis-sinagi-1",
      title: "Riyaziyyat — Buraxılış sınağı № 1",
      description: "Tənliklər, funksiyalar, həndəsə, faiz və ardıcıllıqlar üzrə 12 sual. Səhv cavab üçün sualın balının dörddə biri çıxılır.",
      subject: "riyaziyyat", by: "leyla-quliyeva", grade: 11, diff: "medium" as const,
      startsAt: at(-1, 9), endsAt: at(30, 23), durationMin: 25, neg: "0.25", attempts: 3, release: "immediate" as const, featured: true,
      questions: bySubject("riyaziyyat"),
    },
    {
      slug: "fizika-mexanika-sinagi",
      title: "Fizika — Mexanika və elektrik sınağı",
      description: "Sürət, qüvvət, enerji, Om qanunu və istilik hadisələri üzrə qısa sınaq.",
      subject: "fizika", by: "resad-memmedov", grade: 10, diff: "easy" as const,
      startsAt: at(-1, 9), endsAt: at(30, 23), durationMin: 15, neg: "0", attempts: 2, release: "immediate" as const, featured: true,
      questions: bySubject("fizika"),
    },
    {
      slug: "riyaziyyat-dovlet-formatinda-sinaq",
      title: "Riyaziyyat — Dövlət imtahanı formatında sınaq",
      description: "Tək sessiyada keçirilən onlayn sınaq. Nəticələr sınaq bitdikdən sonra açılır.",
      subject: "riyaziyyat", by: "leyla-quliyeva", grade: 11, diff: "hard" as const,
      startsAt: at(5, 10), endsAt: at(5, 13), durationMin: 30, neg: "0.25", attempts: 1, release: "after_end" as const, featured: true,
      questions: bySubject("riyaziyyat").slice(0, 8),
    },
    {
      slug: "dil-fenleri-sinaq",
      title: "Dil fənləri — Azərbaycan və İngilis dili sınağı",
      description: "Qrammatika və leksika üzrə qarışıq sınaq.",
      subject: "ingilis-dili", by: "aysel-ceferova", grade: 11, diff: "easy" as const,
      startsAt: at(9, 11), endsAt: at(9, 14), durationMin: 20, neg: "0", attempts: 1, release: "after_end" as const, featured: true,
      questions: [...bySubject("ingilis-dili"), ...bySubject("azerbaycan-dili")],
    },
    {
      slug: "kimya-giris-sinagi",
      title: "Kimya — Giriş sınağı",
      description: "Atomun quruluşu və maddələr üzrə başlanğıc səviyyə sınağı.",
      subject: "kimya", by: "nigar-eliyeva", grade: 10, diff: "easy" as const,
      startsAt: at(-9, 10), endsAt: at(-2, 20), durationMin: 15, neg: "0", attempts: 1, release: "after_end" as const, featured: false,
      questions: bySubject("kimya"),
    },
  ];
  for (const e of examDefs) {
    const [row] = await db
      .insert(s.exams)
      .values({
        slug: e.slug, title: e.title, description: e.description, subjectId: subjectId[e.subject],
        createdBy: teacherId[e.by], grade: e.grade, difficulty: e.diff, visibility: "public", status: "published",
        startsAt: e.startsAt, endsAt: e.endsAt, durationMin: e.durationMin, passingPercent: "50",
        negativeMarking: e.neg, shuffleQuestions: true, shuffleOptions: true, attemptLimit: e.attempts,
        showExplanations: true, resultRelease: e.release, featured: e.featured,
      })
      .returning({ id: s.exams.id });
    await db.insert(s.examQuestions).values(e.questions.map((questionId, i) => ({ examId: row.id, questionId, orderIndex: i })));
  }

  /* -------------------------- class & content ------------------------- */
  const [cls] = await db.insert(s.classGroups).values({ name: "11-A hazırlıq qrupu", teacherId: teacherId["leyla-quliyeva"], grade: 11 }).returning();
  await db.insert(s.classMembers).values({ classId: cls.id, studentId: student.id });

  await db.insert(s.faqs).values(FAQS.map((f, i) => ({ question: f.q, answer: f.a, sortOrder: i })));
  await db.insert(s.testimonials).values(TESTIMONIALS.map((t, i) => ({ authorName: t.name, authorRole: t.role, quote: t.quote, isPlaceholder: true, sortOrder: i })));
  await db.insert(s.siteSettings).values([
    { key: "contact", value: { email: "info@mhacademy.local", phone: "", address: "Bakı, Azərbaycan", demo: true } },
    { key: "socials", value: { instagram: "", facebook: "", youtube: "", telegram: "" } },
    { key: "features", value: { leaderboard: true, ai_tutor: false } },
  ]);
  await db.insert(s.announcements).values({
    authorId: admin.id, title: "MH Academy platformasına xoş gəlmisiniz",
    body: "Sınaqlara qoşulun, səhvlərinizi təhlil edin və irəliləyişinizi izləyin.", audience: "all",
  });
  await db.insert(s.notifications).values({
    userId: student.id, type: "system", title: "Xoş gəlmisiniz!",
    body: "Hesabınız hazırdır. İlk sınağınıza başlamaq üçün Sınaqlar bölməsinə keçin.", href: "/sinaqlar",
  });

  console.log(`Seeded: ${SUBJECTS.length} subjects, ${TOPICS.length} topics, ${TEACHERS.length} teachers, ${LESSONS.length} lessons, ${QUESTIONS.length} questions, ${examDefs.length} exams.`);
  console.log(`Demo logins (password: ${DEMO_PASSWORD}):`);
  console.log("  admin@demo.mhacademy.local  student@demo.mhacademy.local  leyla@demo.mhacademy.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
