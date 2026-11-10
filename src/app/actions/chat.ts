"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/ui/action-form";
import { db } from "@/db";
import { classGroups, notifications, users } from "@/db/schema";
import { chatMessages, conversationReads, conversations } from "@/db/schema-chat";
import { audit } from "@/lib/audit";
import { AuthError, assertUser } from "@/lib/auth";
import { canDirectMessage, chatBase, containsPhoneNumber, MAX_MESSAGE_LENGTH, orderPair, PHONE_BLOCKED_MESSAGE } from "@/lib/chat-rules";
import { canModerate, getAccessibleConversation } from "@/lib/queries/chat";
import { rateLimit } from "@/lib/rate-limit";
import type { CurrentUser } from "@/lib/session";

async function me(): Promise<CurrentUser | null> {
  try {
    return await assertUser();
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

/** Opens (or reuses) the 1:1 conversation with `otherId`, then goes to it. */
export async function startDirect(otherId: string): Promise<void> {
  const u = await me();
  if (!u || !z.uuid().safeParse(otherId).success) redirect("/giris");
  const [other] = await db.select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, otherId)).limit(1);
  if (!other || other.status !== "active" || !canDirectMessage(u, other)) redirect(chatBase(u.role));
  const [a, b] = orderPair(u.id, other.id);
  let [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "direct"), eq(conversations.userA, a), eq(conversations.userB, b))).limit(1);
  if (!conv) {
    [conv] = await db.insert(conversations).values({ kind: "direct", userA: a, userB: b }).onConflictDoNothing().returning({ id: conversations.id });
    if (!conv) [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "direct"), eq(conversations.userA, a), eq(conversations.userB, b))).limit(1);
  }
  redirect(`${chatBase(u.role)}?c=${conv.id}`);
}

/** Teacher/admin opens the class group chat (created on first use). */
export async function openClassChat(classId: string): Promise<void> {
  const u = await me();
  if (!u || u.role === "student" || !z.uuid().safeParse(classId).success) redirect("/giris");
  const [c] = await db.select({ teacherId: classGroups.teacherId }).from(classGroups).where(eq(classGroups.id, classId)).limit(1);
  if (!c || (u.role !== "admin" && c.teacherId !== u.id)) redirect(chatBase(u.role));
  let [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "class"), eq(conversations.classId, classId))).limit(1);
  if (!conv) {
    [conv] = await db.insert(conversations).values({ kind: "class", classId }).onConflictDoNothing().returning({ id: conversations.id });
    if (!conv) [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "class"), eq(conversations.classId, classId))).limit(1);
    await audit(u.id, "chat.class_open", "class", classId);
  }
  redirect(`${chatBase(u.role)}?c=${conv.id}`);
}

const bodySchema = z.string().trim().min(1, "Mesaj boşdur.").max(MAX_MESSAGE_LENGTH, `Mesaj ən çox ${MAX_MESSAGE_LENGTH} simvol ola bilər.`);

export async function sendMessage(conversationId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const u = await me();
  if (!u) return { error: "Daxil olmaq tələb olunur." };
  const body = bodySchema.safeParse(fd.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };
  if (containsPhoneNumber(body.data)) return { error: PHONE_BLOCKED_MESSAGE };
  if (!(await rateLimit(`chat:${u.id}`, 30, 60)).ok) return { error: "Çox tez yazırsınız. Bir az gözləyin." };
  const conv = await getAccessibleConversation(u, conversationId);
  if (!conv) return { error: "Yazışma tapılmadı." };
  if (conv.kind === "direct") {
    const otherId = conv.userA === u.id ? conv.userB : conv.userA;
    const [o] = otherId ? await db.select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, otherId)).limit(1) : [];
    if (!o || o.status !== "active") return { error: "Bu istifadəçiyə yazmaq mümkün deyil." };
    if (!canDirectMessage(u, o)) return { error: "Bu istifadəçiyə yazmaq mümkün deyil." };
    await db.insert(notifications).values({ userId: o.id, type: "system", title: `${u.name}: yeni mesaj`, body: body.data.slice(0, 120), href: `${chatBase(o.role)}?c=${conv.id}` });
  }
  const now = new Date();
  await db.insert(chatMessages).values({ conversationId: conv.id, senderId: u.id, body: body.data, createdAt: now });
  await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conv.id));
  await db.insert(conversationReads).values({ conversationId: conv.id, userId: u.id, lastReadAt: now }).onConflictDoUpdate({ target: [conversationReads.conversationId, conversationReads.userId], set: { lastReadAt: now } });
  revalidatePath(chatBase(u.role));
  return { ok: true };
}

export async function markRead(conversationId: string): Promise<void> {
  const u = await me();
  if (!u || !z.uuid().safeParse(conversationId).success) return;
  const conv = await getAccessibleConversation(u, conversationId);
  if (!conv) return;
  const now = new Date();
  await db.insert(conversationReads).values({ conversationId, userId: u.id, lastReadAt: now }).onConflictDoUpdate({ target: [conversationReads.conversationId, conversationReads.userId], set: { lastReadAt: now } });
}

export async function deleteChatMessage(messageId: string): Promise<{ ok?: boolean; error?: string }> {
  const u = await me();
  if (!u || !z.uuid().safeParse(messageId).success) return { error: "Daxil olmaq tələb olunur." };
  const [m] = await db.select({ senderId: chatMessages.senderId, conversationId: chatMessages.conversationId }).from(chatMessages).where(eq(chatMessages.id, messageId)).limit(1);
  if (!m) return { error: "Mesaj tapılmadı." };
  const conv = await getAccessibleConversation(u, m.conversationId);
  if (!conv) return { error: "Mesaj tapılmadı." };
  if (m.senderId !== u.id && !canModerate(u, conv)) return { error: "Bu mesajı silmək icazəniz yoxdur." };
  await db.update(chatMessages).set({ deletedAt: new Date() }).where(eq(chatMessages.id, messageId));
  if (m.senderId !== u.id) await audit(u.id, "chat.message_moderated", "message", messageId);
  revalidatePath(chatBase(u.role));
  return { ok: true };
}
