import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Plus } from "lucide-react";
import { deleteQuestion } from "@/app/actions/teacher";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FilterBar, selectClass, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { can } from "@/lib/permissions";
import { getSubjectsWithTopics, listQuestions, questionIdsUsedInExams } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Sual bankı" };

const TYPE = { mcq: "Çoxvariantlı", true_false: "Doğru/Yanlış", numeric: "Ədədi" } as const;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TeacherQuestions({ searchParams }: { searchParams: SP }) {
  const user = await requireRole(["teacher", "admin"], "/muellim/suallar");
  if (!can(user, "questions.manage")) return <><PageHeader title="Sual bankı" /><NoAccess what="Sual bankı" /></>;
  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const fen = one(sp.fen) ?? "";
  const [{ subjects }, rows] = await Promise.all([
    getSubjectsWithTopics(),
    listQuestions(user, { subjectId: /^[0-9a-f-]{36}$/i.test(fen) ? fen : undefined, q: q || undefined }),
  ]);
  const used = await questionIdsUsedInExams(rows.map((r) => r.id));
  return (
    <>
      <PageHeader title="Sual bankı" intro="Sınaqlarda və təkrarda istifadə olunan suallar." actions={<LinkButton href="/muellim/suallar/yeni"><Plus size={16} /> Yeni sual</LinkButton>} />
      <FilterBar action="/muellim/suallar" q={q} placeholder="Sual mətnində axtar…">
        <select name="fen" defaultValue={fen} className={selectClass} aria-label="Fənn">
          <option value="">Bütün fənlər</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon={<HelpCircle size={28} />} title="Sual tapılmadı" action={<LinkButton href="/muellim/suallar/yeni">Sual əlavə et</LinkButton>}>
          Filtri dəyişin və ya yeni sual yaradın.
        </EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Sual</Th><Th>Fənn</Th><Th>Tip</Th><Th>Çətinlik</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="max-w-md"><Link href={`/muellim/suallar/${r.id}`} className="line-clamp-2 font-medium hover:text-accent-ink">{r.text}</Link></Td>
                <Td>{r.subject}</Td>
                <Td><Badge>{TYPE[r.type]}</Badge></Td>
                <Td>{DIFFICULTY_LABEL[r.difficulty]}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/muellim/suallar/${r.id}`} variant="outline" size="sm">Redaktə</LinkButton>
                    {used.has(r.id) ? (
                      <Badge tone="info">Sınaqda</Badge>
                    ) : (
                      <ConfirmButton action={deleteQuestion.bind(null, r.id)} title="Sual silinsin?" description="Bu əməliyyat geri qaytarılmır." confirmLabel="Sil">Sil</ConfirmButton>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {rows.length === 200 && <p className="mt-3 text-xs text-muted">Ən son 200 sual göstərilir. Axtarışla daraldın.</p>}
    </>
  );
}
