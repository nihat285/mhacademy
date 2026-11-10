import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { createClass, deleteClass } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listClasses } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Siniflərim" };

export default async function TeacherClasses() {
  const user = await requireRole(["teacher", "admin"], "/muellim/sinifler");
  if (!can(user, "exams.assign")) return <><PageHeader title="Siniflər" /><NoAccess what="Sinif idarəetməsi" /></>;
  const rows = await listClasses(user);
  return (
    <>
      <PageHeader title="Siniflər" intro="Şagirdləri qruplaşdırın, sınaqları və elanları sinfə təyin edin." />
      <Card className="mb-6 p-5">
        <ActionForm action={createClass} className="grid items-end gap-4 sm:grid-cols-[1fr_10rem_auto]">
          <Field name="name" label="Yeni sinif / qrup adı" placeholder="Məs.: 11-A riyaziyyat" required />
          <Field name="grade" label="Sinif (1–11)" type="number" min={1} max={11} />
          <SubmitButton>Yarat</SubmitButton>
        </ActionForm>
      </Card>
      {rows.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="Hələ sinif yoxdur">Yuxarıdakı formla ilk sinfi yaradın.</EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Ad</Th><Th>Sinif</Th><Th>Şagird</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold"><Link href={`/muellim/sinifler/${c.id}`} className="hover:text-accent-ink">{c.name}</Link></Td>
                <Td>{c.grade ?? "—"}</Td>
                <Td>{c.members}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/muellim/sinifler/${c.id}`} variant="outline" size="sm">Aç</LinkButton>
                    <ConfirmButton action={deleteClass.bind(null, c.id)} title="Sinif silinsin?" description="Üzvlük və bu sinfə təyinatlar silinəcək; şagird hesabları qalır." confirmLabel="Sil">Sil</ConfirmButton>
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
