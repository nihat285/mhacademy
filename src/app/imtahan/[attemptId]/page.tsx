import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ExamRunner } from "@/components/exam/exam-runner";
import { requireRole } from "@/lib/auth";
import { getAttemptForTaking } from "@/lib/exam/engine";

export const metadata: Metadata = { title: "Sınaq", robots: { index: false, follow: false } };

export default async function TakeExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();
  const user = await requireRole(["student"], `/imtahan/${attemptId}`);
  const state = await getAttemptForTaking(user.id, attemptId);
  if (!state) notFound();
  if (state === "finished") redirect(`/panel/neticelerim/${attemptId}`);
  return <ExamRunner state={state} />;
}
