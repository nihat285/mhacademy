import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/panel/shell";
import { buttonClasses } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { TableWrap, THead, Th, Td, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";
import { isReleased } from "@/lib/exam/release";
import { listMyAttempts } from "@/lib/exam/results";
import { formatDateTime, formatDuration, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Nəticələrim" };

export default async function MyResultsPage() {
  const user = await requireRole(["student"], "/panel/neticelerim");
  await finalizeExpiredAttempts({ userId: user.id });
  const rows = await listMyAttempts(user.id);
  const now = new Date();
  return (
    <div>
      <PageHeader title="Nəticələrim" intro="Bütün sınaq cəhdləriniz və nəticələri." />
      {rows.length === 0 ? (
        <EmptyState icon={<History size={28} />} title="Hələ sınaq verməmisiniz" action={<Link href="/panel/sinaqlar" className={buttonClasses("primary", "md")}>Sınaqlara bax</Link>}>İlk sınağınızdan sonra nəticələriniz və irəliləyişiniz burada görünəcək.</EmptyState>
      ) : (
        <TableWrap>
          <THead><tr><Th>Sınaq</Th><Th>Tarix</Th><Th>Nəticə</Th><Th>Düz / Səhv / Boş</Th><Th>Vaxt</Th><Th><span className="sr-only">Bax</span></Th></tr></THead>
          <tbody>
            {rows.map((r) => {
              const released = isReleased(r, now);
              return (
                <Tr key={r.id}>
                  <Td><p className="font-semibold">{r.title}</p><p className="text-xs text-muted">{r.subject} · cəhd {r.no}</p></Td>
                  <Td className="whitespace-nowrap text-muted">{r.submittedAt ? formatDateTime(r.submittedAt) : "—"}</Td>
                  <Td>{released ? <div className="flex items-center gap-2"><span className="font-bold tabular-nums">{formatPercent(Number(r.percentage))}</span><Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Keçdi" : "Keçmədi"}</Badge></div> : <Badge tone="warning">Açıqlanmayıb</Badge>}</Td>
                  <Td className="tabular-nums">{released ? `${r.correct} / ${r.incorrect} / ${r.unanswered}` : "—"}</Td>
                  <Td className="whitespace-nowrap tabular-nums text-muted">{r.timeSpentSec != null ? formatDuration(r.timeSpentSec) : "—"}</Td>
                  <Td><Link href={`/panel/neticelerim/${r.id}`} className="font-semibold text-accent-ink hover:underline">Ətraflı</Link></Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
