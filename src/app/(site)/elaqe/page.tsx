import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { submitContactAction } from "@/app/actions/contact";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { ActionForm, Field, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { getContactSettings } from "@/lib/queries/catalog";

export const metadata: Metadata = { title: "Əlaqə", description: "MH Academy ilə əlaqə saxlayın." };

export default async function ContactPage() {
  const c = await getContactSettings();
  const items = [
    { icon: Mail, label: "E-poçt", value: c.email, href: c.email ? `mailto:${c.email}` : undefined },
    { icon: Phone, label: "Telefon", value: c.phone, href: c.phone ? `tel:${c.phone.replace(/[^+\d]/g, "")}` : undefined },
    { icon: MapPin, label: "Ünvan", value: c.address, href: undefined },
  ].filter((i) => i.value);
  return (
    <>
      <PageHeader eyebrow="Əlaqə" title="Bizimlə əlaqə saxlayın" intro="Sualınızı yazın, tezliklə cavab verək." />
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <Card className="p-6 sm:p-8">
            <ActionForm action={submitContactAction} className="space-y-4">
              <Field name="name" label="Adınız" autoComplete="name" required />
              <Field name="email" label="E-poçt" type="email" autoComplete="email" required />
              <TextArea name="message" label="Mesaj" rows={6} required />
              {/* Honeypot: hidden from people, bots fill it. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Veb sayt<input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <SubmitButton pendingText="Göndərilir…">Göndər</SubmitButton>
            </ActionForm>
          </Card>
          <aside className="space-y-4">
            {c.demo && <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">Aşağıdakı əlaqə məlumatları nümunədir.</p>}
            {items.map(({ icon: Icon, label, value, href }) => (
              <Card key={label} className="flex items-start gap-4 p-5">
                <Icon size={20} className="mt-0.5 text-accent-ink" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
                  {href ? <a href={href} className="font-semibold hover:underline">{value}</a> : <p className="font-semibold">{value}</p>}
                </div>
              </Card>
            ))}
          </aside>
        </div>
      </Container>
    </>
  );
}
