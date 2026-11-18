import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { classGroups, users } from "./schema";

/**
 * Live (online) lessons: a schedule plus an external meeting link (Zoom / Google Meet / Teams).
 * Own file so it can be added to an existing project with one config line
 * (drizzle.config.ts: schema: [..., "./src/db/live-schema.ts"]).
 */
export const liveProviderEnum = pgEnum("live_provider", ["zoom", "meet", "teams", "other"]);
export const liveStatusEnum = pgEnum("live_status", ["scheduled", "cancelled"]);

const id = () => uuid("id").primaryKey().defaultRandom();

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: id(),
    classId: uuid("class_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    provider: liveProviderEnum("provider").notNull().default("other"),
    /** Never rendered into student pages: students reach it only through the join action, inside the join window. */
    joinUrl: text("join_url").notNull(),
    passcode: varchar("passcode", { length: 40 }),
    status: liveStatusEnum("status").notNull().default("scheduled"),
    /** Added after the lesson (link to the recording). */
    recordingUrl: text("recording_url"),
    /** Set when the "starts soon" reminder has been sent, so the scheduler never repeats it. */
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("live_class_start_idx").on(t.classId, t.startsAt),
    index("live_teacher_idx").on(t.teacherId),
    check("live_duration_ck", sql`${t.durationMin} between 15 and 240`),
  ],
);

/** Attendance: the first time a student pressed "Join". */
export const liveJoins = pgTable(
  "live_joins",
  {
    sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.studentId] })],
);
