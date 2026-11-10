"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lessonBookmarks, lessonProgress, lessons } from "@/db/schema";
import { AuthError, assertRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export interface LessonActionResult {
  ok: boolean;
  error?: string;
  /** New value for toggles. */
  value?: boolean;
}

const idSchema = z.uuid();
const positionSchema = z.number().finite().min(0).max(60 * 60 * 24);

async function guard(lessonId: unknown): Promise<{ userId: string; lessonId: string } | LessonActionResult> {
  const parsedId = idSchema.safeParse(lessonId);
  if (!parsedId.success) return { ok: false, error: "Dərs tapılmadı." };
  try {
    const user = await assertRole(["student"]);
    // Generous cap: protects the database from a looping client, not from normal viewing.
    if (!(await rateLimit(`lesson-progress:${user.id}`, 240, 600)).ok) return { ok: false, error: "Çox sayda sorğu. Bir az sonra yenidən cəhd edin." };
    const [lesson] = await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, parsedId.data), eq(lessons.published, true))).limit(1);
    if (!lesson) return { ok: false, error: "Dərs tapılmadı." };
    return { userId: user.id, lessonId: lesson.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat yalnız şagirdlər üçündür." };
    throw e;
  }
}

const failed = (r: { userId: string; lessonId: string } | LessonActionResult): r is LessonActionResult => "ok" in r;

/** Saves the playback position. `ended` also marks the lesson completed (it never un-completes one). */
export async function saveLessonProgress(lessonId: string, positionSec: number, ended = false): Promise<LessonActionResult> {
  const g = await guard(lessonId);
  if (failed(g)) return g;
  const pos = positionSchema.safeParse(positionSec);
  if (!pos.success) return { ok: false, error: "Etibarsız mövqe." };
  const position = ended ? 0 : Math.floor(pos.data);
  const now = new Date();
  await db
    .insert(lessonProgress)
    .values({ userId: g.userId, lessonId: g.lessonId, positionSec: position, completed: ended, updatedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: ended ? { positionSec: position, completed: true, updatedAt: now } : { positionSec: position, updatedAt: now },
    });
  return { ok: true };
}

/** Manual "Dərsi tamamladım" toggle. */
export async function setLessonCompleted(lessonId: string, completed: boolean): Promise<LessonActionResult> {
  const g = await guard(lessonId);
  if (failed(g)) return g;
  const done = z.boolean().safeParse(completed);
  if (!done.success) return { ok: false, error: "Etibarsız dəyər." };
  const now = new Date();
  await db
    .insert(lessonProgress)
    .values({ userId: g.userId, lessonId: g.lessonId, positionSec: 0, completed: done.data, updatedAt: now })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { completed: done.data, updatedAt: now } });
  return { ok: true, value: done.data };
}

export async function setLessonBookmark(lessonId: string, bookmarked: boolean): Promise<LessonActionResult> {
  const g = await guard(lessonId);
  if (failed(g)) return g;
  const on = z.boolean().safeParse(bookmarked);
  if (!on.success) return { ok: false, error: "Etibarsız dəyər." };
  if (on.data) {
    await db.insert(lessonBookmarks).values({ userId: g.userId, lessonId: g.lessonId }).onConflictDoNothing();
  } else {
    await db.delete(lessonBookmarks).where(and(eq(lessonBookmarks.userId, g.userId), eq(lessonBookmarks.lessonId, g.lessonId)));
  }
  return { ok: true, value: on.data };
}
