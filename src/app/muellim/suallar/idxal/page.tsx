import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { QuestionImport } from "@/components/teacher/question-import";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubjectsWithTopics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "PDF-dən sual idxalı" };

export default async function ImportQuestions() {
  const user = await requireRole(["teacher", "admin"], "/muellim/suallar/idxal");
  if (!can(user, "questions.manage")) return <NoAccess what="Sual idxalı" />;
  const data = await getSubjectsWithTopics();
  return (
    <>
      <PageHeader title="PDF-dən sual idxalı" intro="PDF faylını yükləyin, suallar avtomatik çıxarılacaq. Yoxlayıb düzəldəndən sonra sual bankına əlavə edin." />
      <div className="max-w-3xl">
        <QuestionImport subjects={data.subjects.map((s) => ({ id: s.id, name: s.name }))} topics={data.topics.map((t) => ({ id: t.id, subjectId: t.subjectId, name: t.name }))} />
      </div>
    </>
  );
}
