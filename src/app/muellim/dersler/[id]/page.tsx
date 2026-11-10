import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateLesson } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { LessonForm } from "@/components/teacher/lesson-form";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getLesson, getSubjectsWithTopics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Dərsi redaktə et" };

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["teacher", "admin"], `/muellim/dersler/${id}`);
  if (!can(user, "lessons.manage")) return <NoAccess what="Dərsi redaktə etmək" />;
  if (!z.uuid().safeParse(id).success) notFound();
  const [lesson, data] = await Promise.all([getLesson(user, id), getSubjectsWithTopics()]);
  if (!lesson) notFound();
  return (
    <>
      <PageHeader title={lesson.title} actions={lesson.published ? <LinkButton href={`/dersler/${lesson.slug}`} variant="outline">Saytda bax</LinkButton> : undefined} />
      <div className="max-w-3xl"><LessonForm action={updateLesson.bind(null, id)} data={data} defaults={lesson} submitLabel="Yadda saxla" /></div>
    </>
  );
}
