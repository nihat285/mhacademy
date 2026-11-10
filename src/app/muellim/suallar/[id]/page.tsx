import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateQuestion } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { topicOptions } from "@/components/teacher/lesson-form";
import { NoAccess } from "@/components/teacher/no-access";
import { QuestionForm } from "@/components/teacher/question-form";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getQuestion, getSubjectsWithTopics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Sualı redaktə et" };

export default async function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["teacher", "admin"], `/muellim/suallar/${id}`);
  if (!can(user, "questions.manage")) return <NoAccess what="Sualı redaktə etmək" />;
  if (!z.uuid().safeParse(id).success) notFound();
  const [q, data] = await Promise.all([getQuestion(user, id), getSubjectsWithTopics()]);
  if (!q) notFound();
  return (
    <>
      <PageHeader title="Sualı redaktə et" />
      <div className="max-w-3xl">
        <QuestionForm
          action={updateQuestion.bind(null, id)}
          subjects={data.subjects.map((s) => ({ value: s.id, label: s.name }))}
          topics={topicOptions(data)}
          editing
          defaults={q}
          submitLabel="Yadda saxla"
        />
      </div>
    </>
  );
}
