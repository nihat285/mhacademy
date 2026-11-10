import { saveSubject } from "@/app/actions/admin";
import { ActionForm, CheckField, Field, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";

export function SubjectForm({ id, defaults }: { id: string | null; defaults?: { name: string; description: string | null; accent: string | null; sortOrder: number; featured: boolean } }) {
  return (
    <Card className="max-w-2xl p-5 sm:p-6">
      <ActionForm action={saveSubject.bind(null, id)} className="grid gap-4">
        <Field name="name" label="Ad" defaultValue={defaults?.name} required />
        <TextArea name="description" label="Təsvir" defaultValue={defaults?.description ?? ""} className="[&_textarea]:min-h-20" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="accent" label="Rəng (#RRGGBB)" defaultValue={defaults?.accent ?? "#C9A24B"} />
          <Field name="sortOrder" label="Sıra" type="number" min={0} defaultValue={defaults?.sortOrder ?? 0} />
        </div>
        <CheckField name="featured" label="Ana səhifədə göstər" defaultChecked={defaults?.featured ?? false} />
        <div><SubmitButton>{id ? "Yadda saxla" : "Fənn yarat"}</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}
