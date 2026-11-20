import Link from "next/link";
import { AccuracyDonut, ScoreTrendChart, SubjectBarChart } from "@/components/charts";
import { Card, CardHeader } from "@/components/ui/card";
import type { StudentStats } from "@/lib/stats/student-stats";

/** The signed-in student's OWN numbers, computed from their saved and released results. */
export function DashboardLive({ stats }: { stats: StudentStats }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Nəticələrin dinamikası" subtitle={`Son ${stats.trend.length} sınaq, faizlə`} />
        <div className="p-4">
          <ScoreTrendChart data={stats.trend} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Cavabların dəqiqliyi" subtitle={`${stats.attempts} sınaq üzrə cəmi`} />
        <div className="flex justify-center p-5">
          <AccuracyDonut correct={stats.accuracy.correct} incorrect={stats.accuracy.incorrect} unanswered={stats.accuracy.unanswered} />
        </div>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Fənlər üzrə orta nəticə" />
        <div className="p-4">{stats.subjects.length > 0 ? <SubjectBarChart data={stats.subjects} /> : <p className="p-4 text-sm text-muted">Hələ fənn üzrə nəticə yoxdur.</p>}</div>
      </Card>
      <Card>
        <CardHeader title="Təkrar etməli mövzular" subtitle="Səhvlərinizə əsasən" />
        {stats.weakTopics.length === 0 ? (
          <p className="p-5 text-sm text-muted">Hələlik zəif mövzu aşkarlanmadı. Daha çox sınaq həll etdikcə burada görünəcək.</p>
        ) : (
          <ul className="space-y-3 p-5 text-sm">
            {stats.weakTopics.map((t) => (
              <li key={t.topicId} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">{t.subject} · {t.accuracy}% düz</span>
                </span>
                {t.lessonSlug ? (
                  <Link href={`/dersler/${t.lessonSlug}`} className="shrink-0 text-xs font-semibold text-accent-ink hover:underline">Dərsə bax →</Link>
                ) : (
                  <Link href="/panel/tekrar" className="shrink-0 text-xs font-semibold text-accent-ink hover:underline">Təkrar et →</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
