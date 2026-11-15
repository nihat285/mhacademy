import type { Metadata } from "next";
import { activateSubscription, cancelSubscription, deleteSubscription, extendSubscription, grantSubscription } from "@/app/actions/subscriptions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/panel/shell";
import { PlanPicker } from "@/components/subscription/plan-picker";
import { ActionForm, Field, SubmitButton, type ActionState } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getSubjectChoices, listPlans, listSubscriptions, type SubState } from "@/lib/queries/subscriptions";

export const metadata: Metadata = { title: "Abunələr" };
const STATE: Record<SubState, [string, "warning" | "success" | "neutral" | "danger"]> = {
  pending: ["Ödəniş gözləyir", "warning"],
  active: ["Aktiv", "success"],
  expired: ["Müddəti bitib", "neutral"],
  cancelled: ["Ləğv olunub", "danger"],
};

function MonthsForm({ action, label }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; label: string }) {
  return (
    <ActionForm action={action} className="flex items-end gap-2" successMessage={false}>
      <Field name="months" label="Ay" type="number" min={1} max={36} defaultValue={1} className="w-20" />
      <SubmitButton size="sm">{label}</SubmitButton>
    </ActionForm>
  );
}

export default async function SubscriptionsAdmin() {
  await requireRole(["admin"], "/idare/abuneler");
  const [subs, plans, subjects] = await Promise.all([listSubscriptions(), listPlans(true), getSubjectChoices()]);
  const pending = subs.filter((s) => s.state === "pending");
  const rest = subs.filter((s) => s.state !== "pending");
  const subjectText = (s: (typeof subs)[number]) => (s.subjectLimit === null ? "Bütün fənlər" : s.subjectNames.join(", ") || "—");
  return (
    <>
      <PageHeader title="Abunələr" intro="Şagird paket sorğusu göndərir və ödənişi edir. Ödənişi aldıqdan sonra buradan aktivləşdirin. Müddət bitəndə giriş avtomatik bağlanır." />

      <section className="mb-10" aria-labelledby="pend-h">
        <h2 id="pend-h" className="mb-3 font-display text-xl font-semibold">Gözləyən sorğular ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="Gözləyən sorğu yoxdur" />
        ) : (
          <TableWrap>
            <THead><tr><Th>Şagird</Th><Th>Paket</Th><Th>Fənlər</Th><Th>Tarix</Th><Th>Təsdiq</Th></tr></THead>
            <tbody>
              {pending.map((s) => (
                <Tr key={s.id}>
                  <Td><span className="font-semibold">{s.userName}</span><br /><span className="text-xs text-muted">{s.userEmail}</span></Td>
                  <Td>{s.planName}<br /><span className="text-xs text-muted">{s.priceAzn} AZN / ay</span></Td>
                  <Td>{subjectText(s)}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap items-end gap-3">
                      <MonthsForm action={activateSubscription.bind(null, s.id)} label="Aktivləşdir" />
                      <ConfirmButton action={deleteSubscription.bind(null, s.id)} title="Sorğu silinsin?" description="Şagirdin sorğusu silinəcək." confirmLabel="Sil">Sil</ConfirmButton>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <section className="mb-10" aria-labelledby="grant-h">
        <h2 id="grant-h" className="mb-3 font-display text-xl font-semibold">Şagirdə paket ver</h2>
        <Card className="max-w-3xl p-5 sm:p-6">
          <ActionForm action={grantSubscription} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field name="email" label="Şagirdin e-poçtu" type="email" required />
              <Field name="months" label="Müddət (ay)" type="number" min={1} max={36} defaultValue={1} />
            </div>
            <PlanPicker plans={plans} subjects={subjects} />
            <div>
              <SubmitButton>Paketi ver</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </section>

      <section aria-labelledby="all-h">
        <h2 id="all-h" className="mb-3 font-display text-xl font-semibold">Bütün abunələr</h2>
        {rest.length === 0 ? (
          <EmptyState title="Hələ abunə yoxdur" />
        ) : (
          <TableWrap>
            <THead><tr><Th>Şagird</Th><Th>Paket</Th><Th>Fənlər</Th><Th>Bitmə</Th><Th>Status</Th><Th>Əməliyyat</Th></tr></THead>
            <tbody>
              {rest.map((s) => (
                <Tr key={s.id}>
                  <Td><span className="font-semibold">{s.userName}</span><br /><span className="text-xs text-muted">{s.userEmail}</span></Td>
                  <Td>{s.planName}</Td>
                  <Td>{subjectText(s)}</Td>
                  <Td className="whitespace-nowrap text-xs">{s.endsAt ? formatDate(s.endsAt) : "—"}</Td>
                  <Td><Badge tone={STATE[s.state][1]}>{STATE[s.state][0]}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap items-end gap-3">
                      <MonthsForm action={extendSubscription.bind(null, s.id)} label="Uzat" />
                      {s.state === "active" && <ActionButton action={cancelSubscription.bind(null, s.id)}>Ləğv et</ActionButton>}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </>
  );
}
