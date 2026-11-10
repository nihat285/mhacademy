import type { Metadata } from "next";
import Link from "next/link";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { FilterBar, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { listAllQuestions } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Sual bankı" };
const TYPE = { mcq: "Çoxvariantlı", true_false: "Doğru/Yanlış", numeric: "Ədədi" } as const;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function QuestionsAdmin({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/suallar");
  const q = one((await searchParams).q) ?? "";
  const rows = await listAllQuestions(q || undefined);
  return (
    <>
      <PageHeader title="Sual bankı" intro="Bütün müəllimlərin sualları. Redaktə müəllim redaktorunda açılır." actions={<LinkButton href="/muellim/suallar/yeni">Yeni sual</LinkButton>} />
      <FilterBar action="/idare/suallar" q={q} placeholder="Sual mətni…" />
      {rows.length === 0 ? (
        <EmptyState title="Sual tapılmadı" />
      ) : (
        <TableWrap>
          <THead><tr><Th>Sual</Th><Th>Fənn</Th><Th>Müəllif</Th><Th>Tip</Th><Th>Çətinlik</Th></tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="max-w-md"><Link href={`/muellim/suallar/${r.id}`} className="line-clamp-2 font-medium hover:text-accent-ink">{r.text}</Link></Td>
                <Td>{r.subject}</Td>
                <Td>{r.author ?? "—"}</Td>
                <Td><Badge>{TYPE[r.type]}</Badge></Td>
                <Td>{DIFFICULTY_LABEL[r.difficulty]}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
