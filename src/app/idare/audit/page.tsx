import type { Metadata } from "next";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listAudit } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Audit jurnalı" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/audit");
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const { rows, total } = await listAudit({ q: q || undefined, page });
  return (
    <>
      <PageHeader title="Audit jurnalı" intro="Həssas əməliyyatların tarixçəsi (kim, nə vaxt, nəyi dəyişdi)." />
      <FilterBar action="/idare/audit" q={q} placeholder="Əməliyyat, obyekt və ya ad…" />
      {rows.length === 0 ? (
        <EmptyState title="Qeyd tapılmadı" />
      ) : (
        <TableWrap className="[&_table]:min-w-[52rem]">
          <THead><tr><Th>Tarix</Th><Th>İcraçı</Th><Th>Əməliyyat</Th><Th>Obyekt</Th><Th>Təfərrüat</Th><Th>IP</Th></tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</Td>
                <Td>{r.actor ?? "—"}</Td>
                <Td><code className="text-xs">{r.action}</code></Td>
                <Td className="text-xs">{r.entity ?? "—"}{r.entityId ? <span className="block text-muted">{r.entityId.slice(0, 8)}…</span> : null}</Td>
                <Td className="max-w-xs truncate text-xs text-muted">{r.meta ? JSON.stringify(r.meta) : "—"}</Td>
                <Td className="text-xs text-muted">{r.ip ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} total={total} basePath="/idare/audit" params={{ q }} />
    </>
  );
}
