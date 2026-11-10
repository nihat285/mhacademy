import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CourseForm } from "@/components/admin/course-form";
import { PageHeader } from "@/components/panel/shell";
import { requireRole } from "@/lib/auth";
import { allSubjects, getCourseAdmin, listTeachersLite } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Kursu redaktə et" };

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["admin"], `/idare/kurslar/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [c, subjects, teachers] = await Promise.all([getCourseAdmin(id), allSubjects(), listTeachersLite()]);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.title} />
      <CourseForm id={id} subjects={subjects} teachers={teachers} defaults={c} />
    </>
  );
}
