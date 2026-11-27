import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { libraryMaterials } from "@/db/material-schema";
import { subjects } from "@/db/schema";
import { audit } from "@/lib/audit";
import { can, type Actor } from "@/lib/permissions";
import { escapeLike, type MaterialInput } from "./rules";

export class MaterialError extends Error {
  constructor(public code: "not_found" | "forbidden", message: string) {
    super(message);
  }
}

type Who = Pick<Actor, "id" | "role" | "permissions">;
type Row = typeof libraryMaterials.$inferSelect;

/** Admin: everything. Teacher: needs "lessons.manage" and only their own materials. */
export const canManageLibrary = (actor: Who) => actor.role === "admin" || (actor.role === "teacher" && can(actor, "lessons.manage"));
const canEditRow = (actor: Who, r: Pick<Row, "authorId">) => actor.role === "admin" || (canManageLibrary(actor) && r.authorId === actor.id);

async function loadEditable(actor: Who, id: string): Promise<Row> {
  const [r] = await db.select().from(libraryMaterials).where(eq(libraryMaterials.id, id)).limit(1);
  if (!r || !canEditRow(actor, r)) throw new MaterialError("not_found", "Material tapılmadı.");
  return r;
}

export const PAGE_SIZE = 60;

/** Public list. The file url is deliberately NOT selected: it never reaches the browser. */
export async function listPublicMaterials(f: { subjectId?: string; grade?: number; q?: string }) {
  const q = f.q?.trim().slice(0, 80);
  const where = and(
    eq(libraryMaterials.published, true),
    f.subjectId ? eq(libraryMaterials.subjectId, f.subjectId) : undefined,
    // A material for "all grades" (null) matches every grade filter.
    f.grade ? or(eq(libraryMaterials.grade, f.grade), sql`${libraryMaterials.grade} is null`) : undefined,
    q ? or(ilike(libraryMaterials.title, `%${escapeLike(q)}%`), ilike(libraryMaterials.description, `%${escapeLike(q)}%`)) : undefined,
  );
  return db
    .select({
      id: libraryMaterials.id, title: libraryMaterials.title, description: libraryMaterials.description, grade: libraryMaterials.grade,
      access: libraryMaterials.access, sizeBytes: libraryMaterials.sizeBytes, downloads: libraryMaterials.downloads,
      subjectName: subjects.name, subjectId: libraryMaterials.subjectId, createdAt: libraryMaterials.createdAt,
    })
    .from(libraryMaterials)
    .innerJoin(subjects, eq(subjects.id, libraryMaterials.subjectId))
    .where(where)
    .orderBy(desc(libraryMaterials.createdAt))
    .limit(PAGE_SIZE);
}

export async function listSubjectOptions() {
  return db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(subjects.sortOrder, subjects.name);
}

/** For the download route: the stored file url and access type of a published material. */
export async function getForDownload(id: string) {
  const [r] = await db
    .select({ id: libraryMaterials.id, fileUrl: libraryMaterials.fileUrl, access: libraryMaterials.access })
    .from(libraryMaterials)
    .where(and(eq(libraryMaterials.id, id), eq(libraryMaterials.published, true)))
    .limit(1);
  return r ?? null;
}

export async function countDownload(id: string) {
  await db.update(libraryMaterials).set({ downloads: sql`${libraryMaterials.downloads} + 1` }).where(eq(libraryMaterials.id, id));
}

export async function listManageMaterials(actor: Who) {
  if (!canManageLibrary(actor)) throw new MaterialError("forbidden", "Bu əməliyyat üçün icazəniz yoxdur.");
  return db
    .select({
      id: libraryMaterials.id, title: libraryMaterials.title, grade: libraryMaterials.grade, access: libraryMaterials.access,
      published: libraryMaterials.published, downloads: libraryMaterials.downloads, sizeBytes: libraryMaterials.sizeBytes,
      subjectName: subjects.name, createdAt: libraryMaterials.createdAt,
    })
    .from(libraryMaterials)
    .innerJoin(subjects, eq(subjects.id, libraryMaterials.subjectId))
    .where(actor.role === "admin" ? undefined : eq(libraryMaterials.authorId, actor.id))
    .orderBy(desc(libraryMaterials.createdAt))
    .limit(300);
}

export async function createMaterial(actor: Who, data: MaterialInput, file: { url: string; size: number | null }): Promise<string> {
  if (!canManageLibrary(actor)) throw new MaterialError("forbidden", "Bu əməliyyat üçün icazəniz yoxdur.");
  const [row] = await db
    .insert(libraryMaterials)
    .values({ ...data, authorId: actor.id, fileUrl: file.url, sizeBytes: file.size })
    .returning({ id: libraryMaterials.id });
  await audit(actor.id, "material.create", "library_material", row.id);
  return row.id;
}

export async function getEditable(actor: Who, id: string) {
  return loadEditable(actor, id);
}

/** Returns the old file url when the file was replaced, so the caller can delete it from storage. */
export async function updateMaterial(actor: Who, id: string, data: MaterialInput, file?: { url: string; size: number | null }): Promise<string | null> {
  const old = await loadEditable(actor, id);
  await db
    .update(libraryMaterials)
    .set({ ...data, ...(file ? { fileUrl: file.url, sizeBytes: file.size } : {}), updatedAt: new Date() })
    .where(eq(libraryMaterials.id, id));
  await audit(actor.id, "material.update", "library_material", id);
  return file && file.url !== old.fileUrl ? old.fileUrl : null;
}

/** Returns the file url so the caller can delete the file from storage. */
export async function deleteMaterial(actor: Who, id: string): Promise<string> {
  const old = await loadEditable(actor, id);
  await db.delete(libraryMaterials).where(eq(libraryMaterials.id, id));
  await audit(actor.id, "material.delete", "library_material", id);
  return old.fileUrl;
}
