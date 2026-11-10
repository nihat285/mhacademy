import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classGroups, classMembers, users } from "@/db/schema";
import { chatMessages, conversationReads, conversations } from "@/db/schema-chat";
import type { Role } from "@/lib/permissions";

type Me = { id: string; role: Role };
export type Conversation = typeof conversations.$inferSelect;

/** Returns the conversation only if `me` may take part in it (participant, class member/teacher, or admin). */
export async function getAccessibleConversation(me: Me, id: string): Promise<(Conversation & { classTeacherId: string | null }) | null> {
  const [c] = await db
    .select({ c: conversations, classTeacherId: classGroups.teacherId })
    .from(conversations)
    .leftJoin(classGroups, eq(classGroups.id, conversations.classId))
    .where(eq(conversations.id, id))
    .limit(1);
  if (!c) return null;
  const conv = { ...c.c, classTeacherId: c.classTeacherId };
  if (conv.kind === "direct") return conv.userA === me.id || conv.userB === me.id ? conv : null;
  if (me.role === "admin" || conv.classTeacherId === me.id) return conv;
  if (!conv.classId) return null;
  const [m] = await db.select({ x: sql`1` }).from(classMembers).where(and(eq(classMembers.classId, conv.classId), eq(classMembers.studentId, me.id))).limit(1);
  return m ? conv : null;
}

/** Whether `me` moderates the conversation (may delete others' messages). */
export const canModerate = (me: Me, conv: { kind: string; classTeacherId: string | null }) => me.role === "admin" || (conv.kind === "class" && conv.classTeacherId === me.id);

export async function listConversations(me: Me) {
  const memberClassIds = db.select({ id: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, me.id));
  const ownClassIds = db.select({ id: classGroups.id }).from(classGroups).where(eq(classGroups.teacherId, me.id));
  const visible =
    me.role === "admin"
      ? undefined
      : or(and(eq(conversations.kind, "direct"), or(eq(conversations.userA, me.id), eq(conversations.userB, me.id))), and(eq(conversations.kind, "class"), or(inArray(conversations.classId, memberClassIds), inArray(conversations.classId, ownClassIds))));
  // Admins see their own direct chats plus every class chat (moderation); not other people's private chats.
  const adminScope = or(and(eq(conversations.kind, "direct"), or(eq(conversations.userA, me.id), eq(conversations.userB, me.id))), eq(conversations.kind, "class"));
  const rows = await db
    .select({
      id: conversations.id,
      kind: conversations.kind,
      userA: conversations.userA,
      userB: conversations.userB,
      className: classGroups.name,
      lastMessageAt: conversations.lastMessageAt,
      lastBody: sql<string | null>`(select m.body from ${chatMessages} m where m.conversation_id = ${conversations.id} and m.deleted_at is null order by m.created_at desc limit 1)`,
      unread: sql<number>`(select count(*)::int from ${chatMessages} m where m.conversation_id = ${conversations.id} and m.deleted_at is null and m.sender_id is distinct from ${me.id}::uuid and m.created_at > coalesce((select r.last_read_at from ${conversationReads} r where r.conversation_id = ${conversations.id} and r.user_id = ${me.id}::uuid), 'epoch'))`,
    })
    .from(conversations)
    .leftJoin(classGroups, eq(classGroups.id, conversations.classId))
    .where(me.role === "admin" ? adminScope : visible)
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  const otherIds = [...new Set(rows.flatMap((r) => (r.kind === "direct" ? [r.userA === me.id ? r.userB : r.userA] : [])).filter((x): x is string => !!x))];
  const people = otherIds.length ? await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, otherIds)) : [];
  const byId = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => {
    const other = r.kind === "direct" ? byId.get((r.userA === me.id ? r.userB : r.userA) ?? "") : undefined;
    return { id: r.id, kind: r.kind, title: r.kind === "class" ? (r.className ?? "Sinif çatı") : (other?.name ?? "Silinmiş istifadəçi"), subtitle: other?.role, lastBody: r.lastBody, lastMessageAt: r.lastMessageAt, unread: r.unread };
  });
}

export async function getThread(me: Me, conv: Conversation) {
  const rows = await db
    .select({ id: chatMessages.id, senderId: chatMessages.senderId, sender: users.name, role: users.role, body: chatMessages.body, createdAt: chatMessages.createdAt, deletedAt: chatMessages.deletedAt })
    .from(chatMessages)
    .leftJoin(users, eq(users.id, chatMessages.senderId))
    .where(eq(chatMessages.conversationId, conv.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(100);
  return rows.reverse().map((m) => ({ ...m, mine: m.senderId === me.id }));
}

/** People `me` may start a direct conversation with. */
export async function listContacts(me: Me, q?: string) {
  const like = q ? `%${q.replace(/[%_\\]/g, "")}%` : undefined;
  const nameFilter = like ? or(ilike(users.name, like), ilike(users.email, like)) : undefined;
  const base = and(eq(users.status, "active"), ne(users.id, me.id), nameFilter);
  if (me.role === "student") {
    return db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(and(base, inArray(users.role, ["teacher", "admin"]))).orderBy(asc(users.name)).limit(40);
  }
  if (me.role === "admin") {
    return db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(base).orderBy(asc(users.role), asc(users.name)).limit(40);
  }
  // teacher: other staff + students of their own classes
  const myStudents = db
    .select({ id: classMembers.studentId })
    .from(classMembers)
    .innerJoin(classGroups, eq(classGroups.id, classMembers.classId))
    .where(eq(classGroups.teacherId, me.id));
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(base, or(inArray(users.role, ["teacher", "admin"]), inArray(users.id, myStudents))))
    .orderBy(asc(users.role), asc(users.name))
    .limit(40);
}

/** Unread messages across every conversation the user can see (one lean query; used for the menu badge). */
export async function unreadTotal(me: Me): Promise<number> {
  const isAdmin = me.role === "admin";
  const res = await db.execute<{ n: number }>(sql`
    select count(*)::int as n
    from ${chatMessages} m
    join ${conversations} c on c.id = m.conversation_id
    left join ${classGroups} g on g.id = c.class_id
    left join ${conversationReads} r on r.conversation_id = c.id and r.user_id = ${me.id}::uuid
    where m.deleted_at is null
      and m.sender_id is distinct from ${me.id}::uuid
      and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
      and (
        (c.kind = 'direct' and (c.user_a = ${me.id}::uuid or c.user_b = ${me.id}::uuid))
        or (c.kind = 'class' and (
          ${isAdmin} or g.teacher_id = ${me.id}::uuid
          or exists (select 1 from ${classMembers} cm where cm.class_id = c.class_id and cm.student_id = ${me.id}::uuid)
        ))
      )`);
  return res.rows[0]?.n ?? 0;
}
