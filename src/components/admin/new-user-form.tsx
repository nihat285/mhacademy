import { createUser } from "@/app/actions/admin";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";

/** Role is fixed by the page it is shown on; the server validates it again. */
export function NewUserForm({ role }: { role: "student" | "teacher" }) {
  return (
    <Card className="mb-6 p-5">
      <p className="mb-3 text-sm font-semibold">{role === "teacher" ? "Yeni müəllim hesabı" : "Yeni şagird hesabı"}</p>
      <ActionForm action={createUser} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="role" value={role} />
        <Field name="name" label="Ad, soyad" required />
        <Field name="email" label="E-poçt" type="email" required />
        <SubmitButton>Hesab yarat</SubmitButton>
      </ActionForm>
      <p className="mt-2 text-xs text-muted">Müvəqqəti şifrə yaradılır və yalnız bir dəfə göstərilir.</p>
    </Card>
  );
}
