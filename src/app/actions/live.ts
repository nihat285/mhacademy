"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { run } from "@/lib/content/action-utils";
import { LiveError, cancelSession, createSession, joinSession, setRecording, updateSession } from "@/lib/live/service";
import { parseBakuLocal } from "@/lib/live/rules";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/components/ui/action-form";

const uuid = z.uuid();
const areaOf = (v: unknown) => (v === "idare" ? "idare" : "muellim");
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function fail(e: unknown, fd?: FormData): ActionState {
  if (e instanceof LiveError) {
    const values = fd ? Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)])) : undefined;
    return { error: e.message, fieldErrors: e.fieldErrors, values };
  }
  throw e; // `run` turns unexpected errors into the generic message
}

function readSession(fd: FormData) {
  return {
    classId: text(fd, "classId"),
    title: text(fd, "title"),
    description: text(fd, "description").trim() || null,
    startsAt: parseBakuLocal(text(fd, "startsAt")),
    durationMin: Number(text(fd, "durationMin")),
    joinUrl: text(fd, "joinUrl"),
    passcode: text(fd, "passcode").trim() || null,
  };
}

export async function createLiveSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const area = areaOf(fd.get("area"));
  let id: string;
  const r = await run(async () => {
    const user = await assertRole(["teacher", "admin"]);
    if (!(await rateLimit(`live-create:${user.id}`, 60, 3600)).ok) return { error: "Çox sayda cəhd edildi. Bir az sonra yenidən cəhd edin." };
    try {
      id = await createSession(user, readSession(fd));
    } catch (e) {
      return fail(e, fd);
    }
    return { ok: true };
  });
  if (!r.ok) return r;
  revalidatePath(`/${area}/canli-dersler`);
  redirect(`/${area}/canli-dersler/${id!}`);
}

export async function updateLiveSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertRole(["teacher", "admin"]);
    const id = text(fd, "id");
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    try {
      const { classId: _c, ...rest } = readSession(fd);
      void _c;
      await updateSession(user, id, rest);
    } catch (e) {
      return fail(e, fd);
    }
    revalidatePath(`/${areaOf(fd.get("area"))}/canli-dersler`);
    return { ok: true, message: "Dəyişikliklər saxlanıldı. Şagirdlərə bildiriş göndərildi (vaxt dəyişibsə)." };
  });
}

/** Bound with (area, id) on the server and run from a confirmation dialog. */
export async function cancelLiveSessionAction(areaRaw: string, id: string): Promise<{ ok?: boolean; error?: string } | void> {
  const area = areaOf(areaRaw);
  const r = await run(async () => {
    const user = await assertRole(["teacher", "admin"]);
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    try {
      await cancelSession(user, id);
    } catch (e) {
      return fail(e);
    }
    return { ok: true };
  });
  if (!r.ok) return { error: r.error };
  revalidatePath(`/${area}/canli-dersler`);
  redirect(`/${area}/canli-dersler`);
}

export async function setRecordingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertRole(["teacher", "admin"]);
    const id = text(fd, "id");
    if (!uuid.safeParse(id).success) return { error: "Yanlış sorğu." };
    try {
      await setRecording(user, id, text(fd, "recordingUrl"));
    } catch (e) {
      return fail(e, fd);
    }
    revalidatePath(`/${areaOf(fd.get("area"))}/canli-dersler/${id}`);
    return { ok: true, message: "Yazı linki saxlanıldı." };
  });
}

/** Student: returns the link only if the join window is open; records attendance. */
export async function joinLiveSessionAction(sessionId: string): Promise<{ ok: true; url: string; passcode: string | null } | { ok: false; error: string }> {
  const user = await assertRole(["student"]);
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Yanlış sorğu." };
  if (!(await rateLimit(`live-join:${user.id}`, 30, 600)).ok) return { ok: false, error: "Çox tez-tez cəhd edirsiniz. Bir az gözləyin." };
  try {
    const r = await joinSession(user.id, sessionId);
    revalidatePath("/panel/canli-dersler");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof LiveError) return { ok: false, error: e.message };
    console.error("live join failed", e);
    return { ok: false, error: "Qoşulmaq mümkün olmadı. Bir az sonra yenidən cəhd edin." };
  }
}
