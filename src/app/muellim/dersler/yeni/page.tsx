import type { Metadata } from "next";
import { createLesson } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { LessonForm } from "@/components/teacher/lesson-form";
import { NoAccess } from "@/components/teacher/no-access";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubjectsWithTopics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Yeni dərs" };

export default async function NewLesson() {
  const user = await requireRole(["teacher", "admin"], "/muellim/dersler/yeni");
  if (!can(user, "lessons.manage")) return <NoAccess what="Dərs yaratmaq" />;
  const data = await getSubjectsWithTopics();
  return (
    <>
      <PageHeader title="Yeni dərs" />
      <div className="max-w-3xl"><LessonForm action={createLesson} data={data} submitLabel="Dərsi yarat" pendingMaterials={{ enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN) }} /></div>
    </>
  );
}
