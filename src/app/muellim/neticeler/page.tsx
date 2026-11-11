import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatPercent } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listExamResultSummaries } from "@/lib/queries/teacher-results";

export const metadata: Metadata = { title: "Sınaq nəticələri" };

export default async function TeacherResults() {
  const user = await requireRole(["teacher", "admin"], "/muellim/neticeler");
  if (!can(user, "exams.manage")) return <><PageHeader title="Nəticələr" /><NoAccess what="Sınaq nəticələri" /></>;
  const rows = await listExamResultSummaries(user);
  return (
    <>
      <PageHeader title="Sınaq nəticələri" intro="Yaratdığınız sınaqlar üzrə şagirdlərin nəticələri, orta bal və ən çətin suallar." />
      {rows.length === 0 ? (
        <EmptyState icon={<BarChart3 size={28} />} title="Hələ sınaq yoxdur" action={<LinkButton href="/muellim/sinaqlar/yeni">Sınaq yarat</LinkButton>}>
          Sınaq yaradıb şagirdlər həll etdikdən sonra nəticələr burada görünəcək.
        </EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Sınaq</Th><Th>Fənn</Th><Th>Tarix</Th><Th>Şagird</Th><Th>Cəhd</Th><Th>Orta nəticə</Th><Th>Keçid</Th><Th className="text-right">Bax</Th></tr>
          </THead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td className="font-semibold">
                  <Link href={`/muellim/neticeler/${e.id}`} className="hover:text-accent-ink">{e.title}</Link>
                  {e.inProgress > 0 && <span className="block text-xs font-normal text-muted">{e.inProgress} nəfər hələ həll edir</span>}
                </Td>
                <Td>{e.subject}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(e.startsAt)}</Td>
                <Td>{e.students}</Td>
                <Td>{e.submitted}</Td>
                <Td>{e.submitted ? formatPercent(e.avg) : "—"}</Td>
                <Td>{e.submitted ? <Badge tone={e.passed / e.submitted >= 0.5 ? "success" : "warning"}>{e.passed}/{e.submitted}</Badge> : "—"}</Td>
                <Td className="text-right"><LinkButton href={`/muellim/neticeler/${e.id}`} variant="outline" size="sm">Nəticələr</LinkButton></Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
