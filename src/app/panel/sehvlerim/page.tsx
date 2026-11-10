import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PartyPopper, XCircle } from "lucide-react";
import { Photo } from "@/components/cards";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { Prose } from "@/components/prose";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { DIFFICULTY_LABEL, formatDate } from "@/lib/format";
import { getActiveMistakes, getMistakeDetails, type MistakeDetail, type MistakeRef } from "@/lib/queries/mistakes";

export const metadata: Metadata = { title: "Səhvlərim" };

const PAGE_SIZE = 8;
type SP = Promise<Record<string, string | string[] | undefined>>;

const chip = (active: boolean) =>
  cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition", active ? "border-accent bg-accent text-on-accent" : "border-border-strong hover:bg-surface-2");

function MistakeCard({ m, d }: { m: MistakeRef; d: MistakeDetail }) {
  const numeric = d.type === "numeric";
  const showWhy = m.showExplanations;
  const chosen = d.options.find((o) => o.id === m.selectedOptionId);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="gold">{m.subjectName}</Badge>
        {d.topicName && <Badge>{d.topicName}</Badge>}
        <Badge tone="neutral">{DIFFICULTY_LABEL[d.difficulty]}</Badge>
        <span className="ml-auto text-xs text-muted">
          {m.source === "exam" ? `Sınaq${m.examTitle ? `: ${m.examTitle}` : ""}` : "Təkrar"} · {formatDate(m.at)}
        </span>
      </div>

      <Prose text={d.text} className="mt-4 text-base font-medium" />
      {d.imageUrl && <Photo src={d.imageUrl} alt="Sualın şəkli" className="mt-3 max-h-64 w-auto rounded-xl border border-border" />}

      {numeric ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-danger/40 bg-danger-bg px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-danger"><XCircle size={14} /> Sənin cavabın</dt>
            <dd className="mt-1 font-semibold tabular-nums">{m.numericValue ?? "—"}</dd>
          </div>
          <div className="rounded-xl border border-success/40 bg-success-bg px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Düzgün cavab</dt>
            <dd className="mt-1 font-semibold tabular-nums">{d.numericAnswer ?? "—"}</dd>
          </div>
        </dl>
      ) : (
        <ul className="mt-4 grid gap-2">
          {d.options.map((o) => {
            const mine = o.id === m.selectedOptionId;
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm",
                  o.isCorrect ? "border-success/50 bg-success-bg" : mine ? "border-danger/50 bg-danger-bg" : "border-border",
                )}
              >
                {o.isCorrect ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden /> : mine ? <XCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <span className="w-4 shrink-0" />}
                <span className="flex-1">{o.text}</span>
                {o.isCorrect && <span className="text-xs font-semibold text-success">Düzgün cavab</span>}
                {mine && !o.isCorrect && <span className="text-xs font-semibold text-danger">Sənin cavabın</span>}
              </li>
            );
          })}
        </ul>
      )}

      {showWhy && chosen?.whyWrong && (
        <p className="mt-3 text-sm text-muted"><strong className="text-text">Niyə səhvdir:</strong> {chosen.whyWrong}</p>
      )}
      {showWhy && d.concept && <p className="mt-2 text-sm text-muted"><strong className="text-text">Anlayış:</strong> {d.concept}</p>}

      {showWhy && (d.explanation || (d.steps && d.steps.length > 0)) && (
        <details className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold">Həllə bax</summary>
          {d.explanation && <Prose text={d.explanation} className="mt-2" />}
          {d.steps && d.steps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
              {d.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </details>
      )}

      {d.lessonSlug && d.lessonTitle && (
        <p className="mt-3 text-sm">
          Əlaqəli dərs: <Link href={`/dersler/${d.lessonSlug}`} className="font-semibold text-accent-ink hover:underline">{d.lessonTitle}</Link>
        </p>
      )}
    </Card>
  );
}

export default async function MistakesPage({ searchParams }: { searchParams: SP }) {
  const user = await requireRole(["student"], "/panel/sehvlerim");
  const sp = await searchParams;
  const subject = one(sp.fen, 80);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page, 6) ?? "1", 10) || 1));

  const all = await getActiveMistakes(user.id);
  const subjects = [...new Map(all.map((m) => [m.subjectSlug, m.subjectName])).entries()].map(([slug, name]) => ({
    slug,
    name,
    n: all.filter((m) => m.subjectSlug === slug).length,
  }));
  const filtered = subject ? all.filter((m) => m.subjectSlug === subject) : all;
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const details = await getMistakeDetails(slice.map((m) => m.questionId));
  const tekrar = `/panel/tekrar${subject ? `?fen=${encodeURIComponent(subject)}` : ""}`;

  return (
    <>
      <PageHeader
        title="Səhvlərim"
        intro="Ən son səhv cavablandırdığın suallar. Təkrarda düzgün cavab verəndə sual siyahıdan çıxır."
        actions={filtered.length > 0 ? <LinkButton href={tekrar}>Təkrar et</LinkButton> : undefined}
      />

      {all.length === 0 ? (
        <EmptyState icon={<PartyPopper size={30} />} title="Hələ səhvin yoxdur" action={<LinkButton href="/sinaqlar">Sınaqlara bax</LinkButton>}>
          Sınaq nəticələrin açıqlanandan sonra səhv cavablandırdığın suallar izahları ilə burada görünəcək.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Aktiv səhvlər" value={all.length} />
            <StatTile label="Fənn sayı" value={subjects.length} />
            <StatTile label="Sınaqdan gələn" value={all.filter((m) => m.source === "exam").length} hint="Qalanı təkrar zamanı səhv edilənlərdir" />
          </div>

          <nav aria-label="Fənn filtri" className="mt-6 flex flex-wrap gap-2">
            <Link href="/panel/sehvlerim" className={chip(!subject)}>Hamısı · {all.length}</Link>
            {subjects.map((s) => (
              <Link key={s.slug} href={`/panel/sehvlerim?fen=${encodeURIComponent(s.slug)}`} className={chip(subject === s.slug)}>{s.name} · {s.n}</Link>
            ))}
          </nav>

          {slice.length === 0 ? (
            <div className="mt-6"><EmptyState title="Bu fənn üzrə səhv tapılmadı" /></div>
          ) : (
            <div className="mt-6 grid gap-4">
              {slice.map((m) => {
                const d = details.get(m.questionId);
                return d ? <MistakeCard key={m.questionId} m={m} d={d} /> : null;
              })}
            </div>
          )}
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} basePath="/panel/sehvlerim" params={{ fen: subject }} />
        </>
      )}
    </>
  );
}
