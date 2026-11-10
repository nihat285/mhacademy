import { saveCourse } from "@/app/actions/admin";
import { ActionForm, CheckField, Field, SelectField, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";

export function CourseForm({
  id,
  subjects,
  teachers,
  defaults,
}: {
  id: string | null;
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  defaults?: { title: string; subjectId: string; teacherId: string | null; grade: number | null; description: string | null; featured: boolean; published: boolean };
}) {
  return (
    <Card className="max-w-3xl p-5 sm:p-6">
      <ActionForm action={saveCourse.bind(null, id)} className="grid gap-4">
        <Field name="title" label="Başlıq" defaultValue={defaults?.title} required />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField name="subjectId" label="Fənn" defaultValue={defaults?.subjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
          <SelectField name="teacherId" label="Müəllim" defaultValue={defaults?.teacherId ?? ""} options={[{ value: "", label: "— Təyin olunmayıb —" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
          <Field name="grade" label="Sinif" type="number" min={1} max={11} defaultValue={defaults?.grade ?? ""} />
        </div>
        <TextArea name="description" label="Təsvir" defaultValue={defaults?.description ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckField name="published" label="Dərc olunub" defaultChecked={defaults?.published ?? true} />
          <CheckField name="featured" label="Seçilmiş kurs" defaultChecked={defaults?.featured ?? false} />
        </div>
        <div><SubmitButton>{id ? "Yadda saxla" : "Kursu yarat"}</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}
