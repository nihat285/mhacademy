import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { subjects, users } from "./schema";

/**
 * Standalone study-material library (PDF notes, formula sheets, test collections …) shown on /materiallar.
 * Separate from `lesson_materials` (files attached to one lesson) and added through its own schema file:
 * drizzle.config.ts → schema: [..., "./src/db/material-schema.ts"].
 */
export const libraryMaterials = pgTable(
  "library_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    /** 1–11, null = all grades. */
    grade: integer("grade"),
    /** "public" = anyone, "members" = signed-in users only. */
    access: varchar("access", { length: 10 }).notNull().default("public"),
    /** Never sent to the browser: downloads go through /materiallar/[id]/yukle, which checks access first. */
    fileUrl: text("file_url").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/pdf"),
    sizeBytes: integer("size_bytes"),
    published: boolean("published").notNull().default(true),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("library_materials_subject_idx").on(t.subjectId),
    index("library_materials_created_idx").on(t.createdAt),
    check("library_materials_access_ck", sql`${t.access} in ('public', 'members')`),
    check("library_materials_grade_ck", sql`${t.grade} is null or ${t.grade} between 1 and 11`),
  ],
);
