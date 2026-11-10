import type { Metadata } from "next";
import Link from "next/link";
import { deleteSubject } from "@/app/actions/admin";
import { SubjectForm } from "@/components/admin/subject-form";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listSubjectsAdmin } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Fənlər və mövzular" };

export default async function SubjectsAdmin() {
  await requireRole(["admin"], "/idare/fenler");
  const rows = await listSubjectsAdmin();
  return (
    <>
      <PageHeader title="Fənlər və mövzular" intro="Kataloqun əsası: fənn seçildikdən sonra mövzular əlavə olunur." />
      <TableWrap className="mb-8">
        <THead>
          <tr><Th>Fənn</Th><Th>Mövzu</Th><Th>Kurs</Th><Th>Dərs</Th><Th className="text-right">Əməliyyat</Th></tr>
        </THead>
        <tbody>
          {rows.map((s) => (
            <Tr key={s.id}>
              <Td className="font-semibold">
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: s.accent ?? undefined }} />
                <Link href={`/idare/fenler/${s.id}`} className="hover:text-accent-ink">{s.name}</Link>
                {s.featured && <Badge tone="gold" className="ml-2">Ana səhifə</Badge>}
              </Td>
              <Td>{s.topicCount}</Td>
              <Td>{s.courseCount}</Td>
              <Td>{s.lessonCount}</Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <LinkButton href={`/idare/fenler/${s.id}`} variant="outline" size="sm">Mövzular</LinkButton>
                  <ConfirmButton action={deleteSubject.bind(null, s.id)} title="Fənn silinsin?" description="Mövzuları da silinəcək. Kurs, dərs və sualı olan fənn silinmir." confirmLabel="Sil">Sil</ConfirmButton>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableWrap>
      <h2 className="mb-3 text-xl font-semibold">Yeni fənn</h2>
      <SubjectForm id={null} />
    </>
  );
}
