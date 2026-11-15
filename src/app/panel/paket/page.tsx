import type { Metadata } from "next";
import { cancelMyRequest } from "@/app/actions/subscriptions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/panel/shell";
import { RequestForm } from "@/components/subscription/request-form";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getMySubscriptions, getPaymentInfo, getSubjectChoices, listPlans } from "@/lib/queries/subscriptions";

export const metadata: Metadata = { title: "Paketim" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MyPlan({ searchParams }: { searchParams: SP }) {
  const user = await requireRole(["student"], "/panel/paket");
  const sp = await searchParams;
  const [mine, plans, subjects, payment] = await Promise.all([getMySubscriptions(user.id), listPlans(true), getSubjectChoices(), getPaymentInfo()]);
  const active = mine.filter((m) => m.state === "active");
  const pending = mine.find((m) => m.state === "pending");
  const wanted = typeof sp.paket === "string" ? plans.find((p) => p.id === sp.paket)?.id : undefined;
  return (
    <>
      <PageHeader title="Paketim" intro="VIP dərslərə, PDF-lərə və sınaqlara çıxış üçün aylıq paket seçin." />
      <div className="grid max-w-3xl gap-6">
        {active.map((a) => (
          <Card key={a.id} className="border-success/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">Aktiv</Badge>
              <span className="font-display text-lg font-semibold">{a.planName}</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {a.subjectLimit === null ? "Bütün fənlər" : a.subjectNames.join(", ")} · {a.endsAt ? `${formatDate(a.endsAt)} tarixinədək` : ""}
            </p>
          </Card>
        ))}
        {pending && (
          <Card className="border-warning/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Ödəniş gözləyir</Badge>
              <span className="font-display text-lg font-semibold">{pending.planName}</span>
              <span className="text-sm text-muted">{pending.priceAzn} AZN</span>
            </div>
            <p className="mt-2 text-sm text-muted">{pending.subjectLimit === null ? "Bütün fənlər" : pending.subjectNames.join(", ")}</p>
            <p className="mt-3 text-sm">Ödənişi etdikdən sonra administrator paketi aktivləşdirəcək.</p>
            <div className="mt-3">
              <ActionButton action={cancelMyRequest.bind(null, pending.id)}>Sorğunu ləğv et</ActionButton>
            </div>
          </Card>
        )}
        {payment && (
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Ödəniş necə edilir?</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{payment}</p>
          </Card>
        )}
        {!pending && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">{active.length ? "Yeni paket / yenilə" : "Paket seç"}</h2>
            {plans.length === 0 ? <p className="text-sm text-muted">Hazırda paket yoxdur.</p> : <RequestForm plans={plans} subjects={subjects} defaultPlanId={wanted} />}
          </Card>
        )}
      </div>
    </>
  );
}
