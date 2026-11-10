import type { Metadata } from "next";
import { createQuestion } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { topicOptions } from "@/components/teacher/lesson-form";
import { NoAccess } from "@/components/teacher/no-access";
import { QuestionForm } from "@/components/teacher/question-form";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubjectsWithTopics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Yeni sual" };

export default async function NewQuestion() {
  const user = await requireRole(["teacher", "admin"], "/muellim/suallar/yeni");
  if (!can(user, "questions.manage")) return <NoAccess what="Sual yaratmaq" />;
  const data = await getSubjectsWithTopics();
  return (
    <>
      <PageHeader title="Yeni sual" />
      <div className="max-w-3xl">
        <QuestionForm action={createQuestion} subjects={data.subjects.map((s) => ({ value: s.id, label: s.name }))} topics={topicOptions(data)} submitLabel="Sualı yarat" />
      </div>
    </>
  );
}
