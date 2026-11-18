import type { Metadata } from "next";
import { Video } from "lucide-react";
import { JoinButton } from "@/components/live/student-list";
import { PhaseBadge, providerLabel } from "@/components/live/live-ui";
import { PageHeader } from "@/components/panel/shell";
import { Card, EmptyState } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatMinutes } from "@/lib/format";
import { listStudentSessions, type StudentSession } from "@/lib/live/service";

export const metadata: Metadata = { title: "Canlı dərslər" };

function SessionCard({ s }: { s: StudentSession }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-base font-bold">{s.title}</h3>
            <PhaseBadge phase={s.phase} started={s.started} />
          </div>
          <p className="mt-1 text-sm text-muted">{s.teacherName} · {s.className}</p>
          <p className="mt-1 text-sm">{formatDateTime(s.startsAt)} · {formatMinutes(s.durationMin)} · {providerLabel(s.provider)}</p>
          {s.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{s.description}</p>}
          {s.phase === "upcoming" && <p className="mt-2 text-xs text-muted">“Qoşul” düyməsi dərsdən 10 dəqiqə əvvəl aktiv olacaq.</p>}
          {s.hasPasscode && s.phase === "joinable" && <p className="mt-2 text-xs text-muted">Bu görüş parolludur. Parol qoşulduqdan sonra göstəriləcək.</p>}
          {s.joined && <p className="mt-2 text-xs font-semibold text-success">Qoşulmusunuz ✓</p>}
        </div>
        <div className="shrink-0">
          {s.phase === "joinable" && <JoinButton sessionId={s.id} started={s.started} />}
          {s.phase === "ended" && s.recordingUrl && (
            <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold hover:bg-surface-2"><Video size={16} aria-hidden /> Yazıya bax</a>
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function Page() {
  const user = await requireRole(["student"], "/panel/canli-dersler");
  const all = await listStudentSessions(user.id);
  const current = all.filter((s) => s.phase === "joinable");
  const upcoming = all.filter((s) => s.phase === "upcoming");
  const dayAgo = new Date().getTime() - 86_400_000;
  const cancelledSoon = all.filter((s) => s.phase === "cancelled" && s.startsAt.getTime() > dayAgo);
  const past = all.filter((s) => s.phase === "ended").reverse();
  return (
    <>
      <PageHeader title="Canlı dərslər" intro="Sinfiniz üçün planlaşdırılmış onlayn dərslər. Görüş linki dərsdən 10 dəqiqə əvvəl açılır." />
      {all.length === 0 && <EmptyState icon={<Video aria-hidden />} title="Hələ canlı dərs yoxdur">Müəlliminiz dərs əlavə edəndə burada görəcəksiniz və bildiriş alacaqsınız.</EmptyState>}
      <div className="space-y-8">
        {current.length > 0 && <section aria-labelledby="h-now"><h2 id="h-now" className="mb-3 font-sans text-lg font-bold">İndi</h2><div className="space-y-3">{current.map((s) => <SessionCard key={s.id} s={s} />)}</div></section>}
        {upcoming.length > 0 && <section aria-labelledby="h-next"><h2 id="h-next" className="mb-3 font-sans text-lg font-bold">Gələcək dərslər</h2><div className="space-y-3">{upcoming.map((s) => <SessionCard key={s.id} s={s} />)}</div></section>}
        {cancelledSoon.length > 0 && <section aria-labelledby="h-cx"><h2 id="h-cx" className="mb-3 font-sans text-lg font-bold">Ləğv edilənlər</h2><div className="space-y-3">{cancelledSoon.map((s) => <SessionCard key={s.id} s={s} />)}</div></section>}
        {past.length > 0 && <section aria-labelledby="h-past"><h2 id="h-past" className="mb-3 font-sans text-lg font-bold">Keçmiş dərslər</h2><div className="space-y-3">{past.map((s) => <SessionCard key={s.id} s={s} />)}</div></section>}
      </div>
    </>
  );
}
