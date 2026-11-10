import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { createAnnouncement, deleteAnnouncement } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listAnnouncements, listClasses } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Elanlar" };

export default async function TeacherAnnouncements() {
  const user = await requireRole(["teacher", "admin"], "/muellim/elanlar");
  if (!can(user, "announcements.publish")) return <><PageHeader title="Elanlar" /><NoAccess what="Elan dərc etmək" /></>;
  const [rows, classes] = await Promise.all([listAnnouncements(user), can(user, "exams.assign") ? listClasses(user) : Promise.resolve([])]);
  const audience = [
    { value: "all", label: "Hamı" },
    { value: "students", label: "Bütün şagirdlər" },
    ...(classes.length ? [{ value: "class", label: "Seçilmiş sinif" }] : []),
  ];
  return (
    <>
      <PageHeader title="Elanlar" intro="Sinif elanları üzvlərə bildiriş kimi də göndərilir." />
      <Card className="mb-6 max-w-3xl p-5 sm:p-6">
        <ActionForm action={createAnnouncement} className="grid gap-4">
          <Field name="title" label="Başlıq" required maxLength={200} />
          <TextArea name="body" label="Mətn" required className="[&_textarea]:min-h-28" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="audience" label="Kimlər görsün" options={audience} />
            <SelectField name="classId" label="Sinif (yalnız “Seçilmiş sinif” üçün)" options={[{ value: "", label: "—" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          <div><SubmitButton>Dərc et</SubmitButton></div>
        </ActionForm>
      </Card>
      {rows.length === 0 ? (
        <EmptyState icon={<Megaphone size={28} />} title="Hələ elan yoxdur" />
      ) : (
        <div className="grid max-w-3xl gap-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-sans text-base font-bold">{a.title}</h2>
                <Badge tone="gold">{a.audience === "class" ? (a.className ?? "Sinif") : a.audience === "students" ? "Şagirdlər" : a.audience === "teachers" ? "Müəllimlər" : "Hamı"}</Badge>
                <span className="ml-auto text-xs text-muted">{formatDateTime(a.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{a.body}</p>
              <div className="mt-3">
                <ConfirmButton action={deleteAnnouncement.bind(null, a.id)} title="Elan silinsin?" confirmLabel="Sil">Sil</ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
