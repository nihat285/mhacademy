import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { deleteExam } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime, VISIBILITY_LABEL } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listExams } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Sınaqlarım" };

const STATUS = { draft: ["Qaralama", "neutral"], published: ["Dərc olunub", "success"], archived: ["Arxiv", "warning"] } as const;

export default async function TeacherExams() {
  const user = await requireRole(["teacher", "admin"], "/muellim/sinaqlar");
  if (!can(user, "exams.manage")) return <><PageHeader title="Sınaqlar" /><NoAccess what="Sınaq idarəetməsi" /></>;
  const rows = await listExams(user);
  return (
    <>
      <PageHeader title="Sınaqlar" actions={<LinkButton href="/muellim/sinaqlar/yeni"><Plus size={16} /> Yeni sınaq</LinkButton>} />
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="Hələ sınaq yoxdur" action={<LinkButton href="/muellim/sinaqlar/yeni">İlk sınağı yarat</LinkButton>}>
          Sual bankından suallar seçib sınaq qurun.
        </EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Sınaq</Th><Th>Fənn</Th><Th>Vaxt</Th><Th>Suallar</Th><Th>Cəhdlər</Th><Th>Status</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td className="font-semibold">
                  <Link href={`/muellim/sinaqlar/${e.id}`} className="hover:text-accent-ink">{e.title}</Link>
                  <span className="block text-xs font-normal text-muted">{VISIBILITY_LABEL[e.visibility]}</span>
                </Td>
                <Td>{e.subject}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(e.startsAt)}<br />{formatDateTime(e.endsAt)}</Td>
                <Td>{e.questionCount}</Td>
                <Td>{e.attemptCount}</Td>
                <Td><Badge tone={STATUS[e.status][1]}>{STATUS[e.status][0]}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/muellim/sinaqlar/${e.id}`} variant="outline" size="sm">Redaktə</LinkButton>
                    <ConfirmButton action={deleteExam.bind(null, e.id)} title="Sınaq silinsin?" description="Cəhdi olan sınaqları silmək olmur — onları arxivə göndərin." confirmLabel="Sil">Sil</ConfirmButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
