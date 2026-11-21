import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AuthError, assertPermission } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload, UploadError } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/wave"];
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorize() {
  try {
    return { userId: (await assertPermission("questions.manage")).id };
  } catch (e) {
    if (e instanceof AuthError) return { error: json({ error: e.status === 401 ? "Sessiyanın vaxtı bitib. Yenidən daxil olun." : "Bu əməliyyat üçün icazəniz yoxdur." }, e.status) };
    throw e;
  }
}

/**
 * Audio upload for listening passages.
 *  - JSON body  → Vercel Blob client upload: this route only hands out a short-lived token (after the permission and
 *    rate-limit checks); the browser then sends the file straight to Blob, so Vercel's 4.5 MB request limit does not apply.
 *    The saved URL is re-checked (host, folder and the file's real first bytes) when the passage is saved.
 *  - multipart → server-side upload through saveUpload (local dev, or an S3 bucket). Magic-byte checked; small files only
 *    on Vercel.
 */
export async function POST(req: Request) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  if (!(await rateLimit(`passage-audio:${auth.userId}`, 40, 3600)).ok) return json({ error: "Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin." }, 429);

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
    if (!body) return json({ error: "Yanlış sorğu." }, 400);
    try {
      const res = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!/^passage-audio\/[A-Za-z0-9._-]{1,100}\.(mp3|ogg|wav|m4a)$/.test(pathname)) throw new Error("Yanlış fayl adı.");
          return { allowedContentTypes: AUDIO_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true, tokenPayload: auth.userId };
        },
        onUploadCompleted: async () => {},
      });
      return json(res);
    } catch (e) {
      console.error("[passage audio token]", e);
      return json({ error: "Yükləmə başlamadı. Fayl audio olmalı və 25 MB-dan kiçik olmalıdır." }, 400);
    }
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 256 * 1024) return json({ error: "Fayl 25 MB limitini aşır." }, 413);
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) return json({ error: "Audio faylını seçin." }, 400);
    const stored = await saveUpload(file, "audio", "passage-audio");
    return json({ url: stored.url, size: stored.size, name: stored.originalName });
  } catch (e) {
    if (e instanceof UploadError) return json({ error: e.message }, 415);
    console.error("[passage audio]", e);
    return json({ error: "Fayl yüklənmədi. Bir az sonra yenidən cəhd edin." }, 500);
  }
}
