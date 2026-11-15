import type { Metadata } from "next";
import { savePaymentInfo, savePlan } from "@/app/actions/subscriptions";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, CheckField, Field, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getPaymentInfo, listPlans } from "@/lib/queries/subscriptions";

export const metadata: Metadata = { title: "VIP paketlər" };

export default async function PlansAdmin() {
  await requireRole(["admin"], "/idare/paketler");
  const [plans, payment] = await Promise.all([listPlans(), getPaymentInfo()]);
  return (
    <>
      <PageHeader title="VIP paketlər" intro="Paketlərin adını, aylıq qiymətini və neçə fənn seçməyə icazə verdiyini buradan dəyişin. Dəyişiklik dərhal saytda görünür." />
      <div className="grid max-w-4xl gap-5">
        {plans.map((p) => (
          <Card key={p.id} className="p-5 sm:p-6">
            <ActionForm action={savePlan.bind(null, p.id)} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="name" label="Ad" defaultValue={p.name} required maxLength={80} />
                <Field name="priceAzn" label="Aylıq qiymət (AZN)" type="number" min={0} defaultValue={p.priceAzn} required />
                <Field name="subjectLimit" label="Fənn sayı" type="number" min={1} defaultValue={p.subjectLimit ?? ""} hint="Boş qoysanız: bütün fənlər" />
              </div>
              <TextArea name="description" label="Təsvir" defaultValue={p.description ?? ""} className="[&_textarea]:min-h-16" />
              <CheckField name="active" label="Saytda göstərilsin" defaultChecked={p.active} />
              <div>
                <SubmitButton>Yadda saxla</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ))}
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Ödəniş təlimatı</h2>
          <p className="mb-3 text-sm text-muted">Şagirdə paket səhifəsində göstərilir: ödənişi hara və necə etsin (kart nömrəsi, telefon, əlaqə və s.).</p>
          <ActionForm action={savePaymentInfo} className="grid gap-4">
            <TextArea name="text" label="Mətn" defaultValue={payment} className="[&_textarea]:min-h-28" />
            <div>
              <SubmitButton>Yadda saxla</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
