import type { Metadata } from "next";
import { deleteMessage, setMessageHandled } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { listMessages } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Mesajlar" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MessagesAdmin({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/mesajlar");
  const open = one((await searchParams).gorunus) === "acik";
  const rows = await listMessages(open);
  const chip = (on: boolean) => cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold", on ? "border-accent bg-accent text-on-accent" : "border-border-strong hover:bg-surface-2");
  return (
    <>
      <PageHeader title="Mesajlar" intro="Əlaqə formasından gələn mesajlar." />
      <div className="mb-5 flex gap-2">
        <a href="/idare/mesajlar" className={chip(!open)}>Hamısı</a>
        <a href="/idare/mesajlar?gorunus=acik" className={chip(open)}>Cavablanmamış</a>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Mesaj yoxdur" />
      ) : (
        <div className="grid max-w-3xl gap-3">
          {rows.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-sans text-base font-bold">{m.name}</h2>
                <Badge tone={m.handledAt ? "success" : "warning"}>{m.handledAt ? "Cavablanıb" : "Yeni"}</Badge>
                <span className="ml-auto text-xs text-muted">{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{m.email}</p>
              <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LinkButton href={`mailto:${m.email}?subject=${encodeURIComponent("MH Academy — mesajınıza cavab")}`} variant="outline" size="sm">E-poçtla cavab ver</LinkButton>
                <ActionButton action={setMessageHandled.bind(null, m.id, !m.handledAt)}>{m.handledAt ? "Yenidən aç" : "Cavablandı kimi işarələ"}</ActionButton>
                <ConfirmButton action={deleteMessage.bind(null, m.id)} title="Mesaj silinsin?" confirmLabel="Sil">Sil</ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
