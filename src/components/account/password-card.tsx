import { changePasswordAction } from "@/app/actions/account";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";

/** "Change my password" card, shared by the admin and teacher profile pages. */
export function PasswordCard() {
  return (
    <Card className="mt-8 max-w-3xl p-5 sm:p-7">
      <h2 className="font-sans text-lg font-bold">Şifrəni dəyiş</h2>
      <p className="mt-1 text-sm text-muted">Şifrə dəyişəndə digər cihazlardakı girişləriniz bağlanır.</p>
      <ActionForm action={changePasswordAction} className="mt-5 grid gap-5">
        <Field name="currentPassword" label="Cari şifrə" type="password" autoComplete="current-password" required />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="password" label="Yeni şifrə" type="password" autoComplete="new-password" required />
          <Field name="passwordConfirm" label="Yeni şifrə (təkrar)" type="password" autoComplete="new-password" required />
        </div>
        <div>
          <SubmitButton>Şifrəni dəyiş</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
