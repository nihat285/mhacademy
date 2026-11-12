import type { Metadata } from "next";
import { saveAdminProfile } from "@/app/actions/account";
import { PasswordCard } from "@/components/account/password-card";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil" };

export default async function AdminProfilePage() {
  const user = await requireRole(["admin"], "/idare/profil");
  return (
    <>
      <PageHeader title="Profil" intro="Öz hesabınızın məlumatları və şifrəsi." />
      <Card className="max-w-3xl p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="font-sans text-lg font-bold">Hesab</h2>
          <Badge tone="info">Administrator</Badge>
        </div>
        <ActionForm action={saveAdminProfile} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="name" label="Ad, soyad" defaultValue={user.name} required maxLength={120} />
            <Field name="email" label="Giriş e-poçtu" defaultValue={user.email} disabled readOnly hint="E-poçt dəyişdirilmir." />
          </div>
          <div>
            <SubmitButton>Yadda saxla</SubmitButton>
          </div>
        </ActionForm>
      </Card>
      <PasswordCard />
    </>
  );
}
