import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { liveJoins, liveSessions } from "@/db/live-schema";
import { classGroups, classMembers, notifications, users } from "@/db/schema";
import {
  cancelSession, createSession, getSessionDetail, joinSession, listStaffSessions, listStudentSessions, schedulableClasses, sendDueReminders, setRecording, updateSession,
  type SessionInput,
} from "@/lib/live/service";

const tag = `live-${Date.now()}`;
const ids: Record<string, string> = {};
let classId: string, otherClassId: string;
const perms = (...p: string[]) => new Set(p);
const teacher = () => ({ id: ids.t, role: "teacher" as const, permissions: perms("lessons.manage") });
const teacher2 = () => ({ id: ids.t2, role: "teacher" as const, permissions: perms("lessons.manage") });
const noPerm = () => ({ id: ids.t, role: "teacher" as const, permissions: perms() });
const admin = () => ({ id: ids.a, role: "admin" as const, permissions: perms() });

const URL_OK = "https://meet.google.com/abc-defg-hij";
const input = (over: Partial<SessionInput> = {}, minutesFromNow = 120): SessionInput => ({
  classId, title: "Riyaziyyat: tənliklər", description: null, startsAt: new Date(Date.now() + minutesFromNow * 60_000), durationMin: 60, joinUrl: URL_OK, passcode: null, ...over,
});

async function mk(key: string, role: "student" | "teacher" | "admin", status: "active" | "suspended" = "active") {
  const [u] = await db.insert(users).values({ email: `${tag}-${key}@test.local`, name: `Test ${key}`, passwordHash: "x", role, status }).returning({ id: users.id });
  ids[key] = u.id;
}
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ code });
const titles = async (userId: string) => (await db.select({ t: notifications.title }).from(notifications).where(eq(notifications.userId, userId))).map((r) => r.t);

beforeAll(async () => {
  await mk("t", "teacher"); await mk("t2", "teacher"); await mk("a", "admin");
  await mk("s1", "student"); await mk("s2", "student"); await mk("s3", "student"); await mk("sx", "student", "suspended");
  const [c] = await db.insert(classGroups).values({ name: `Sinif ${tag}`, teacherId: ids.t }).returning({ id: classGroups.id });
  const [o] = await db.insert(classGroups).values({ name: `Başqa ${tag}`, teacherId: ids.t2 }).returning({ id: classGroups.id });
  classId = c.id; otherClassId = o.id;
  await db.insert(classMembers).values([ids.s1, ids.s2, ids.sx].map((studentId) => ({ classId, studentId })));
  await db.insert(classMembers).values({ classId: otherClassId, studentId: ids.s3 });
});

afterAll(async () => {
  await db.delete(classGroups).where(inArray(classGroups.id, [classId, otherClassId]));
  await db.delete(users).where(inArray(users.id, Object.values(ids)));
  await pool.end();
});

describe("creating sessions", () => {
  it("a teacher can schedule only for their own classes; the admin for any", async () => {
    await rejects(createSession(teacher(), input({ classId: otherClassId })), "forbidden");
    await rejects(createSession(noPerm(), input()), "forbidden");
    expect((await schedulableClasses(teacher())).map((c) => c.id)).toEqual([classId]);
    expect((await schedulableClasses(noPerm()))).toEqual([]);
    const id = await createSession(admin(), input({ classId: otherClassId, title: "Admin yaratdı" }));
    const [row] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    expect(row.teacherId).toBe(ids.t2); // belongs to the class's teacher
  });
  it("validates link, time and duration with field errors", async () => {
    const err = await createSession(teacher(), input({ joinUrl: "http://zoom.us/j/1", title: "ab", durationMin: 5, startsAt: new Date(Date.now() - 3_600_000) })).catch((e) => e);
    expect(err.code).toBe("invalid");
    expect(Object.keys(err.fieldErrors).sort()).toEqual(["durationMin", "joinUrl", "startsAt", "title"]);
  });
  it("tells class members (active ones) about a new lesson", async () => {
    await createSession(teacher(), input({ title: "Bildiriş testi" }));
    expect(await titles(ids.s1)).toContain("Yeni canlı dərs");
    const bodies = async (u: string) => (await db.select({ b: notifications.body }).from(notifications).where(eq(notifications.userId, u))).map((r) => r.b ?? "");
    expect((await bodies(ids.s1)).some((b) => b.includes("Bildiriş testi"))).toBe(true);
    expect((await bodies(ids.s3)).some((b) => b.includes("Bildiriş testi"))).toBe(false); // a different class
    expect((await bodies(ids.sx)).some((b) => b.includes("Bildiriş testi"))).toBe(false); // suspended
  });
});

describe("what students can see and do", () => {
  let sid: string;
  beforeAll(async () => { sid = await createSession(teacher(), input({ title: "Qoşulma testi", passcode: "9988" }, 120)); });

  it("lists lessons only for the student's own class and never exposes the link", async () => {
    const mine = (await listStudentSessions(ids.s1)).find((s) => s.id === sid)!;
    expect(mine).toBeTruthy();
    expect(JSON.stringify(mine)).not.toContain("meet.google.com");
    expect(JSON.stringify(mine)).not.toContain("9988");
    expect((await listStudentSessions(ids.s3)).some((s) => s.id === sid)).toBe(false);
  });
  it("refuses to join before the window opens, and records nothing", async () => {
    await rejects(joinSession(ids.s1, sid), "closed");
    expect(await db.select().from(liveJoins).where(eq(liveJoins.sessionId, sid))).toHaveLength(0);
  });
  it("opens 10 minutes before the start, hands out the link and records attendance once", async () => {
    const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    const at = new Date(s.startsAt.getTime() - 9 * 60_000);
    const r = await joinSession(ids.s1, sid, at);
    expect(r).toEqual({ url: URL_OK, passcode: "9988" });
    await joinSession(ids.s1, sid, new Date(at.getTime() + 60_000)); // second click
    const rows = await db.select().from(liveJoins).where(eq(liveJoins.sessionId, sid));
    expect(rows).toHaveLength(1);
    expect(rows[0].joinedAt.getTime()).toBe(at.getTime()); // the FIRST time is kept
    await rejects(joinSession(ids.s1, sid, new Date(s.startsAt.getTime() - 11 * 60_000)), "closed");
  });
  it("closes 15 minutes after the planned end", async () => {
    const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    await rejects(joinSession(ids.s2, sid, new Date(s.startsAt.getTime() + (60 + 16) * 60_000)), "closed");
    await joinSession(ids.s2, sid, new Date(s.startsAt.getTime() + (60 + 14) * 60_000));
  });
  it("never lets outsiders or suspended students in", async () => {
    const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    const at = new Date(s.startsAt.getTime());
    await rejects(joinSession(ids.s3, sid, at), "not_found"); // other class
    await rejects(joinSession(ids.sx, sid, at), "not_found"); // suspended
    await rejects(joinSession(ids.t, sid, at), "not_found"); // staff are not class members
  });
  it("cancelled lessons cannot be joined and members are told", async () => {
    const id = await createSession(teacher(), input({ title: "Ləğv ediləcək" }, 5));
    await cancelSession(teacher(), id);
    await rejects(joinSession(ids.s1, id), "closed");
    expect(await titles(ids.s1)).toContain("Canlı dərs ləğv edildi");
    await rejects(updateSession(teacher(), id, { ...input(), classId: undefined } as never), "closed");
  });
});

describe("managing sessions", () => {
  let sid: string;
  beforeAll(async () => { sid = await createSession(teacher(), input({ title: "İdarə testi" }, 300)); });

  it("hides other teachers' sessions as if they did not exist", async () => {
    await rejects(getSessionDetail(teacher2(), sid), "not_found");
    await rejects(updateSession(teacher2(), sid, { title: "Hack", description: null, startsAt: new Date(Date.now() + 7_200_000), durationMin: 60, joinUrl: URL_OK, passcode: null }), "not_found");
    await rejects(cancelSession(teacher2(), sid), "not_found");
    await rejects(setRecording(teacher2(), sid, "https://example.com/r"), "not_found");
    expect((await listStaffSessions(teacher2(), "upcoming")).some((s) => s.id === sid)).toBe(false);
    expect((await listStaffSessions(admin(), "upcoming")).some((s) => s.id === sid)).toBe(true);
  });
  it("rescheduling notifies the class and re-arms the reminder", async () => {
    const [before] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    await db.update(liveSessions).set({ remindedAt: new Date() }).where(eq(liveSessions.id, sid));
    await updateSession(teacher(), sid, { title: "İdarə testi", description: "yeni", startsAt: new Date(before.startsAt.getTime() + 3_600_000), durationMin: 90, joinUrl: "https://us02web.zoom.us/j/555", passcode: null });
    const [after] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    expect(after.provider).toBe("zoom");
    expect(after.remindedAt).toBeNull();
    expect(await titles(ids.s2)).toContain("Canlı dərsin vaxtı dəyişdi");
  });
  it("shows attendance for every class member", async () => {
    const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    await joinSession(ids.s1, sid, s.startsAt);
    const d = await getSessionDetail(teacher(), sid);
    expect(d.attendance.find((a) => a.id === ids.s1)?.joinedAt).toBeTruthy();
    expect(d.attendance.find((a) => a.id === ids.s2)?.joinedAt).toBeNull();
  });
  it("stores a recording link only if it is a safe https URL, and announces the first one", async () => {
    await rejects(setRecording(teacher(), sid, "javascript:alert(1)"), "invalid");
    await setRecording(teacher(), sid, "https://example.com/rec/1");
    expect(await titles(ids.s1)).toContain("Dərsin yazısı əlavə olundu");
    await setRecording(teacher(), sid, "");
    const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sid));
    expect(s.recordingUrl).toBeNull();
  });
});

describe("reminders", () => {
  it("sends once, only for lessons starting within 30 minutes, even when runs overlap", async () => {
    const soon = await createSession(teacher(), input({ title: "Tezliklə" }, 20));
    const later = await createSession(teacher(), input({ title: "Sonra" }, 200));
    const [a, b] = await Promise.all([sendDueReminders(), sendDueReminders()]);
    expect(a + b).toBeGreaterThanOrEqual(1);
    const rows = await db.select({ id: liveSessions.id, r: liveSessions.remindedAt }).from(liveSessions).where(inArray(liveSessions.id, [soon, later]));
    expect(rows.find((x) => x.id === soon)?.r).not.toBeNull();
    expect(rows.find((x) => x.id === later)?.r).toBeNull();
    const n = (await db.select().from(notifications).where(and(eq(notifications.userId, ids.s1), eq(notifications.title, "Canlı dərs tezliklə başlayır")))).length;
    expect(n).toBe(1);
    expect(await sendDueReminders()).toBe(0);
  });
});
