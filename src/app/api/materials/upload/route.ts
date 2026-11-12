import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AuthError, assertPermission } from "@/lib/auth";

const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;

/**
 * Issues short-lived upload tokens for lesson PDFs (Vercel Blob client uploads, so the file goes straight
 * from the browser to Blob and never through our 4.5 MB function body limit). Only staff with the
 * `lessons.manage` permission get a token, only PDFs, only up to 10 MB. The row in `lesson_materials`
 * is created afterwards by the `addLessonMaterial` server action, which re-checks ownership.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Yanlış sorğu." }, { status: 400 });
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await assertPermission("lessons.manage");
        if (!pathname.startsWith("materials/") || pathname.includes("..")) throw new Error("Yanlış fayl yolu.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_MATERIAL_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        /* Nothing to do: the client registers the file through addLessonMaterial. */
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Yükləmə alınmadı." }, { status });
  }
}
