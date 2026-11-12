import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, CheckField, Field, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { PhotoUpload } from "@/components/teacher/photo-upload";
import { saveTeacherProfile } from "@/app/actions/teacher";
import { requireRole } from "@/lib/auth";
import { getTeacherProfile } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Profil" };

export default async function TeacherProfilePage() {
  const user = await requireRole(["teacher", "admin"], "/muellim/profil");
  const row = await getTeacherProfile(user.id);
  const p = row?.p;
  return (
    <>
      <PageHeader title="Profil" intro="Bu məlumatlar saytda müəllim səhifənizdə görünür." />
      <Card className="max-w-3xl p-5 sm:p-7">
        <ActionForm action={saveTeacherProfile} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="name" label="Ad, soyad" defaultValue={row?.name ?? user.name} required />
            <Field name="email" label="Giriş e-poçtu" defaultValue={row?.email ?? user.email} disabled readOnly hint="Giriş e-poçtunu administrator dəyişir." />
          </div>
          <Field name="headline" label="Qısa təqdimat" defaultValue={p?.headline ?? ""} placeholder="Məs.: Riyaziyyat müəllimi, 12 illik təcrübə" />
          <TextArea name="bio" label="Haqqında" defaultValue={p?.bio ?? ""} className="[&_textarea]:min-h-32" />
          <TextArea name="qualifications" label="Təhsil və sertifikatlar" defaultValue={p?.qualifications ?? ""} className="[&_textarea]:min-h-24" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="experienceYears" label="Təcrübə (il)" type="number" min={0} max={70} defaultValue={p?.experienceYears ?? ""} />
            <Field name="contactEmail" label="Əlaqə e-poçtu" type="email" defaultValue={p?.contactEmail ?? ""} />
          </div>
          <TextArea name="officeHours" label="Qəbul saatları" defaultValue={p?.officeHours ?? ""} className="[&_textarea]:min-h-20" />
          <PhotoUpload name="photoUrl" defaultValue={p?.photoUrl ?? ""} enabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
          <CheckField name="published" label="Profilim saytda görünsün" defaultChecked={p?.published ?? true} />
          <div>
            <SubmitButton>Yadda saxla</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
