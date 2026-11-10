import type { Metadata } from "next";
import { saveExam } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { ExamForm } from "@/components/teacher/exam-form";
import { NoAccess } from "@/components/teacher/no-access";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubjectsWithTopics, listClasses, listQuestions } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Yeni sınaq" };

export default async function NewExam() {
  const user = await requireRole(["teacher", "admin"], "/muellim/sinaqlar/yeni");
  if (!can(user, "exams.manage")) return <NoAccess what="Sınaq yaratmaq" />;
  const [data, questions, classes] = await Promise.all([getSubjectsWithTopics(), listQuestions(user, {}), listClasses(user)]);
  return (
    <>
      <PageHeader title="Yeni sınaq" />
      <div className="max-w-4xl">
        <ExamForm action={saveExam.bind(null, null)} data={data} questions={questions} classes={classes} canAssign={can(user, "exams.assign")} submitLabel="Sınağı yarat" />
      </div>
    </>
  );
}
