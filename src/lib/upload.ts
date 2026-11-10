import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Restricted file uploads.
 *  - Type is decided by the file's magic bytes, never by the client-supplied name or MIME type.
 *  - SVG and HTML are never accepted (script-injection vector).
 *  - Driver: local `public/uploads` (development) or any S3-compatible bucket (production).
 *    Set STORAGE_DRIVER=s3 plus STORAGE_BUCKET, STORAGE_REGION, STORAGE_PUBLIC_BASE_URL (and optionally
 *    STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY). See README.
 */
export type UploadKind = "image" | "document";

const LIMITS: Record<UploadKind, number> = { image: 3 * 1024 * 1024, document: 15 * 1024 * 1024 };

interface Sniffed { ext: string; mime: string; kind: UploadKind }

function sniff(b: Buffer): Sniffed | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png", kind: "image" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg", kind: "image" };
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp", kind: "image" };
  if (b.length >= 5 && b.subarray(0, 5).toString("ascii") === "%PDF-") return { ext: "pdf", mime: "application/pdf", kind: "document" };
  return null;
}

export class UploadError extends Error {}

export interface StoredFile { url: string; mime: string; size: number; originalName: string }

/** Validates and stores an uploaded `File`. Throws UploadError with an Azerbaijani message the UI can show. */
export async function saveUpload(file: File, kind: UploadKind, folder: string): Promise<StoredFile> {
  if (!file || file.size === 0) throw new UploadError("Fayl seçilməyib.");
  if (file.size > LIMITS[kind]) throw new UploadError(`Fayl çox böyükdür (maksimum ${Math.round(LIMITS[kind] / 1024 / 1024)} MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  const allowed = kind === "image" ? type?.kind === "image" : type !== null;
  if (!type || !allowed) throw new UploadError(kind === "image" ? "Yalnız PNG, JPEG və ya WebP şəkilləri qəbul olunur." : "Yalnız PDF, PNG, JPEG və ya WebP faylları qəbul olunur.");

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const key = `${safeFolder}/${Date.now()}-${randomBytes(8).toString("hex")}.${type.ext}`;
  const base = { mime: type.mime, size: buf.length, originalName: file.name.slice(0, 200) };

  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const bucket = process.env.STORAGE_BUCKET;
    const publicBase = process.env.STORAGE_PUBLIC_BASE_URL;
    if (!bucket || !publicBase) throw new Error("STORAGE_BUCKET and STORAGE_PUBLIC_BASE_URL are required for the s3 driver.");
    const s3 = new S3Client({
      region: process.env.STORAGE_REGION ?? "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: process.env.STORAGE_ACCESS_KEY_ID
        ? { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID, secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "" }
        : undefined,
    });
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: type.mime, CacheControl: "public, max-age=31536000, immutable" }));
    return { url: `${publicBase.replace(/\/$/, "")}/${key}`, ...base };
  }

  if (process.env.NODE_ENV === "production") throw new Error("Configure STORAGE_DRIVER=s3 for production uploads.");
  const dest = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return { url: `/uploads/${key}`, ...base };
}
