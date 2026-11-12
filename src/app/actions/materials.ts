"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { lessonMaterials, lessons } from "@/db/schema";
import { audit } from "@/lib/audit";
import { AuthError, assertPermission } from "@/lib/auth";
import type { CurrentUser } from "@/lib/session";

type Res = { ok?: boolean; error?: string };

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_LESSON = 20;
/** Only files stored in our own Vercel Blob store may be registered (never arbitrary URLs). */
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

const addSchema = z.object({
  lessonId: z.uuid(),
  title: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(120, "Ad çox uzundur."),
  url: z.string().url().max(1000),
  size: z.number().int().positive().max(MAX_BYTES, "Fayl 10 MB-dan böyükdür."),
});

async function actor(): Promise<CurrentUser | Res> {
  try {
    return await assertPermission("lessons.manage");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}
const isRes = (v: CurrentUser | Res): v is Res => "error" in v && !("id" in v);

/** The lesson must exist and belong to the acting teacher (admins: any lesson). */
async function ownedLesson(u: CurrentUser, lessonId: string) {
  const [l] = await db.select({ id: lessons.id, teacherId: lessons.teacherId }).from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!l) return null;
  return u.role === "admin" || l.teacherId === u.id ? l : null;
}

export async function addLessonMaterial(input: { lessonId: string; title: string; url: string; size: number }): Promise<Res> {
  const u = await actor();
  if (isRes(u)) return u;
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Məlumat yanlışdır." };
  const { lessonId, title, url, size } = parsed.data;
  let host: string;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") throw new Error();
    host = parsedUrl.hostname;
  } catch {
    return { error: "Fayl ünvanı yanlışdır." };
  }
  if (!BLOB_HOST.test(host) || !new URL(url).pathname.startsWith("/materials/")) return { error: "Fayl ünvanı qəbul olunmur." };
  if (!(await ownedLesson(u, lessonId))) return { error: "Dərs tapılmadı." };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(lessonMaterials).where(eq(lessonMaterials.lessonId, lessonId));
  if (n >= MAX_PER_LESSON) return { error: `Bir dərsə ən çox ${MAX_PER_LESSON} material əlavə etmək olar.` };
  await db.insert(lessonMaterials).values({ lessonId, title, fileUrl: url, mimeType: "application/pdf", sizeBytes: size });
  await audit(u.id, "lesson.material.add", "lesson", lessonId, { title });
  revalidatePath(`/muellim/dersler/${lessonId}`);
  revalidatePath("/dersler");
  return { ok: true };
}

export async function deleteLessonMaterial(materialId: string): Promise<Res> {
  const u = await actor();
  if (isRes(u)) return u;
  if (!z.uuid().safeParse(materialId).success) return { error: "Material tapılmadı." };
  const [m] = await db.select({ id: lessonMaterials.id, lessonId: lessonMaterials.lessonId, fileUrl: lessonMaterials.fileUrl }).from(lessonMaterials).where(eq(lessonMaterials.id, materialId)).limit(1);
  if (!m || !(await ownedLesson(u, m.lessonId))) return { error: "Material tapılmadı." };
  await db.delete(lessonMaterials).where(and(eq(lessonMaterials.id, materialId)));
  // Best effort: free the Blob storage too. The row is already gone, so a failure here is harmless.
  if (process.env.BLOB_READ_WRITE_TOKEN && BLOB_HOST.test(new URL(m.fileUrl).hostname)) {
    try {
      const { del } = await import("@vercel/blob");
      await del(m.fileUrl);
    } catch {
      /* ignore */
    }
  }
  await audit(u.id, "lesson.material.delete", "lesson", m.lessonId);
  revalidatePath(`/muellim/dersler/${m.lessonId}`);
  revalidatePath("/dersler");
  return { ok: true };
}
