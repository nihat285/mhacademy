import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteMaterialAction } from "@/app/actions/library-materials";
import { NoPermission } from "@/components/content/no-permission";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton, buttonClasses } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, THead, Td, Th, Tr } from "@/components/ui/table";
import type { Area } from "@/lib/content/access";
import { formatDateTime } from "@/lib/format";
import { ACCESS_LABEL, formatSize, isUuid } from "@/lib/materials/rules";
import { MaterialError, canManageLibrary, getEditable, listManageMaterials, listSubjectOptions } from "@/lib/materials/service";
import { getCurrentUser } from "@/lib/session";
import { MaterialForm } from "./material-form";

const NO_PERM = <NoPermission title="Materiallar üçün icazə yoxdur" what="Materialları idarə etmək" />;

async function staffUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) notFound();
  return user;
}

export async function MaterialIndex({ area }: { area: Area }) {
  const user = await staffUser();
  if (!canManageLibrary(user)) return NO_PERM;
  const rows = await listManageMaterials(user);
  const base = `/${area}/materiallar`;
  return (
    <>
      <PageHeader
        title="Materiallar"
        intro="Saytdakı “Materiallar” bölməsinə PDF konspekt, düstur cədvəli və test toplusu əlavə edin."
        actions={<><Link href="/materiallar" className={buttonClasses("outline", "md")}>Saytda bax</Link><LinkButton href={`${base}/yeni`}>Yeni material</LinkButton></>}
      />
      {rows.length === 0 ? (
        <EmptyState title="Hələ material yoxdur">“Yeni material” ilə ilk PDF-i əlavə edin.</EmptyState>
      ) : (
        <TableWrap>
          <THead><tr><Th>Başlıq</Th><Th>Fənn</Th><Th>Sinif</Th><Th>Giriş</Th><Th>Yükləmə</Th><Th>Tarix</Th></tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Link href={`${base}/${r.id}`} className="font-semibold hover:underline">{r.title}</Link>
                  <span className="ml-2 text-xs text-muted">{formatSize(r.sizeBytes)}</span>
                  {!r.published && <Badge tone="warning" className="ml-2">Gizli</Badge>}
                </Td>
                <Td>{r.subjectName}</Td>
                <Td>{r.grade ? `${r.grade}-ci` : "Hamısı"}</Td>
                <Td>{ACCESS_LABEL[r.access as keyof typeof ACCESS_LABEL] ?? r.access}</Td>
                <Td>{r.downloads}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}

export async function MaterialNew({ area }: { area: Area }) {
  const user = await staffUser();
  if (!canManageLibrary(user)) return NO_PERM;
  const subjects = await listSubjectOptions();
  return (
    <>
      <Link href={`/${area}/materiallar`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Materiallar</Link>
      <PageHeader title="Yeni material" intro="PDF yüklənir və dərhal saytdakı “Materiallar” bölməsində görünür (gizlətməsəniz)." />
      <Card><div className="p-5"><MaterialForm area={area} subjects={subjects} /></div></Card>
    </>
  );
}

export async function MaterialEdit({ area, id }: { area: Area; id: string }) {
  const user = await staffUser();
  if (!canManageLibrary(user)) return NO_PERM;
  if (!isUuid(id)) notFound();
  let m;
  try {
    m = await getEditable(user, id);
  } catch (e) {
    if (e instanceof MaterialError) notFound();
    throw e;
  }
  const subjects = await listSubjectOptions();
  return (
    <>
      <Link href={`/${area}/materiallar`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Materiallar</Link>
      <PageHeader title={m.title} intro={`${m.downloads} dəfə yüklənib`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="Material məlumatları" />
          <div className="p-5">
            <MaterialForm area={area} subjects={subjects} values={{ id: m.id, title: m.title, subjectId: m.subjectId, description: m.description ?? "", grade: m.grade, access: m.access, published: m.published, sizeBytes: m.sizeBytes }} />
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <h2 className="font-sans text-sm font-bold">Materialı sil</h2>
            <p className="mt-1 text-xs text-muted">Fayl da saxlayıcıdan silinir. Bunu geri qaytarmaq olmur.</p>
            <div className="mt-3">
              <ConfirmButton action={deleteMaterialAction.bind(null, area, m.id)} title="Material silinsin?" description="Bu əməliyyatı geri qaytarmaq olmur." confirmLabel="Sil" variant="danger">Materialı sil</ConfirmButton>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
