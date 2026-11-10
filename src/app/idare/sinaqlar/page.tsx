import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listAllExams } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Sınaqlar" };
const STATUS = { draft: ["Qaralama", "neutral"], published: ["Dərc olunub", "success"], archived: ["Arxiv", "warning"] } as const;

export default async function ExamsAdmin() {
  await requireRole(["admin"], "/idare/sinaqlar");
  const rows = await listAllExams();
  return (
    <>
      <PageHeader title="Sınaqlar" intro="Bütün sınaqlar. Redaktə müəllim redaktorunda açılır." actions={<LinkButton href="/muellim/sinaqlar/yeni">Yeni sınaq</LinkButton>} />
      {rows.length === 0 ? (
        <EmptyState title="Sınaq yoxdur" />
      ) : (
        <TableWrap>
          <THead><tr><Th>Sınaq</Th><Th>Fənn</Th><Th>Müəllif</Th><Th>Bitmə</Th><Th>Cəhd</Th><Th>Status</Th></tr></THead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td className="font-semibold"><Link href={`/muellim/sinaqlar/${e.id}`} className="hover:text-accent-ink">{e.title}</Link></Td>
                <Td>{e.subject}</Td>
                <Td>{e.author ?? "—"}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(e.endsAt)}</Td>
                <Td>{e.attempts}</Td>
                <Td><Badge tone={STATUS[e.status][1]}>{STATUS[e.status][0]}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
