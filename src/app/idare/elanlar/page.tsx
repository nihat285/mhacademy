import type { Metadata } from "next";
import { createAdminAnnouncement, deleteAnyAnnouncement } from "@/app/actions/admin";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listAnnouncementsAdmin } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Elanlar" };
const AUD = { all: "Hamı", students: "Şagirdlər", teachers: "Müəllimlər", class: "Sinif" } as const;

export default async function AnnouncementsAdmin() {
  await requireRole(["admin"], "/idare/elanlar");
  const rows = await listAnnouncementsAdmin();
  return (
    <>
      <PageHeader title="Elanlar" intro="Platforma üzrə elanlar (müəllimlərin sinif elanları da burada görünür)." />
      <Card className="mb-6 max-w-3xl p-5 sm:p-6">
        <ActionForm action={createAdminAnnouncement} className="grid gap-4">
          <Field name="title" label="Başlıq" required maxLength={200} />
          <TextArea name="body" label="Mətn" required className="[&_textarea]:min-h-28" />
          <SelectField name="audience" label="Kimlər görsün" options={[{ value: "all", label: "Hamı" }, { value: "students", label: "Şagirdlər" }, { value: "teachers", label: "Müəllimlər" }]} className="max-w-xs" />
          <div><SubmitButton>Dərc et</SubmitButton></div>
        </ActionForm>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="Hələ elan yoxdur" />
      ) : (
        <div className="grid max-w-3xl gap-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-sans text-base font-bold">{a.title}</h2>
                <Badge tone="gold">{AUD[a.audience]}</Badge>
                <span className="ml-auto text-xs text-muted">{a.author ?? "—"} · {formatDateTime(a.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{a.body}</p>
              <div className="mt-3"><ConfirmButton action={deleteAnyAnnouncement.bind(null, a.id)} title="Elan silinsin?" confirmLabel="Sil">Sil</ConfirmButton></div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
