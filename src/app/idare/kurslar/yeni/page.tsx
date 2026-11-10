import type { Metadata } from "next";
import { CourseForm } from "@/components/admin/course-form";
import { PageHeader } from "@/components/panel/shell";
import { requireRole } from "@/lib/auth";
import { allSubjects, listTeachersLite } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Yeni kurs" };

export default async function NewCourse() {
  await requireRole(["admin"], "/idare/kurslar/yeni");
  const [subjects, teachers] = await Promise.all([allSubjects(), listTeachersLite()]);
  return (
    <>
      <PageHeader title="Yeni kurs" />
      <CourseForm id={null} subjects={subjects} teachers={teachers} />
    </>
  );
}
