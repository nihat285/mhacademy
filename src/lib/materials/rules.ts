/** Pure rules for the material library. No DB, no I/O. */
export type MaterialAccess = "public" | "members";

export const ACCESS_LABEL: Record<MaterialAccess, string> = { public: "Hamıya açıq", members: "Yalnız qeydiyyatlı" };
export const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

export interface MaterialInput {
  subjectId: string;
  title: string;
  description: string | null;
  grade: number | null;
  access: MaterialAccess;
  published: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

export function validateMaterial(raw: { title: string; subjectId: string; description: string; grade: string; access: string; published: boolean; hasFile: boolean }):
  { ok: true; data: MaterialInput } | { ok: false; fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const title = raw.title.trim();
  const description = raw.description.trim() || null;
  if (title.length < 3) e.title = "Başlıq ən azı 3 simvol olmalıdır.";
  if (title.length > 200) e.title = "Başlıq 200 simvoldan uzun ola bilməz.";
  if (!isUuid(raw.subjectId)) e.subjectId = "Fənni seçin.";
  if (description && description.length > 2000) e.description = "Təsvir 2000 simvoldan uzun ola bilməz.";
  let grade: number | null = null;
  if (raw.grade.trim() !== "") {
    const n = Number(raw.grade);
    if (!Number.isInteger(n) || n < 1 || n > 11) e.grade = "Sinif 1 ilə 11 arasında olmalıdır.";
    else grade = n;
  }
  if (raw.access !== "public" && raw.access !== "members") e.access = "Giriş növünü seçin.";
  if (!raw.hasFile) e.file = "PDF faylını yükləyin.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, data: { subjectId: raw.subjectId, title, description, grade, access: raw.access as MaterialAccess, published: raw.published } };
}

/** Only files that were uploaded by our own Blob upload route (folder `materials/`, PDF) are accepted. */
const BLOB_PDF = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/materials\/[A-Za-z0-9._-]{1,120}\.pdf$/;
export const isBlobPdfUrl = (url: string) => BLOB_PDF.test(url);

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** Members-only files need a signed-in user; public files are open to everyone. */
export const canDownload = (access: string, signedIn: boolean) => access === "public" || (access === "members" && signedIn);

/** Escapes % and _ so a search term is matched literally inside ILIKE. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Total size from a `Content-Range: bytes 0-31/12345` header. */
export function sizeFromContentRange(h: string | null): number | null {
  const m = /\/(\d+)$/.exec(h ?? "");
  return m ? Number(m[1]) : null;
}
