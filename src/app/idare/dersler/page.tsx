import type { Metadata } from "next";
import Link from "next/link";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { FilterBar, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listAllLessons } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Video dərslər" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LessonsAdmin({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/dersler");
  const q = one((await searchParams).q) ?? "";
  const rows = await listAllLessons(q || undefined);
  return (
    <>
      <PageHeader title="Video dərslər" intro="Bütün müəllimlərin dərsləri. Redaktə müəllim redaktorunda açılır." actions={<LinkButton href="/muellim/dersler/yeni">Yeni dərs</LinkButton>} />
      <FilterBar action="/idare/dersler" q={q} placeholder="Dərs başlığı…" />
      {rows.length === 0 ? (
        <EmptyState title="Dərs tapılmadı" />
      ) : (
        <TableWrap>
          <THead><tr><Th>Dərs</Th><Th>Fənn</Th><Th>Müəllim</Th><Th>Status</Th><Th>Yenilənib</Th></tr></THead>
          <tbody>
            {rows.map((l) => (
              <Tr key={l.id}>
                <Td className="font-semibold"><Link href={`/muellim/dersler/${l.id}`} className="hover:text-accent-ink">{l.title}</Link></Td>
                <Td>{l.subject}</Td>
                <Td>{l.teacher ?? "—"}</Td>
                <Td><Badge tone={l.published ? "success" : "neutral"}>{l.published ? "Dərc olunub" : "Qaralama"}</Badge></Td>
                <Td>{formatDate(l.updatedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
