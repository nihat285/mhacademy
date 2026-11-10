import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { saveExam } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { ExamForm } from "@/components/teacher/exam-form";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getExam, getSubjectsWithTopics, listClasses, listQuestions } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Sınağı redaktə et" };

export default async function EditExam({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["teacher", "admin"], `/muellim/sinaqlar/${id}`);
  if (!can(user, "exams.manage")) return <NoAccess what="Sınağı redaktə etmək" />;
  if (!z.uuid().safeParse(id).success) notFound();
  const [exam, data, questions, classes] = await Promise.all([getExam(user, id), getSubjectsWithTopics(), listQuestions(user, {}), listClasses(user)]);
  if (!exam) notFound();
  return (
    <>
      <PageHeader title={exam.title} actions={exam.status === "published" ? <LinkButton href={`/sinaqlar/${exam.slug}`} variant="outline">Saytda bax</LinkButton> : undefined} />
      <div className="max-w-4xl">
        <ExamForm
          action={saveExam.bind(null, id)}
          data={data}
          questions={questions}
          classes={classes}
          defaults={exam}
          locked={exam.attemptCount > 0}
          canAssign={can(user, "exams.assign")}
          submitLabel="Yadda saxla"
        />
      </div>
    </>
  );
}
