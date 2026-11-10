import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ExamCard } from "@/components/exam/exam-card";
import { PageHeader } from "@/components/panel/shell";
import { EmptyState } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";
import { listExamsForStudent } from "@/lib/exam/list";

export const metadata: Metadata = { title: "Sınaqlar" };

export default async function ExamsPage() {
  const user = await requireRole(["student"], "/panel/sinaqlar");
  await finalizeExpiredAttempts({ userId: user.id }); // anything left open past its deadline is graded now
  const all = await listExamsForStudent(user.id);
  const live = all.filter((e) => e.phase === "live").sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
  const upcoming = all.filter((e) => e.phase === "upcoming").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const ended = all.filter((e) => e.phase === "ended").sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());

  const group = (title: string, id: string, list: typeof all, empty: string) => (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 font-sans text-lg font-bold">{title} <span className="font-normal text-muted">({list.length})</span></h2>
      {list.length === 0 ? <p className="rounded-2xl border border-dashed border-border-strong px-5 py-6 text-sm text-muted">{empty}</p> : <div className="grid gap-4 lg:grid-cols-2">{list.map((e) => <ExamCard key={e.id} exam={e} />)}</div>}
    </section>
  );

  return (
    <div className="space-y-9">
      <PageHeader title="Sınaqlar" intro="Sizə açıq olan onlayn sınaqlar. Vaxt serverdə hesablanır; bağlantı kəsilərsə, cavablarınız itmir." />
      {all.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="Hələ açıq sınaq yoxdur">Yeni sınaqlar əlavə olunduqda burada görünəcək və bildiriş alacaqsınız.</EmptyState>
      ) : (
        <>
          {group("Davam edən", "live", live, "Hazırda davam edən sınaq yoxdur.")}
          {group("Tezliklə", "upcoming", upcoming, "Planlaşdırılmış sınaq yoxdur.")}
          {group("Bitmiş", "ended", ended, "Bitmiş sınaq yoxdur.")}
        </>
      )}
    </div>
  );
}
