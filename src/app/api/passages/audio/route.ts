import { NextResponse } from "next/server";
import { AuthError, assertPermission } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload, UploadError } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Audio upload for listening passages. It has its own route (not a Server Action) so the global 4 MB action body
 * limit can stay as it is. The type is decided by magic bytes inside saveUpload; the form then submits only the
 * returned URL, which the passage action re-validates (see isOwnAudioUrl).
 */
export async function POST(req: Request) {
  let userId: string;
  try {
    userId = (await assertPermission("questions.manage")).id;
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.status === 401 ? "Sessiyanın vaxtı bitib. Yenidən daxil olun." : "Bu əməliyyat üçün icazəniz yoxdur." }, e.status);
    throw e;
  }
  if (!(await rateLimit(`passage-audio:${userId}`, 40, 3600)).ok) return json({ error: "Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin." }, 429);
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
