import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { addClassMember, removeClassMember } from "@/app/actions/teacher";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { ActionForm, SubmitButton, TextArea } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getClassWithMembers } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Sinif" };

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["teacher", "admin"], `/muellim/sinifler/${id}`);
  if (!can(user, "exams.assign")) return <NoAccess what="Sinif idarəetməsi" />;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getClassWithMembers(user, id);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.name} intro={`${c.members.length} şagird${c.grade ? ` · ${c.grade}-ci sinif` : ""}`} actions={<LinkButton href="/muellim/sinifler" variant="outline">← Siniflər</LinkButton>} />
      <Card className="mb-6 p-5">
        <ActionForm action={addClassMember.bind(null, id)} className="grid gap-4">
          <TextArea name="emails" label="Şagirdləri e-poçtla əlavə et" hint="Bir neçə ünvanı vergül, boşluq və ya yeni sətirlə ayırın. Yalnız qeydiyyatlı şagirdlər əlavə olunur." className="[&_textarea]:min-h-20" />
          <div><SubmitButton>Əlavə et</SubmitButton></div>
        </ActionForm>
      </Card>
      {c.members.length === 0 ? (
        <EmptyState icon={null} title="Sinifdə hələ şagird yoxdur">Yuxarıdan e-poçtla əlavə edin.</EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Ad</Th><Th>E-poçt</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {c.members.map((m) => (
              <Tr key={m.id}>
                <Td className="font-semibold">{m.name}</Td>
                <Td>{m.email}</Td>
                <Td className="text-right">
                  <ConfirmButton action={removeClassMember.bind(null, id, m.id)} title="Şagird sinifdən çıxarılsın?" confirmLabel="Çıxar">Çıxar</ConfirmButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
