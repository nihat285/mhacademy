import { NextResponse } from "next/server";
import { canDownload, isUuid } from "@/lib/materials/rules";
import { countDownload, getForDownload } from "@/lib/materials/service";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The only way to reach a material file. The stored url is never rendered into any page; this route checks the
 * access type first (members-only files need a signed-in user), counts the download and redirects to the file.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const noStore = { "Cache-Control": "no-store" };
  if (!isUuid(id)) return new NextResponse("Tapılmadı", { status: 404, headers: noStore });
  const m = await getForDownload(id);
  if (!m) return new NextResponse("Tapılmadı", { status: 404, headers: noStore });
  const user = await getCurrentUser();
  if (!canDownload(m.access, !!user)) {
    const url = new URL("/giris", req.url);
    url.searchParams.set("next", "/materiallar");
    return NextResponse.redirect(url, { status: 303, headers: noStore });
  }
  await countDownload(id);
  return NextResponse.redirect(m.fileUrl, { status: 302, headers: noStore });
}
