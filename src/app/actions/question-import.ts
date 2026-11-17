"use server";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { db } from "@/db";
import { questionOptions, questions, topics } from "@/db/schema";
import { audit } from "@/lib/audit";
import { AuthError, assertPermission } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { parseQuestionsFromText, type ImportResult } from "@/lib/question-import";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_QUESTIONS = 300;
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

type Failure = { error: string };

async function guard() {
  try {
    const u = await assertPermission("questions.manage");
    if (!(await rateLimit(`question-import:${u.id}`, 40, 600)).ok) return { error: "Çox sayda əməliyyat. Bir az sonra yenidən cəhd edin." } as Failure;
    return u;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat üçün icazəniz yoxdur." } as Failure;
    throw e;
  }
}

/** PDF text as lines. Items on the same baseline are joined, so "A) 1 B) 2" stays on one line. */
async function pdfToText(buf: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.join("\n");
}

/** Reads an uploaded PDF (already in our Blob store under imports/), deletes it, and returns draft questions. */
export async function extractQuestionsFromPdf(url: string): Promise<ImportResult | Failure> {
  const u = await guard();
  if ("error" in u) return u;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "Yanlış fayl ünvanı." };
  }
  if (parsed.protocol !== "https:" || !BLOB_HOST.test(parsed.hostname) || !parsed.pathname.startsWith("/imports/")) return { error: "Yanlış fayl ünvanı." };
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { error: "PDF faylı oxunmadı. Yenidən yükləyin." };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_PDF_BYTES) return { error: "PDF 10 MB-dan böyükdür." };
    const text = await pdfToText(buf);
    if (text.replace(/\s/g, "").length < 20) return { error: "PDF-dən mətn oxuna bilmədi. Bu, skan olunmuş (şəkil) PDF ola bilər. Mətni əl ilə yapışdırmağı yoxlayın." };
    return parseQuestionsFromText(text);
  } catch {
    return { error: "PDF oxuna bilmədi. Fayl zədəlidir və ya şifrəlidir." };
  } finally {
    await del(url).catch(() => undefined);
  }
}

/** Same parser, for text pasted from a PDF or Word file. */
export async function parseQuestionsFromPasted(text: string): Promise<ImportResult | Failure> {
  const u = await guard();
  if ("error" in u) return u;
  if (text.length > 400_000) return { error: "Mətn çox uzundur." };
  return parseQuestionsFromText(text);
}

const importSchema = z.object({
  subjectId: z.uuid(),
  topicId: z.uuid().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().min(0.25).max(100),
  items: z
    .array(
      z.object({
        text: z.string().trim().min(5, "Sual mətni çox qısadır.").max(5000),
        options: z.array(z.string().trim().min(1).max(1000)).min(2).max(5),
        correct: z.number().int().min(0).max(4),
      }),
    )
    .min(1, "İdxal üçün sual yoxdur.")
    .max(MAX_QUESTIONS, `Bir dəfəyə ən çox ${MAX_QUESTIONS} sual idxal etmək olar.`),
});

/** Saves the reviewed drafts into the question bank. */
export async function importQuestions(input: z.input<typeof importSchema>): Promise<{ ok: true; count: number } | Failure> {
  const u = await guard();
  if ("error" in u) return u;
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Məlumat düzgün deyil." };
  const d = parsed.data;
  if (d.items.some((it) => it.correct >= it.options.length)) return { error: "Bəzi suallarda düzgün cavab seçilməyib." };
  if (d.topicId) {
    const [t] = await db.select({ s: topics.subjectId }).from(topics).where(eq(topics.id, d.topicId)).limit(1);
    if (t?.s !== d.subjectId) return { error: "Mövzu seçilmiş fənnə aid deyil." };
  }
  await db.transaction(async (tx) => {
    const rows = await tx
      .insert(questions)
      .values(d.items.map((it) => ({ subjectId: d.subjectId, topicId: d.topicId, authorId: u.id, type: "mcq" as const, difficulty: d.difficulty, text: it.text, points: String(d.points), source: "PDF idxal" })))
      .returning({ id: questions.id });
    await tx.insert(questionOptions).values(rows.flatMap((q, qi) => d.items[qi].options.map((text, i) => ({ questionId: q.id, text, isCorrect: i === d.items[qi].correct, orderIndex: i }))));
  });
  await audit(u.id, "question.import", "question", undefined, { count: d.items.length });
  revalidatePath("/muellim/suallar");
  revalidatePath("/idare/suallar");
  return { ok: true, count: d.items.length };
}
