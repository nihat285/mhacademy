import type { Metadata } from "next";
import { addFaq, addTestimonial, deleteFaq, deleteTestimonial, saveSiteContact, toggleFaq, toggleTestimonial } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, CheckField, Field, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getContactSettings } from "@/lib/queries/catalog";
import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listFaqs, listTestimonials } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Sayt məzmunu" };

export default async function SiteContent() {
  await requireRole(["admin"], "/idare/sayt");
  const [contact, [socialsRow], faqs, testimonials] = await Promise.all([
    getContactSettings(),
    db.select().from(siteSettings).where(eq(siteSettings.key, "socials")).limit(1),
    listFaqs(),
    listTestimonials(),
  ]);
  const socials = (socialsRow?.value ?? {}) as Record<string, string>;
  return (
    <>
      <PageHeader title="Sayt məzmunu" intro="Əlaqə məlumatları, tez-tez verilən suallar və rəylər." />
      <div className="grid max-w-3xl gap-8">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 text-xl font-semibold">Əlaqə və sosial şəbəkələr</h2>
          {contact.demo && <p className="mb-3 text-sm text-warning">Hazırda nümunə (demo) məlumatlar göstərilir. Yadda saxlayanda bu qeyd silinəcək.</p>}
          <ActionForm action={saveSiteContact} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="email" label="E-poçt" type="email" defaultValue={contact.email ?? ""} />
              <Field name="phone" label="Telefon" defaultValue={contact.phone ?? ""} />
            </div>
            <Field name="address" label="Ünvan" defaultValue={contact.address ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              {(["instagram", "facebook", "youtube", "telegram"] as const).map((k) => (
                <Field key={k} name={k} label={k[0].toUpperCase() + k.slice(1)} defaultValue={socials[k] ?? ""} placeholder="https://…" />
              ))}
            </div>
            <div><SubmitButton>Yadda saxla</SubmitButton></div>
          </ActionForm>
        </Card>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Tez-tez verilən suallar</h2>
          <Card className="mb-4 p-5">
            <ActionForm action={addFaq} className="grid gap-3">
              <Field name="question" label="Sual" required />
              <TextArea name="answer" label="Cavab" required className="[&_textarea]:min-h-20" />
              <div><SubmitButton>Əlavə et</SubmitButton></div>
            </ActionForm>
          </Card>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {faqs.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1"><p className="font-semibold">{f.question}</p><p className="mt-1 text-muted">{f.answer}</p></div>
                <div className="flex items-center gap-2">
                  <Badge tone={f.published ? "success" : "neutral"}>{f.published ? "Görünür" : "Gizli"}</Badge>
                  <ActionButton action={toggleFaq.bind(null, f.id, !f.published)}>{f.published ? "Gizlət" : "Göstər"}</ActionButton>
                  <ConfirmButton action={deleteFaq.bind(null, f.id)} title="Sual silinsin?" confirmLabel="Sil">Sil</ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-semibold">Rəylər</h2>
          <p className="mb-3 text-sm text-muted">Yalnız real və müəllifin razılığı olan rəyləri əlavə edin. “Nümunə” işarəli rəylər saytda açıq şəkildə belə göstərilir.</p>
          <Card className="mb-4 p-5">
            <ActionForm action={addTestimonial} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="authorName" label="Müəllif" required />
                <Field name="authorRole" label="Status (məs.: 11-ci sinif şagirdi)" />
              </div>
              <TextArea name="quote" label="Rəy" required className="[&_textarea]:min-h-20" />
              <CheckField name="consent" label="Müəllif rəyin yayımlanmasına razılıq verib" />
              <div><SubmitButton>Əlavə et</SubmitButton></div>
            </ActionForm>
          </Card>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {testimonials.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.authorName}{t.authorRole ? <span className="font-normal text-muted"> · {t.authorRole}</span> : null}</p>
                  <p className="mt-1 text-muted">{t.quote}</p>
                </div>
                <div className="flex items-center gap-2">
                  {t.isPlaceholder && <Badge tone="warning">Nümunə</Badge>}
                  <Badge tone={t.published ? "success" : "neutral"}>{t.published ? "Görünür" : "Gizli"}</Badge>
                  <ActionButton action={toggleTestimonial.bind(null, t.id, !t.published)}>{t.published ? "Gizlət" : "Göstər"}</ActionButton>
                  <ConfirmButton action={deleteTestimonial.bind(null, t.id)} title="Rəy silinsin?" confirmLabel="Sil">Sil</ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
