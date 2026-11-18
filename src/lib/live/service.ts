import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { liveJoins, liveSessions } from "@/db/live-schema";
import { classGroups, classMembers, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notify";
import { can, type Actor } from "@/lib/permissions";
import { sessionPhase, validateJoinUrl, validateSchedule, type LiveProvider, type Phase } from "./rules";

export class LiveError extends Error {
  constructor(public code: "not_found" | "forbidden" | "invalid" | "closed", message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

type Row = typeof liveSessions.$inferSelect;
type Who = Pick<Actor, "id" | "role" | "permissions">;

const STUDENT_HREF = "/panel/canli-dersler";

/** Admin always; a teacher only with "lessons.manage" and only for their own sessions. */
export function canManageSession(actor: Who, s: Pick<Row, "teacherId">): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "teacher" && can(actor, "lessons.manage") && s.teacherId === actor.id;
}

async function loadOwned(actor: Who, sessionId: string): Promise<Row> {
  const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  // A teacher asking for someone else's session gets "not found", exactly like a missing one.
  if (!s || !canManageSession(actor, s)) throw new LiveError("not_found", "Dərs tapılmadı.");
  return s;
}

async function memberIds(classId: string): Promise<string[]> {
  const rows = await db
    .select({ id: classMembers.studentId })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.studentId))
    .where(and(eq(classMembers.classId, classId), eq(users.status, "active")));
  return rows.map((r) => r.id);
}

async function notifyClass(classId: string, title: string, body: string) {
  const ids = await memberIds(classId);
  await notify(ids.map((userId) => ({ userId, type: "lesson" as const, title, body, href: STUDENT_HREF })));
}

/* ------------------------------ Staff side ------------------------------ */

export interface ClassOption { id: string; name: string; teacherName: string }

/** Classes this actor may schedule for: a teacher's own, or every class for an admin. */
export async function schedulableClasses(actor: Who): Promise<ClassOption[]> {
  if (actor.role === "teacher" && !can(actor, "lessons.manage")) return [];
  const rows = await db
    .select({ id: classGroups.id, name: classGroups.name, teacherName: users.name })
    .from(classGroups)
    .innerJoin(users, eq(users.id, classGroups.teacherId))
    .where(actor.role === "admin" ? undefined : eq(classGroups.teacherId, actor.id))
    .orderBy(asc(classGroups.name));
  return rows;
}

export interface SessionInput {
  classId: string;
  title: string;
  description: string | null;
  startsAt: Date | null;
  durationMin: number;
  joinUrl: string;
  passcode: string | null;
}

function checkInput(i: SessionInput, now: Date, allowPast: boolean) {
  const errors = validateSchedule(i, now, allowPast);
  const url = validateJoinUrl(i.joinUrl);
  if (!url.ok) errors.joinUrl = url.error;
  if (i.passcode && i.passcode.length > 40) errors.passcode = "Parol 40 simvoldan uzun ola bilməz.";
  if (i.description && i.description.length > 2000) errors.description = "Təsvir 2000 simvoldan uzun ola bilməz.";
  if (Object.keys(errors).length || !url.ok) throw new LiveError("invalid", "Formadakı xətaları düzəldin.", errors);
  return url;
}

export async function createSession(actor: Who, input: SessionInput, now = new Date()): Promise<string> {
  const [cls] = await db.select().from(classGroups).where(eq(classGroups.id, input.classId)).limit(1);
  if (!cls) throw new LiveError("invalid", "Sinif tapılmadı.", { classId: "Sinif seçin." });
  if (!canManageSession(actor, { teacherId: cls.teacherId })) throw new LiveError("forbidden", "Bu sinif üçün dərs yarada bilməzsiniz.");
  const url = checkInput(input, now, false);
  const [row] = await db
    .insert(liveSessions)
    .values({
      classId: cls.id, teacherId: cls.teacherId, title: input.title.trim(), description: input.description?.trim() || null,
      startsAt: input.startsAt!, durationMin: input.durationMin, provider: url.provider, joinUrl: url.url, passcode: input.passcode?.trim() || null,
    })
    .returning({ id: liveSessions.id });
  await notifyClass(cls.id, "Yeni canlı dərs", `${input.title.trim()} — ${formatDateTime(input.startsAt!)}`);
  await audit(actor.id, "live.create", "live_session", row.id, { classId: cls.id });
  return row.id;
}

export async function updateSession(actor: Who, sessionId: string, input: Omit<SessionInput, "classId">, now = new Date()): Promise<void> {
  const s = await loadOwned(actor, sessionId);
  if (s.status === "cancelled") throw new LiveError("closed", "Ləğv edilmiş dərsi dəyişmək olmaz.");
  const started = s.startsAt.getTime() <= now.getTime();
  const url = checkInput({ ...input, classId: s.classId }, now, started);
  const moved = input.startsAt!.getTime() !== s.startsAt.getTime();
  await db
    .update(liveSessions)
    .set({
      title: input.title.trim(), description: input.description?.trim() || null, startsAt: input.startsAt!, durationMin: input.durationMin,
      provider: url.provider, joinUrl: url.url, passcode: input.passcode?.trim() || null, updatedAt: now,
      // A new time deserves a new reminder.
      ...(moved ? { remindedAt: null } : {}),
    })
    .where(eq(liveSessions.id, s.id));
  if (moved) await notifyClass(s.classId, "Canlı dərsin vaxtı dəyişdi", `${input.title.trim()} — yeni vaxt: ${formatDateTime(input.startsAt!)}`);
  await audit(actor.id, "live.update", "live_session", s.id, { moved });
}

export async function cancelSession(actor: Who, sessionId: string): Promise<void> {
  const s = await loadOwned(actor, sessionId);
  if (s.status === "cancelled") return;
  await db.update(liveSessions).set({ status: "cancelled", updatedAt: new Date() }).where(eq(liveSessions.id, s.id));
  await notifyClass(s.classId, "Canlı dərs ləğv edildi", `${s.title} (${formatDateTime(s.startsAt)}) ləğv olundu.`);
  await audit(actor.id, "live.cancel", "live_session", s.id);
}

export async function setRecording(actor: Who, sessionId: string, raw: string): Promise<void> {
  const s = await loadOwned(actor, sessionId);
  const value = raw.trim();
  if (value === "") {
    await db.update(liveSessions).set({ recordingUrl: null, updatedAt: new Date() }).where(eq(liveSessions.id, s.id));
    return;
  }
  const url = validateJoinUrl(value);
  if (!url.ok) throw new LiveError("invalid", url.error, { recordingUrl: url.error });
  await db.update(liveSessions).set({ recordingUrl: url.url, updatedAt: new Date() }).where(eq(liveSessions.id, s.id));
  if (!s.recordingUrl) await notifyClass(s.classId, "Dərsin yazısı əlavə olundu", `${s.title} dərsinin yazısına baxa bilərsiniz.`);
}

export interface StaffSession {
  id: string; title: string; className: string; teacherName: string; startsAt: Date; durationMin: number; provider: LiveProvider;
  status: "scheduled" | "cancelled"; phase: Phase; started: boolean; attended: number; members: number; hasRecording: boolean;
}

/** Sessions the actor manages. `when`: "upcoming" (not ended yet, soonest first) or "past" (latest first). */
export async function listStaffSessions(actor: Who, when: "upcoming" | "past", now = new Date(), limit = 100): Promise<StaffSession[]> {
  const cutoff = new Date(now.getTime() - (240 + 15) * 60_000); // nothing longer than the max duration can still be running
  const rows = await db
    .select({
      s: liveSessions, className: classGroups.name, teacherName: users.name,
      attended: sql<number>`(select count(*)::int from ${liveJoins} j where j.session_id = ${liveSessions.id})`,
      members: sql<number>`(select count(*)::int from ${classMembers} m where m.class_id = ${liveSessions.classId})`,
    })
    .from(liveSessions)
    .innerJoin(classGroups, eq(classGroups.id, liveSessions.classId))
    .innerJoin(users, eq(users.id, liveSessions.teacherId))
    .where(and(actor.role === "admin" ? undefined : eq(liveSessions.teacherId, actor.id), when === "upcoming" ? gte(liveSessions.startsAt, cutoff) : lte(liveSessions.startsAt, now)))
    .orderBy(when === "upcoming" ? asc(liveSessions.startsAt) : desc(liveSessions.startsAt))
    .limit(limit);
  const out = rows.map((r) => ({
    id: r.s.id, title: r.s.title, className: r.className, teacherName: r.teacherName, startsAt: r.s.startsAt, durationMin: r.s.durationMin, provider: r.s.provider,
    status: r.s.status, phase: sessionPhase(now, { startsAt: r.s.startsAt, durationMin: r.s.durationMin, cancelled: r.s.status === "cancelled" }), started: r.s.startsAt.getTime() <= now.getTime(),
    attended: r.attended, members: r.members, hasRecording: !!r.s.recordingUrl,
  }));
  // Upcoming view: drop sessions that already ended (the cutoff above is only a cheap pre-filter).
  return when === "upcoming" ? out.filter((x) => x.phase !== "ended") : out;
}

export interface SessionDetail extends Row { className: string; teacherName: string; attendance: { id: string; name: string; joinedAt: Date | null }[] }

export async function getSessionDetail(actor: Who, sessionId: string): Promise<SessionDetail> {
  const s = await loadOwned(actor, sessionId);
  const [meta] = await db
    .select({ className: classGroups.name, teacherName: users.name })
    .from(classGroups)
    .innerJoin(users, eq(users.id, classGroups.teacherId))
    .where(eq(classGroups.id, s.classId));
  const attendance = await db
    .select({ id: users.id, name: users.name, joinedAt: liveJoins.joinedAt })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.studentId))
    .leftJoin(liveJoins, and(eq(liveJoins.sessionId, s.id), eq(liveJoins.studentId, users.id)))
    .where(eq(classMembers.classId, s.classId))
    .orderBy(asc(users.name));
  return { ...s, className: meta.className, teacherName: meta.teacherName, attendance };
}

/* ----------------------------- Student side ----------------------------- */

/** What a student may see. There is deliberately NO joinUrl/passcode here. */
export interface StudentSession {
  id: string; title: string; description: string | null; teacherName: string; className: string; startsAt: Date; durationMin: number;
  provider: LiveProvider; phase: Phase; started: boolean; joined: boolean; recordingUrl: string | null; hasPasscode: boolean;
}

export async function listStudentSessions(studentId: string, now = new Date()): Promise<StudentSession[]> {
  const horizon = new Date(now.getTime() - 30 * 86_400_000);
  const rows = await db
    .select({ s: liveSessions, className: classGroups.name, teacherName: users.name, joinedAt: liveJoins.joinedAt })
    .from(liveSessions)
    .innerJoin(classMembers, and(eq(classMembers.classId, liveSessions.classId), eq(classMembers.studentId, studentId)))
    .innerJoin(classGroups, eq(classGroups.id, liveSessions.classId))
    .innerJoin(users, eq(users.id, liveSessions.teacherId))
    .leftJoin(liveJoins, and(eq(liveJoins.sessionId, liveSessions.id), eq(liveJoins.studentId, studentId)))
    .where(gte(liveSessions.startsAt, horizon))
    .orderBy(asc(liveSessions.startsAt))
    .limit(200);
  return rows.map((r) => {
    const cancelled = r.s.status === "cancelled";
    return {
      id: r.s.id, title: r.s.title, description: r.s.description, teacherName: r.teacherName, className: r.className, startsAt: r.s.startsAt, durationMin: r.s.durationMin,
      provider: r.s.provider, phase: sessionPhase(now, { startsAt: r.s.startsAt, durationMin: r.s.durationMin, cancelled }),
      started: r.s.startsAt.getTime() <= now.getTime(), joined: !!r.joinedAt, recordingUrl: cancelled ? null : r.s.recordingUrl, hasPasscode: !!r.s.passcode,
    };
  });
}

/** The ONLY place a student gets the link: member of the class, not cancelled, inside the join window. Records attendance. */
export async function joinSession(studentId: string, sessionId: string, now = new Date()): Promise<{ url: string; passcode: string | null }> {
  const [row] = await db
    .select({ s: liveSessions })
    .from(liveSessions)
    .innerJoin(classMembers, and(eq(classMembers.classId, liveSessions.classId), eq(classMembers.studentId, studentId)))
    .innerJoin(users, and(eq(users.id, studentId), eq(users.status, "active")))
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!row) throw new LiveError("not_found", "Dərs tapılmadı.");
  const s = row.s;
  const phase = sessionPhase(now, { startsAt: s.startsAt, durationMin: s.durationMin, cancelled: s.status === "cancelled" });
  if (phase === "cancelled") throw new LiveError("closed", "Bu dərs ləğv edilib.");
  if (phase === "upcoming") throw new LiveError("closed", "Dərsə qoşulmaq dərsdən 10 dəqiqə əvvəl açılır.");
  if (phase === "ended") throw new LiveError("closed", "Bu dərs artıq bitib.");
  await db.insert(liveJoins).values({ sessionId: s.id, studentId, joinedAt: now }).onConflictDoNothing();
  return { url: s.joinUrl, passcode: s.passcode };
}

/* -------------------------------- Reminders ------------------------------- */

export const REMINDER_LEAD_MIN = 30;

/** Run every few minutes from a scheduler. Each session is reminded once (claimed atomically, so overlapping runs cannot double-send). */
export async function sendDueReminders(now = new Date()): Promise<number> {
  const until = new Date(now.getTime() + REMINDER_LEAD_MIN * 60_000);
  const claimed = await db
    .update(liveSessions)
    .set({ remindedAt: now })
    .where(and(eq(liveSessions.status, "scheduled"), isNull(liveSessions.remindedAt), gte(liveSessions.startsAt, now), lte(liveSessions.startsAt, until)))
    .returning({ id: liveSessions.id, classId: liveSessions.classId, title: liveSessions.title, startsAt: liveSessions.startsAt });
  for (const c of claimed) await notifyClass(c.classId, "Canlı dərs tezliklə başlayır", `${c.title} — ${formatDateTime(c.startsAt)}. Qoşulmaq üçün “Canlı dərslər” bölməsinə keçin.`);
  return claimed.length;
}
