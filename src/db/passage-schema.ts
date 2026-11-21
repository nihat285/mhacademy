import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { questions, subjects, users } from "./schema";

/**
 * Shared passages for exam questions: a reading text, a listening audio, or both.
 * Several questions can point to one passage ("bu mətnə görə 5 sual").
 * Own file so it can be added with one config line (drizzle.config.ts: schema: [..., "./src/db/passage-schema.ts"]).
 */
export const questionPassages = pgTable(
  "question_passages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 160 }).notNull(),
    /** Reading text shown next to the questions. */
    body: text("body"),
    audioUrl: text("audio_url"),
    /** Audio script. Shown only after the result is released (review page), never during the attempt. */
    transcript: text("transcript"),
    /** Max plays per attempt; null = unlimited. Enforced in the player (soft limit — see README). */
    maxPlays: integer("max_plays"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("passages_subject_idx").on(t.subjectId),
    check("passages_content_ck", sql`${t.body} is not null or ${t.audioUrl} is not null`),
    check("passages_plays_ck", sql`${t.maxPlays} is null or ${t.maxPlays} between 1 and 10`),
  ],
);

/** One passage per question at most (questionId is the primary key). */
export const questionPassageLinks = pgTable(
  "question_passage_links",
  {
    questionId: uuid("question_id").primaryKey().references(() => questions.id, { onDelete: "cascade" }),
    passageId: uuid("passage_id").notNull().references(() => questionPassages.id, { onDelete: "restrict" }),
  },
  (t) => [index("passage_links_passage_idx").on(t.passageId)],
);
