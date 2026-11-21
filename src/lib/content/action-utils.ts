import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ActionState } from "@/components/ui/action-form";
import { AuthError } from "@/lib/auth";
import { saveUpload, UploadError } from "@/lib/upload";
import { UUID_RE } from "./parse";

export const GENERIC_ERROR = "Gözlənilməz xəta baş verdi. Bir az sonra yenidən cəhd edin.";
export const NOT_FOUND_MSG = "Qeyd tapılmadı. Başqa istifadəçi onu silmiş ola bilər.";

/** Wraps an action body: auth failures and unexpected errors become friendly ActionState errors; redirects pass through. */
export async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AuthError) return { error: e.status === 401 ? "Sessiyanın vaxtı bitib. Yenidən daxil olun." : e.message };
    console.error("[content action]", e);
    return { error: GENERIC_ERROR };
  }
}

export const isUuid = (v: string) => UUID_RE.test(v);

/** Optional image field: returns null when no file chosen, or the stored url / a user-facing error. */
export async function optionalUpload(
  fd: FormData,
  field: string,
  kind: "image" | "document" | "audio",
  folder: string,
): Promise<null | { url: string; mime: string; size: number; originalName: string } | { error: string }> {
  const f = fd.get(field);
  if (!(f instanceof File) || f.size === 0) return null;
  try {
    return await saveUpload(f, kind, folder);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
}
