"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/lib/auth";
import { run } from "@/lib/content/action-utils";
import { PassageError, createPassage, deletePassage, linkQuestions, unlinkQuestion, updatePassage } from "@/lib/passages/service";
import { isBlobAudioUrl, isOwnAudioUrl, validatePassage } from "@/lib/passages/rules";
import { looksLikeAudio } from "@/lib/upload";
import type { ActionState } from "@/components/ui/action-form";

const uuid = z.uuid();
const areaOf = (v: unknown) => (v === "idare" ? "idare" : "muellim");
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function fail(e: unknown, fd?: FormData): ActionState {
  if (e instanceof PassageError) {
    const values = fd ? Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)])) : undefined;
    return { error: e.message, fieldErrors: e.fieldErrors, values };
  }
  throw e;
}

/** Files uploaded straight to Vercel Blob were never seen by our server: check their real first bytes before saving. */
async function blobIsAudio(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-31" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    return looksLikeAudio(Buffer.from(await res.arrayBuffer()).subarray(0, 32));
  } catch {
    return false;
  }
}

/** Reads the form. `audio`: undefined = keep what is stored, null = remove, string = new file. */
async function read(fd: FormData, existingAudio: boolean) {
  const submitted = text(fd, "audioUrl");
  const remove = fd.get("removeAudio") === "on";
  let audio: string | null | undefined = undefined;
  if (submitted) {
    if (!isOwnAudioUrl(submitted, process.env.STORAGE_PUBLIC_BASE_URL)) return { error: "Audio faylı yanlışdır. Yenidən yükləyin." as const };
    if (isBlobAudioUrl(submitted) && !(await blobIsAudio(submitted))) return { error: "Yüklənən fayl audio deyil. MP3, M4A, OGG və ya WAV faylı seçin." as const };
    audio = submitted;
  } else if (remove) audio = null;
  const hasAudio = audio === undefined ? existingAudio : audio !== null;
  const v = validatePassage({
    title: text(fd, "title"), subjectId: text(fd, "subjectId"), body: text(fd, "body"), transcript: text(fd, "transcript"),
    maxPlays: text(fd, "maxPlays"), hasAudio,
  });
  return { audio, v };
}

function revalidate(area: string, id?: string) {
  revalidatePath(`/${area}/metnler`);
  if (id) revalidatePath(`/${area}/metnler/${id}`);
}

export async function createPassageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const area = areaOf(fd.get("area"));
  let id: string;
  const r = await run(async () => {
    const user = await assertPermission("questions.manage");
    const parsed = await read(fd, false);
    if ("error" in parsed) return { error: parsed.error };
    if (!parsed.v.ok) return { fieldErrors: parsed.v.fieldErrors, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)])) };
    try {
      id = await createPassage(user, parsed.v.data, parsed.audio ?? null);
    } catch (e) {
      return fail(e, fd);
    }
    return { ok: true };
  });
  if (!r.ok) return r;
  revalidate(area);
  redirect(`/${area}/metnler/${id!}`);
}

export async function updatePassageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertPermission("questions.manage");
    const id = text(fd, "id");
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    const existingAudio = text(fd, "hadAudio") === "1";
    const parsed = await read(fd, existingAudio);
    if ("error" in parsed) return { error: parsed.error };
    if (!parsed.v.ok) return { fieldErrors: parsed.v.fieldErrors, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)])) };
    try {
      await updatePassage(user, id, parsed.v.data, parsed.audio);
    } catch (e) {
      return fail(e, fd);
    }
    revalidate(areaOf(fd.get("area")), id);
    return { ok: true, message: "Dəyişikliklər saxlanıldı." };
  });
}

export async function deletePassageAction(areaRaw: string, id: string): Promise<{ ok?: boolean; error?: string } | void> {
  const area = areaOf(areaRaw);
  const r = await run(async () => {
    const user = await assertPermission("questions.manage");
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    try {
      await deletePassage(user, id);
    } catch (e) {
      return fail(e);
    }
    return { ok: true };
  });
  if (!r.ok) return { error: r.error };
  revalidate(area);
  redirect(`/${area}/metnler`);
}

export async function linkQuestionsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertPermission("questions.manage");
    const id = text(fd, "id");
    const ids = fd.getAll("questionIds").map(String).filter((x) => uuid.safeParse(x).success);
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    if (ids.length === 0) return { error: "Ən azı bir sual seçin." };
    try {
      const n = await linkQuestions(user, id, ids);
      revalidate(areaOf(fd.get("area")), id);
      return { ok: true, message: `${n} sual parçaya bağlandı.` };
    } catch (e) {
      return fail(e);
    }
  });
}

export async function unlinkQuestionAction(areaRaw: string, passageId: string, questionId: string): Promise<{ ok?: boolean; error?: string } | void> {
  const area = areaOf(areaRaw);
  const r = await run(async () => {
    const user = await assertPermission("questions.manage");
    if (!uuid.safeParse(passageId).success || !uuid.safeParse(questionId).success) return { error: "Yanlış sorğu." };
    try {
      await unlinkQuestion(user, passageId, questionId);
    } catch (e) {
      return fail(e);
    }
    return { ok: true };
  });
  if (!r.ok) return { error: r.error };
  revalidate(area, passageId);
}
