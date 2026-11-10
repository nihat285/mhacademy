import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { classGroups, users } from "./schema";

/** Internal messaging: 1:1 conversations and one group conversation per class. No phone numbers involved. */
export const chatKindEnum = pgEnum("chat_kind", ["direct", "class"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    kind: chatKindEnum("kind").notNull(),
    /** direct: the two participants, stored ordered (userA < userB) so a pair has exactly one conversation. */
    userA: uuid("user_a").references(() => users.id, { onDelete: "cascade" }),
    userB: uuid("user_b").references(() => users.id, { onDelete: "cascade" }),
    /** class: the class the conversation belongs to. */
    classId: uuid("class_id").references(() => classGroups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("conv_direct_uq").on(t.userA, t.userB).where(sql`${t.kind} = 'direct'`),
    uniqueIndex("conv_class_uq").on(t.classId).where(sql`${t.kind} = 'class'`),
    index("conv_last_idx").on(t.lastMessageAt),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete (moderation): the row stays for audit, the text is no longer shown. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("chat_msg_conv_idx").on(t.conversationId, t.createdAt)],
);

export const conversationReads = pgTable(
  "conversation_reads",
  {
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);
