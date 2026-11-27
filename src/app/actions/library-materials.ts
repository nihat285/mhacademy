"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import { run } from "@/lib/content/action-utils";
import { MaterialError, createMaterial, deleteMaterial, updateMaterial } from "@/lib/materials/service";
import { isBlobPdfUrl, isUuid, sizeFromContentRange, validateMaterial } from "@/lib/materials/rules";
import type { ActionState } from "@/components/ui/action-form";

const areaOf = (v: unknown) => (v === "idare" ? "idare" : "muellim");
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const values = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));

/**
 * The PDF goes browser → Vercel Blob directly (token from /api/materials/upload), so our server never saw it.
 * Before saving, check the url is ours and the file really starts with "%PDF-"; the size is taken from the response.
 */
async function verifyPdf(url: string): Promise<{ size: number | null } | null> {
  if (!isBlobPdfUrl(url)) return null;
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-7" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    // Read only the first chunk, never the whole file.
    const reader = res.body?.getReader();
    const first = reader ? (await reader.read()).value : undefined;
    await reader?.cancel().catch(() => {});
    if (!first || Buffer.from(first).subarray(0, 5).toString("ascii") !== "%PDF-") return null;
    const len = Number(res.headers.get("content-length"));
    return { size: sizeFromContentRange(res.headers.get("content-range")) ?? (res.status === 200 && Number.isFinite(len) && len > 0 ? len : null) };
  } catch {
    return null;
  }
}

async function removeFile(url: string | null) {
  if (!url || !isBlobPdfUrl(url)) return;
  try {
    await del(url);
  } catch (e) {
    console.error("[material] could not delete old file", e); // storage cleanup is best-effort
  }
}

function fail(e: unknown, fd?: FormData): ActionState {
  if (e instanceof MaterialError) return { error: e.message, values: fd ? values(fd) : undefined };
  throw e;
}

function parse(fd: FormData, hasFile: boolean) {
  return validateMaterial({
    title: text(fd, "title"), subjectId: text(fd, "subjectId"), description: text(fd, "description"), grade: text(fd, "grade"),
    access: text(fd, "access"), published: fd.get("published") === "on", hasFile,
  });
}

export async function createMaterialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const area = areaOf(fd.get("area"));
  let id = "";
  const r = await run(async () => {
    const user = await assertPermission("lessons.manage");
    const fileUrl = text(fd, "fileUrl");
    const v = parse(fd, !!fileUrl);
    if (!v.ok) return { fieldErrors: v.fieldErrors, values: values(fd) };
    const checked = await verifyPdf(fileUrl);
    if (!checked) return { fieldErrors: { file: "Yüklənən fayl PDF deyil və ya tapılmadı. Yenidən yükləyin." }, values: values(fd) };
    try {
      id = await createMaterial(user, v.data, { url: fileUrl, size: checked.size });
    } catch (e) {
      return fail(e, fd);
    }
    return { ok: true };
  });
  if (!r.ok) return r;
  revalidatePath("/materiallar");
  revalidatePath(`/${area}/materiallar`);
  redirect(`/${area}/materiallar/${id}`);
}

export async function updateMaterialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertPermission("lessons.manage");
    const id = text(fd, "id");
    if (!isUuid(id)) return { error: "Yanlış sorğu." };
    const newUrl = text(fd, "fileUrl");
    const v = parse(fd, true); // an existing material always keeps a file
    if (!v.ok) return { fieldErrors: v.fieldErrors, values: values(fd) };
    let file: { url: string; size: number | null } | undefined;
    if (newUrl) {
      const checked = await verifyPdf(newUrl);
      if (!checked) return { fieldErrors: { file: "Yüklənən fayl PDF deyil və ya tapılmadı. Yenidən yükləyin." }, values: values(fd) };
      file = { url: newUrl, size: checked.size };
    }
    try {
      const oldUrl = await updateMaterial(user, id, v.data, file);
      await removeFile(oldUrl);
    } catch (e) {
      return fail(e, fd);
    }
    revalidatePath("/materiallar");
    revalidatePath(`/${areaOf(fd.get("area"))}/materiallar/${id}`);
    return { ok: true, message: "Dəyişikliklər saxlanıldı." };
  });
}

export async function deleteMaterialAction(areaRaw: string, id: string): Promise<{ ok?: boolean; error?: string } | void> {
  const area = areaOf(areaRaw);
  const r = await run(async () => {
    const user = await assertPermission("lessons.manage");
    if (!isUuid(id)) return { error: "Yanlış sorğu." };
    try {
      await removeFile(await deleteMaterial(user, id));
    } catch (e) {
      return fail(e);
    }
    return { ok: true };
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/materiallar");
  revalidatePath(`/${area}/materiallar`);
  redirect(`/${area}/materiallar`);
}
