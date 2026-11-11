import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "true_false",
  "numeric",
  // Extension points (not yet gradable): "matching", "written"
]);
export const videoProviderEnum = pgEnum("video_provider", ["youtube", "vimeo", "mp4", "embed"]);
export const visibilityEnum = pgEnum("exam_visibility", ["public", "private", "assigned"]);
export const examStatusEnum = pgEnum("exam_status", ["draft", "published", "archived"]);
export const resultReleaseEnum = pgEnum("result_release", ["immediate", "after_end", "manual"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "auto_submitted"]);
export const tokenTypeEnum = pgEnum("token_type", ["verify_email", "reset_password"]);
export const audienceEnum = pgEnum("audience", ["all", "students", "teachers", "class"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* -------------------------------------------------------------------------- */
/*  Identity, sessions, permissions                                           */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    role: roleEnum("role").notNull().default("student"),
    status: userStatusEnum("status").notNull().default("active"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`), index("users_role_idx").on(t.role)],
);

/** Server-side sessions. The cookie holds a random token; only its SHA-256 is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** Single-use email verification / password reset tokens (hashed). */
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: tokenTypeEnum("type").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_tokens_hash_uq").on(t.tokenHash), index("email_tokens_user_idx").on(t.userId)],
);

/** Fixed-window rate limiting that works across server instances. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 200 }).notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/** Granular capabilities granted by an admin (mainly to teachers). */
export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 64 }).notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permission] })],
);

/* -------------------------------------------------------------------------- */
/*  Profiles                                                                  */
/* -------------------------------------------------------------------------- */

export const studentProfiles = pgTable("student_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  grade: integer("grade"),
  goals: text("goals"),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveOn: varchar("last_active_on", { length: 10 }), // YYYY-MM-DD
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  displayAlias: varchar("display_alias", { length: 40 }),
  updatedAt: updatedAt(),
});

export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    headline: varchar("headline", { length: 200 }),
    bio: text("bio"),
    qualifications: text("qualifications"),
    experienceYears: integer("experience_years"),
    photoUrl: text("photo_url"),
    officeHours: text("office_hours"),
    contactEmail: varchar("contact_email", { length: 255 }),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("teacher_slug_uq").on(t.slug)],
);

/* -------------------------------------------------------------------------- */
/*  Curriculum: subjects, topics, courses, lessons                            */
/* -------------------------------------------------------------------------- */

export const subjects = pgTable(
  "subjects",
  {
    id: id(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    accent: varchar("accent", { length: 9 }).default("#C9A24B"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("subjects_slug_uq").on(t.slug)],
);

export const teacherSubjects = pgTable(
  "teacher_subjects",
  {
    teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teacherId, t.subjectId] })],
);

export const studentSubjects = pgTable(
  "student_subjects",
  {
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.subjectId] })],
);

export const topics = pgTable(
  "topics",
  {
    id: id(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("topics_subject_slug_uq").on(t.subjectId, t.slug), index("topics_parent_idx").on(t.parentId)],
);

export const courses = pgTable(
  "courses",
  {
    id: id(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id").references(() => users.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 140 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    grade: integer("grade"),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("courses_slug_uq").on(t.slug), index("courses_subject_idx").on(t.subjectId)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    teacherId: uuid("teacher_id").references(() => users.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    /** Written lesson notes (markdown-lite). Shown under the video, or alone when no video is attached yet. */
    notes: text("notes"),
    provider: videoProviderEnum("provider").notNull().default("youtube"),
    /** Provider video id (e.g. YouTube id), or an embed/mp4 URL for those providers. */
    videoRef: text("video_ref"),
    durationSec: integer("duration_sec").notNull().default(0),
    thumbnailUrl: text("thumbnail_url"),
    orderIndex: integer("order_index").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("lessons_slug_uq").on(t.slug),
    index("lessons_subject_idx").on(t.subjectId),
    index("lessons_topic_idx").on(t.topicId),
  ],
);

export const lessonMaterials = pgTable("lesson_materials", {
  id: id(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  createdAt: createdAt(),
});

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    positionSec: integer("position_sec").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const lessonBookmarks = pgTable(
  "lesson_bookmarks",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/* -------------------------------------------------------------------------- */
/*  Question bank                                                             */
/* -------------------------------------------------------------------------- */

export const questions = pgTable(
  "questions",
  {
    id: id(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    type: questionTypeEnum("type").notNull().default("mcq"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    text: text("text").notNull(),
    imageUrl: text("image_url"),
    /** Solution walk-through shown only at review stage. */
    explanation: text("explanation"),
    /** Step-by-step solution lines, shown only at review stage. */
    steps: jsonb("steps").$type<string[]>(),
    /** Concept being tested (shown in mistake analysis). */
    concept: varchar("concept", { length: 200 }),
    points: numeric("points", { precision: 6, scale: 2 }).notNull().default("1"),
    /** For numeric questions. NEVER sent to the browser before review. */
    numericAnswer: numeric("numeric_answer", { precision: 20, scale: 6 }),
    numericTolerance: numeric("numeric_tolerance", { precision: 20, scale: 6 }).default("0"),
    source: varchar("source", { length: 200 }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    relatedLessonId: uuid("related_lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("questions_subject_idx").on(t.subjectId),
    index("questions_topic_idx").on(t.topicId),
    index("questions_author_idx").on(t.authorId),
  ],
);

/** Answer options. `isCorrect` is the server-only answer key. */
export const questionOptions = pgTable(
  "question_options",
  {
    id: id(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    /** Why this distractor is wrong (mistake analysis). */
    whyWrong: text("why_wrong"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("options_question_idx").on(t.questionId)],
);

export const questionBookmarks = pgTable(
  "question_bookmarks",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);

/** Practice-mode answers (daily question, topic practice, mistake retries). */
export const practiceAnswers = pgTable(
  "practice_answers",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id, { onDelete: "set null" }),
    numericValue: numeric("numeric_value", { precision: 20, scale: 6 }),
    isCorrect: boolean("is_correct").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("practice_user_q_idx").on(t.userId, t.questionId)],
);

/* -------------------------------------------------------------------------- */
/*  Classes (teacher-scoped groups)                                           */
/* -------------------------------------------------------------------------- */

export const classGroups = pgTable("class_groups", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grade: integer("grade"),
  createdAt: createdAt(),
});

export const classMembers = pgTable(
  "class_members",
  {
    classId: uuid("class_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] })],
);

/* -------------------------------------------------------------------------- */
/*  Exams                                                                     */
/* -------------------------------------------------------------------------- */

export const exams = pgTable(
  "exams",
  {
    id: id(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    grade: integer("grade"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    status: examStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull(),
    /** Percentage (0-100) required to pass. */
    passingPercent: numeric("passing_percent", { precision: 5, scale: 2 }).notNull().default("50"),
    /** Fraction of a question's points deducted for a wrong answer (0 = off, 0.25 = -¼). */
    negativeMarking: numeric("negative_marking", { precision: 4, scale: 3 }).notNull().default("0"),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
    shuffleOptions: boolean("shuffle_options").notNull().default(true),
    attemptLimit: integer("attempt_limit").notNull().default(1),
    showExplanations: boolean("show_explanations").notNull().default(true),
    resultRelease: resultReleaseEnum("result_release").notNull().default("immediate"),
    resultsReleasedAt: timestamp("results_released_at", { withTimezone: true }),
    featured: boolean("featured").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("exams_slug_uq").on(t.slug),
    index("exams_window_idx").on(t.startsAt, t.endsAt),
    index("exams_subject_idx").on(t.subjectId),
  ],
);

export const examQuestions = pgTable(
  "exam_questions",
  {
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull().default(0),
    /** Optional per-exam override of the question's points. */
    pointsOverride: numeric("points_override", { precision: 6, scale: 2 }),
  },
  (t) => [primaryKey({ columns: [t.examId, t.questionId] })],
);

export const examAssignments = pgTable(
  "exam_assignments",
  {
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => users.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classGroups.id, { onDelete: "cascade" }),
    id: id(),
  },
  (t) => [index("assign_exam_idx").on(t.examId), index("assign_student_idx").on(t.studentId), index("assign_class_idx").on(t.classId)],
);

export const examRegistrations = pgTable(
  "exam_registrations",
  {
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.examId, t.userId] })],
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: id(),
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull(),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** min(startedAt + duration, exam.endsAt). The server enforces this, not the browser. */
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** Frozen per-attempt ordering (question ids, and option ids per question). */
    questionOrder: jsonb("question_order").$type<string[]>().notNull(),
    optionOrder: jsonb("option_order").$type<Record<string, string[]>>().notNull(),
    // Result snapshot — written once, inside the grading transaction.
    score: numeric("score", { precision: 8, scale: 2 }),
    maxScore: numeric("max_score", { precision: 8, scale: 2 }),
    percentage: numeric("percentage", { precision: 5, scale: 2 }),
    correctCount: integer("correct_count"),
    incorrectCount: integer("incorrect_count"),
    unansweredCount: integer("unanswered_count"),
    passed: boolean("passed"),
    timeSpentSec: integer("time_spent_sec"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("attempt_no_uq").on(t.examId, t.userId, t.attemptNo),
    // At most one open attempt per student per exam (guards concurrent "start" requests).
    uniqueIndex("attempt_one_open_uq").on(t.examId, t.userId).where(sql`${t.status} = 'in_progress'`),
    index("attempt_user_idx").on(t.userId, t.submittedAt),
    index("attempt_exam_idx").on(t.examId),
  ],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    attemptId: uuid("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id, { onDelete: "set null" }),
    numericValue: numeric("numeric_value", { precision: 20, scale: 6 }),
    flagged: boolean("flagged").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    // Filled at grading time.
    isCorrect: boolean("is_correct"),
    pointsAwarded: numeric("points_awarded", { precision: 6, scale: 2 }),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] }), index("answers_question_idx").on(t.questionId)],
);

/* -------------------------------------------------------------------------- */
/*  Engagement                                                                */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.createdAt)],
);

export const announcements = pgTable("announcements", {
  id: id(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  audience: audienceEnum("audience").notNull().default("all"),
  classId: uuid("class_id").references(() => classGroups.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.code] })],
);

/* -------------------------------------------------------------------------- */
/*  Site content & operations                                                 */
/* -------------------------------------------------------------------------- */

export const testimonials = pgTable("testimonials", {
  id: id(),
  authorName: varchar("author_name", { length: 160 }).notNull(),
  authorRole: varchar("author_role", { length: 160 }),
  quote: text("quote").notNull(),
  /** True until a real, consented testimonial replaces it; the UI labels these clearly. */
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 80 }).notNull(),
    entity: varchar("entity", { length: 60 }),
    entityId: varchar("entity_id", { length: 80 }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)],
);

/** Messages submitted through the public contact form. */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    message: text("message").notNull(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("contact_created_idx").on(t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/*  Admission (keçid) scores — imported from the official yearly publication  */
/* -------------------------------------------------------------------------- */

export const admissionScores = pgTable(
  "admission_scores",
  {
    id: id(),
    year: integer("year").notNull(),
    /** Entrance group: 2 = II, 3 = III, 4 = IV, 5 = V. */
    groupNo: integer("group_no").notNull(),
    /** Language section of the publication: "az" or "ru". */
    lang: varchar("lang", { length: 2 }).notNull(),
    university: varchar("university", { length: 240 }).notNull(),
    /** Position in the official publication (DİM order: universities and specialties as printed). */
    sortOrder: integer("sort_order").notNull().default(0),
    code: varchar("code", { length: 8 }).notNull(),
    name: varchar("name", { length: 400 }).notNull(),
    /** "full" = əyani, "part" = qiyabi. */
    studyForm: varchar("study_form", { length: 4 }).notNull(),
    /** Number of asterisks next to the code: 1 = special ability exam, 2 = scored ability exam (a/b scores). */
    special: integer("special").notNull().default(0),
    /** Raw values as published ("326.2", "6/60"). Null = "-". */
    scoreText: varchar("score_text", { length: 20 }),
    stateText: varchar("state_text", { length: 20 }),
    /** True when the publication shows no parenthesised value (paid-only specialty). */
    paidOnly: boolean("paid_only").notNull().default(false),
    /** Numeric values for filtering/sorting (for "a/b" scores: the test score b). */
    score: numeric("score", { precision: 6, scale: 1 }),
    stateScore: numeric("state_score", { precision: 6, scale: 1 }),
    /** "Subbakalavr ixtisasları üzrə" line under the specialty, when present. */
    subScore: varchar("sub_score", { length: 20 }),
    subState: varchar("sub_state", { length: 20 }),
  },
  (t) => [
    uniqueIndex("admission_year_code_lang_uq").on(t.year, t.code, t.lang),
    index("admission_year_group_idx").on(t.year, t.groupNo),
    index("admission_university_idx").on(t.university),
  ],
);
