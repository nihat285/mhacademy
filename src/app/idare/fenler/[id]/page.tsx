import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { addTopic, deleteTopic } from "@/app/actions/admin";
import { SubjectForm } from "@/components/admin/subject-form";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireRole } from "@/lib/auth";
import { getSubjectAdmin } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Fənn" };

export default async function SubjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["admin"], `/idare/fenler/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await getSubjectAdmin(id);
  if (!s) notFound();
  return (
    <>
      <PageHeader title={s.name} actions={<LinkButton href="/idare/fenler" variant="outline">← Fənlər</LinkButton>} />
      <div className="grid gap-8">
        <SubjectForm id={id} defaults={s} />
        <section className="max-w-2xl">
          <h2 className="mb-3 text-xl font-semibold">Mövzular ({s.topics.length})</h2>
          <Card className="mb-4 p-5">
            <ActionForm action={addTopic.bind(null, id)} className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
              <Field name="name" label="Yeni mövzu" required />
              <SubmitButton>Əlavə et</SubmitButton>
            </ActionForm>
          </Card>
          {s.topics.length === 0 ? (
            <p className="text-sm text-muted">Hələ mövzu yoxdur.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {s.topics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <ConfirmButton action={deleteTopic.bind(null, id, t.id)} title="Mövzu silinsin?" description="Bu mövzuya bağlı dərs və suallar mövzusuz qalacaq." confirmLabel="Sil">Sil</ConfirmButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
