import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cancelLiveSessionAction, setRecordingAction } from "@/app/actions/live";
import { CField, CForm } from "@/components/content/form-kit";
import { NoPermission } from "@/components/content/no-permission";
import { PageHeader } from "@/components/panel/shell";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TableWrap, THead, Td, Th, Tr } from "@/components/ui/table";
import type { Area } from "@/lib/content/access";
import { formatDateTime, formatMinutes } from "@/lib/format";
import { LiveError, getSessionDetail, listStaffSessions, schedulableClasses, type StaffSession } from "@/lib/live/service";
import { sessionPhase, toBakuInput } from "@/lib/live/rules";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { LiveForm } from "./live-form";
import { PhaseBadge, providerLabel } from "./live-ui";

const NO_PERM = <NoPermission title="Canlı dərslər üçün icazə yoxdur" what="Canlı dərs yaratmaq" />;

async function staffUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) notFound();
  return user;
}

function SessionTable({ rows, base, showTeacher }: { rows: StaffSession[]; base: string; showTeacher: boolean }) {
  return (
    <TableWrap>
      <THead><tr><Th>Dərs</Th><Th>Sinif</Th>{showTeacher && <Th>Müəllim</Th>}<Th>Vaxt</Th><Th>Vəziyyət</Th><Th>İştirak</Th></tr></THead>
      <tbody>
        {rows.map((s) => (
          <Tr key={s.id}>
            <Td><Link href={`${base}/${s.id}`} className="font-semibold hover:underline">{s.title}</Link><span className="block text-xs text-muted">{providerLabel(s.provider)}</span></Td>
            <Td>{s.className}</Td>
            {showTeacher && <Td>{s.teacherName}</Td>}
            <Td className="whitespace-nowrap">{formatDateTime(s.startsAt)}<span className="block text-xs text-muted">{formatMinutes(s.durationMin)}</span></Td>
            <Td><PhaseBadge phase={s.phase} started={s.started} /></Td>
            <Td className="whitespace-nowrap">{s.phase === "upcoming" || s.phase === "cancelled" ? "—" : `${s.attended} / ${s.members}`}</Td>
          </Tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export async function LiveIndex({ area }: { area: Area }) {
  const user = await staffUser();
  if (user.role === "teacher" && !can(user, "lessons.manage")) return NO_PERM;
  const [upcoming, past] = await Promise.all([listStaffSessions(user, "upcoming"), listStaffSessions(user, "past", new Date(), 30)]);
  const base = `/${area}/canli-dersler`;
  const pastOnly = past.filter((p) => !upcoming.some((u) => u.id === p.id));
  return (
    <>
      <PageHeader title="Canlı dərslər" intro="Onlayn dərsləri planlaşdırın. Şagirdlər görüş linkini yalnız dərsdən 10 dəqiqə əvvəl, yalnız öz sinfi üçün görür." actions={<LinkButton href={`${base}/yeni`}>Yeni canlı dərs</LinkButton>} />
      <h2 className="mb-3 font-sans text-lg font-bold">Gələcək və davam edən</h2>
      {upcoming.length === 0 ? <EmptyState title="Planlaşdırılmış dərs yoxdur">“Yeni canlı dərs” düyməsi ilə ilk dərsi əlavə edin.</EmptyState> : <SessionTable rows={upcoming} base={base} showTeacher={area === "idare"} />}
      {pastOnly.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-sans text-lg font-bold">Keçmiş dərslər</h2>
          <SessionTable rows={pastOnly} base={base} showTeacher={area === "idare"} />
        </>
      )}
    </>
  );
}

export async function LiveNew({ area }: { area: Area }) {
  const user = await staffUser();
  if (user.role === "teacher" && !can(user, "lessons.manage")) return NO_PERM;
  const classes = await schedulableClasses(user);
  const base = `/${area}/canli-dersler`;
  return (
    <>
      <Link href={base} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Canlı dərslər</Link>
      <PageHeader title="Yeni canlı dərs" />
      {classes.length === 0 ? (
        <EmptyState title="Sinif yoxdur">Canlı dərs sinfə təyin olunur. Əvvəlcə sinif yaradın və ona şagird əlavə edin.</EmptyState>
      ) : (
        <Card><div className="p-5"><LiveForm area={area as "muellim" | "idare"} classes={classes} /></div></Card>
      )}
    </>
  );
}

export async function LiveDetail({ area, id }: { area: Area; id: string }) {
  const user = await staffUser();
  if (user.role === "teacher" && !can(user, "lessons.manage")) return NO_PERM;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let s;
  try {
    s = await getSessionDetail(user, id);
  } catch (e) {
    if (e instanceof LiveError) notFound();
    throw e;
  }
  const base = `/${area}/canli-dersler`;
  const now = new Date();
  const started = s.startsAt.getTime() <= now.getTime();
  const phase = sessionPhase(now, { startsAt: s.startsAt, durationMin: s.durationMin, cancelled: s.status === "cancelled" });
  const cancelled = s.status === "cancelled";
  const joined = s.attendance.filter((a) => a.joinedAt).length;
  return (
    <>
      <Link href={base} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Canlı dərslər</Link>
      <PageHeader
        title={s.title}
        intro={<span className="inline-flex flex-wrap items-center gap-2">{s.className} · {formatDateTime(s.startsAt)} · {formatMinutes(s.durationMin)} · {providerLabel(s.provider)} <PhaseBadge phase={phase} started={started} /></span>}
        actions={!cancelled && (
          <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-[0.95rem] font-semibold text-on-accent hover:brightness-105">Görüşü aç (müəllim)</a>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {cancelled ? (
            <Card><div className="p-5 text-sm text-muted">Bu dərs ləğv edilib və dəyişdirilə bilməz.</div></Card>
          ) : (
            <Card>
              <CardHeader title="Dərsin məlumatları" />
              <div className="p-5">
                <LiveForm
                  area={area as "muellim" | "idare"} classes={[]}
                  values={{ id: s.id, classId: s.classId, title: s.title, description: s.description ?? "", startsAt: toBakuInput(s.startsAt), durationMin: s.durationMin, joinUrl: s.joinUrl, passcode: s.passcode ?? "" }}
                />
              </div>
            </Card>
          )}
          {!cancelled && (
            <Card>
              <CardHeader title="Dərsin yazısı" subtitle="Dərs bitəndən sonra yazının linkini əlavə edin, şagirdlər “Keçmiş dərslər” siyahısında görəcək." />
              <div className="p-5">
                <CForm action={setRecordingAction} className="space-y-4">
                  <input type="hidden" name="area" value={area} />
                  <input type="hidden" name="id" value={s.id} />
                  <CField name="recordingUrl" label="Yazı linki" type="url" defaultValue={s.recordingUrl ?? ""} placeholder="https://…" hint="Boş buraxıb saxlasanız, link silinir." />
                  <SubmitButton pendingText="Saxlanılır…" variant="outline">Linki saxla</SubmitButton>
                </CForm>
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="İştirak" subtitle={`${joined} / ${s.attendance.length} şagird “Qoşul” düyməsinə basıb`} />
            {s.attendance.length === 0 ? <p className="p-5 text-sm text-muted">Sinifdə şagird yoxdur.</p> : (
              <ul className="divide-y divide-border">
                {s.attendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span>{a.name}</span>
                    {a.joinedAt ? <Badge tone="success">{formatDateTime(a.joinedAt)}</Badge> : <Badge>—</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {!cancelled && (
            <Card>
              <div className="p-5">
                <h2 className="font-sans text-sm font-bold">Dərsi ləğv et</h2>
                <p className="mt-1 text-xs text-muted">Şagirdlərə bildiriş göndərilir. Bu əməliyyatı geri qaytarmaq olmur.</p>
                <div className="mt-3">
                  <ConfirmButton action={cancelLiveSessionAction.bind(null, area, s.id)} title="Dərs ləğv edilsin?" description="Şagirdlərə dərsin ləğv olunduğu barədə bildiriş gedəcək." confirmLabel="Ləğv et" variant="danger">Dərsi ləğv et</ConfirmButton>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
