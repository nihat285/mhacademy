import { Check, Crown } from "lucide-react";
import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPaymentInfo, listPlans } from "@/lib/queries/subscriptions";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "VIP paketlər", description: "VIP video dərslər, PDF materiallar və sınaqlar üçün aylıq paketlər." };

const PERKS = ["VIP video dərslər", "Dərs PDF materialları", "VIP sınaqlar", "Müəllimlərin yazılı qeydləri"];

export default async function Page() {
  const [plans, user, payment] = await Promise.all([listPlans(true), getCurrentUser(), getPaymentInfo()]);
  const cta = (id: string) => (!user ? `/giris?next=${encodeURIComponent(`/panel/paket?paket=${id}`)}` : user.role === "student" ? `/panel/paket?paket=${id}` : null);
  return (
    <>
      <PageHeader eyebrow="MH Academy" title="VIP paketlər" intro="Seçdiyiniz fənlər üzrə bütün VIP dərslərə, PDF materiallara və sınaqlara aylıq çıxış." />
      <Container className="max-w-5xl">
        {plans.length === 0 ? (
          <p className="text-muted">Paketlər tezliklə əlavə olunacaq.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((p, i) => {
              const href = cta(p.id);
              const featured = plans.length === 3 && i === 1;
              return (
                <Card key={p.id} className={`flex flex-col p-6 ${featured ? "border-accent shadow-pop" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Crown size={18} className="text-accent-ink" />
                    <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                  </div>
                  <p className="mt-4 font-display text-4xl font-semibold">
                    {p.priceAzn} <span className="text-base font-medium text-muted">AZN / ay</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-accent-ink">{p.subjectLimit === null ? "Bütün fənlər" : `${p.subjectLimit} fənn seçimi`}</p>
                  {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
                  <ul className="mt-5 space-y-2 text-sm">
                    {PERKS.map((x) => (
                      <li key={x} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-success" /> {x}</li>
                    ))}
                  </ul>
                  {href && (
                    <div className="mt-auto pt-6">
                      <LinkButton href={href} variant={featured ? "primary" : "outline"} className="w-full">Paketi seç</LinkButton>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        {payment && (
          <Card className="mt-8 p-6">
            <h2 className="font-display text-lg font-semibold">Ödəniş necə edilir?</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{payment}</p>
          </Card>
        )}
      </Container>
    </>
  );
}
