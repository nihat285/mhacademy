import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Headphones, FileText } from "lucide-react";
import { deletePassageAction, unlinkQuestionAction } from "@/app/actions/passages";
import { NoPermission } from "@/components/content/no-permission";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, THead, Td, Th, Tr } from "@/components/ui/table";
import type { Area } from "@/lib/content/access";
import { formatDateTime } from "@/lib/format";
import { PassageError, getPassageDetail, listPassages, passageSubjects } from "@/lib/passages/service";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { LinkQuestionsForm, PassageForm } from "./passage-form";

/** Large audio goes straight to Vercel Blob when it is configured; otherwise through our own upload route. */
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const NO_PERM = <NoPermission title="Parçalar üçün icazə yoxdur" what="Mətn və audio parçaları idarə etmək" />;

async function staffUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) notFound();
  return user;
}
const denied = (u: { role: string } & Parameters<typeof can>[0]) => u.role === "teacher" && !can(u, "questions.manage");

export async function PassageIndex({ area }: { area: Area }) {
  const user = await staffUser();
  if (denied(user)) return NO_PERM;
  const rows = await listPassages(user);
  const base = `/${area}/metnler`;
  return (
    <>
      <Link href={`/${area}/suallar`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Sual bankı</Link>
      <PageHeader
        title="Mətn və audio parçaları"
        intro="Dinləmə və oxu sualları üçün ortaq parça yaradın, sonra bir neçə sualı ona bağlayın. Eyni parçanın sualları sınaqda həmişə ardıcıl gəlir."
        actions={<LinkButton href={`${base}/yeni`}>Yeni parça</LinkButton>}
      />
      {rows.length === 0 ? (
        <EmptyState title="Hələ parça yoxdur">“Yeni parça” ilə mətn və ya audio əlavə edin.</EmptyState>
      ) : (
        <TableWrap>
          <THead><tr><Th>Parça</Th><Th>Fənn</Th><Th>Növ</Th><Th>Suallar</Th><Th>Tarix</Th></tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td><Link href={`${base}/${r.id}`} className="font-semibold hover:underline">{r.title}</Link></Td>
                <Td>{r.subjectName ?? "—"}</Td>
                <Td className="whitespace-nowrap">
                  {r.hasAudio && <Badge><Headphones size={12} className="mr-1 inline" />Dinləmə</Badge>}{" "}
                  {r.hasBody && <Badge><FileText size={12} className="mr-1 inline" />Mətn</Badge>}
                </Td>
                <Td>{r.questionCount}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}

export async function PassageNew({ area }: { area: Area }) {
  const user = await staffUser();
  if (denied(user)) return NO_PERM;
  const subjects = await passageSubjects();
  return (
    <>
      <Link href={`/${area}/metnler`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Parçalar</Link>
      <PageHeader title="Yeni parça" intro="Yaradandan sonra suallar bu parçaya bağlanır." />
      <Card><div className="p-5"><PassageForm area={area} subjects={subjects} useBlob={blobEnabled()} /></div></Card>
    </>
  );
}

export async function PassageDetail({ area, id }: { area: Area; id: string }) {
  const user = await staffUser();
  if (denied(user)) return NO_PERM;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let d;
  try {
    d = await getPassageDetail(user, id);
  } catch (e) {
    if (e instanceof PassageError) notFound();
    throw e;
  }
  const subjects = await passageSubjects();
  const { passage: p, linked, candidates } = d;
  return (
    <>
      <Link href={`/${area}/metnler`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Parçalar</Link>
      <PageHeader title={p.title} intro={`${linked.length} sual bağlıdır`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader title="Parçanın məzmunu" />
          <div className="p-5">
            <PassageForm area={area} subjects={subjects} values={{ id: p.id, title: p.title, subjectId: p.subjectId ?? "", body: p.body ?? "", transcript: p.transcript ?? "", maxPlays: p.maxPlays, audioUrl: p.audioUrl }} useBlob={blobEnabled()} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Bağlı suallar" subtitle="Bu suallar sınaqda parça ilə birlikdə göstərilir." />
            {linked.length === 0 ? <p className="p-5 text-sm text-muted">Hələ sual bağlanmayıb.</p> : (
              <ul className="divide-y divide-border">
                {linked.map((q) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="line-clamp-2">{q.text}</span>
                    <ConfirmButton action={unlinkQuestionAction.bind(null, area, p.id, q.id)} title="Sual parçadan ayrılsın?" description="Sual silinmir, yalnız bu parça ilə əlaqəsi ləğv olunur." confirmLabel="Ayır" variant="danger">Ayır</ConfirmButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Sual əlavə et" subtitle={p.subjectId ? "Yalnız bu fənnin suallarınız göstərilir." : "Suallarınız göstərilir."} />
            <LinkQuestionsForm area={area} passageId={p.id} candidates={candidates} />
          </Card>
          <Card>
            <div className="p-5">
              <h2 className="font-sans text-sm font-bold">Parçanı sil</h2>
              <p className="mt-1 text-xs text-muted">Suallar silinmir, yalnız parça ilə əlaqələri ayrılır. Keçmiş sınaq nəticələrində parça artıq göstərilməyəcək.</p>
              <div className="mt-3">
                <ConfirmButton action={deletePassageAction.bind(null, area, p.id)} title="Parça silinsin?" description="Bu əməliyyatı geri qaytarmaq olmur." confirmLabel="Sil" variant="danger">Parçanı sil</ConfirmButton>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
