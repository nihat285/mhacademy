import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { deleteLesson } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMinutes } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listLessons } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Dərslərim" };

export default async function TeacherLessons() {
  const user = await requireRole(["teacher", "admin"], "/muellim/dersler");
  if (!can(user, "lessons.manage")) return <><PageHeader title="Dərslər" /><NoAccess what="Dərs idarəetməsi" /></>;
  const rows = await listLessons(user);
  return (
    <>
      <PageHeader
        title="Dərslər"
        intro={user.role === "admin" ? "Bütün dərslər." : "Yaratdığınız dərslər. Qaralamalar yalnız sizə görünür."}
        actions={<LinkButton href="/muellim/dersler/yeni"><Plus size={16} /> Yeni dərs</LinkButton>}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title="Hələ dərs yoxdur" action={<LinkButton href="/muellim/dersler/yeni">İlk dərsi yarat</LinkButton>}>
          Video və ya yazılı qeydlərlə dərs əlavə edin.
        </EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Dərs</Th><Th>Fənn</Th><Th>Müddət</Th><Th>Status</Th><Th>Yenilənib</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((l) => (
              <Tr key={l.id}>
                <Td className="font-semibold"><Link href={`/muellim/dersler/${l.id}`} className="hover:text-accent-ink">{l.title}</Link></Td>
                <Td>{l.subject}</Td>
                <Td>{l.durationSec ? formatMinutes(Math.round(l.durationSec / 60)) : "—"}</Td>
                <Td><Badge tone={l.published ? "success" : "neutral"}>{l.published ? "Dərc olunub" : "Qaralama"}</Badge></Td>
                <Td>{formatDate(l.updatedAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/muellim/dersler/${l.id}`} variant="outline" size="sm">Redaktə</LinkButton>
                    <ConfirmButton action={deleteLesson.bind(null, l.id)} title="Dərs silinsin?" description="Bu əməliyyat geri qaytarılmır. Şagirdlərin izləmə irəliləyişi də silinəcək." confirmLabel="Sil">Sil</ConfirmButton>
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
