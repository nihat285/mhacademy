import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteCourse } from "@/app/actions/admin";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listCoursesAdmin } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Kurslar" };

export default async function CoursesAdmin() {
  await requireRole(["admin"], "/idare/kurslar");
  const rows = await listCoursesAdmin();
  return (
    <>
      <PageHeader title="Kurslar" intro="Dərsləri kurslara qruplaşdırın." actions={<LinkButton href="/idare/kurslar/yeni"><Plus size={16} /> Yeni kurs</LinkButton>} />
      {rows.length === 0 ? (
        <EmptyState title="Hələ kurs yoxdur" action={<LinkButton href="/idare/kurslar/yeni">Kurs yarat</LinkButton>} />
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Kurs</Th><Th>Fənn</Th><Th>Müəllim</Th><Th>Dərs</Th><Th>Status</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold"><Link href={`/idare/kurslar/${c.id}`} className="hover:text-accent-ink">{c.title}</Link></Td>
                <Td>{c.subject}</Td>
                <Td>{c.teacher ?? "—"}</Td>
                <Td>{c.lessonCount}</Td>
                <Td><Badge tone={c.published ? "success" : "neutral"}>{c.published ? "Dərc olunub" : "Qaralama"}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/idare/kurslar/${c.id}`} variant="outline" size="sm">Redaktə</LinkButton>
                    <ConfirmButton action={deleteCourse.bind(null, c.id)} title="Kurs silinsin?" description="Dərslər silinmir, yalnız kursdan ayrılır." confirmLabel="Sil">Sil</ConfirmButton>
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
