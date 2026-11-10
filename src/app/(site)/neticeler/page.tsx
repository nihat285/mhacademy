import type { Metadata } from "next";
import { Container, PageHeader, Block } from "@/components/catalog/page-header";
import { Badge, Card, EmptyState, ProgressBar, StatTile } from "@/components/ui/card";
import { formatClock, formatNumber, formatPercent } from "@/lib/format";
import { getLatestLeaderboard, getPublishedTestimonials, getResultsOverview } from "@/lib/queries/catalog";

export const metadata: Metadata = { title: "Nəticələr", description: "Platformanın ümumi nəticələri və son sınağın liderlər cədvəli." };

export default async function ResultsPage() {
  const [o, board, reviews] = await Promise.all([getResultsOverview(), getLatestLeaderboard(), getPublishedTestimonials()]);
  return (
    <>
      <PageHeader eyebrow="Nəticələr" title="Rəqəmlərlə nəticələr" intro="Yalnız tamamlanmış sınaq cəhdləri hesablanır. Liderlər cədvəlində yalnız razılıq vermiş şagirdlər görünür." />
      <Container>
        <div className="grid gap-5 sm:grid-cols-3">
          <StatTile label="Tamamlanmış cəhd" value={formatNumber(o.attempts)} />
          <StatTile label="Orta nəticə" value={formatPercent(o.avgPercent)} />
          <StatTile label="Keçid faizi" value={formatPercent(o.passRate)} />
        </div>

        <Block title="Fənlər üzrə orta nəticə">
          {o.perSubject.length ? (
            <Card className="space-y-5 p-6">
              {o.perSubject.map((s) => (
                <div key={s.name}>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{s.name}</span><span className="text-muted">{formatPercent(s.avg)} · {s.attempts} cəhd</span></div>
                  <ProgressBar value={s.avg} label={s.name} />
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState title="Hələ nəticə yoxdur">İlk sınaqlar tamamlandıqca statistika burada görünəcək.</EmptyState>
          )}
        </Block>

        {board && (
          <Block title={`Liderlər: ${board.exam.title}`} intro={board.exam.subjectName}>
            {board.entries.length ? (
              <Card className="overflow-hidden">
                <ol>
                  {board.entries.map((e, i) => (
                    <li key={i} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-0">
                      <span className="w-6 font-display text-lg font-semibold text-accent-ink">{i + 1}</span>
                      <span className="flex-1 font-semibold">{e.displayName}</span>
                      {e.timeSpentSec != null && <span className="text-sm text-muted">{formatClock(e.timeSpentSec)}</span>}
                      <span className="w-16 text-right font-semibold tabular-nums">{formatPercent(e.percentage)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : (
              <EmptyState title="Liderlər cədvəli boşdur">İştirakçılar cədvəldə görünməyə razılıq verdikdə burada çıxacaq.</EmptyState>
            )}
          </Block>
        )}

        {reviews.length > 0 && (
          <Block title="Şagird rəyləri">
            <div className="grid gap-5 md:grid-cols-3">
              {reviews.map((t) => (
                <Card key={t.id} className="p-6"><p className="text-sm">“{t.quote}”</p><p className="mt-4 text-sm font-semibold">{t.authorName}{t.authorRole ? `, ${t.authorRole}` : ""}</p>{t.isPlaceholder && <Badge tone="warning" className="mt-2">Nümunə rəy</Badge>}</Card>
              ))}
            </div>
          </Block>
        )}
      </Container>
    </>
  );
}
