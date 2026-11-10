import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, CircleSlash, Clock, Lightbulb, PlayCircle, XCircle } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examAttempts } from "@/db/schema";
import { PrintButton } from "@/components/exam/print-button";
import { PageHeader } from "@/components/panel/shell";
import { Prose } from "@/components/prose";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card, CardHeader, ProgressBar, StatTile } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";
import { RELEASE_HINT } from "@/lib/exam/release";
import { getAttemptResult, type ReviewItem } from "@/lib/exam/results";
import { DIFFICULTY_LABEL, formatDateTime, formatDuration, formatPercent, formatScore } from "@/lib/format";

export const metadata: Metadata = { title: "Sınaq nəticəsi", robots: { index: false } };

const STATUS = {
  correct: { label: "Düzgün", tone: "success", Icon: CheckCircle2 },
  partial: { label: "Qismən düzgün", tone: "warning", Icon: CheckCircle2 },
  incorrect: { label: "Səhv", tone: "danger", Icon: XCircle },
  unanswered: { label: "Cavabsız", tone: "neutral", Icon: CircleSlash },
} as const;

export default async function ResultPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ goster?: string }> }) {
  const { attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();
  const user = await requireRole(["student"], `/panel/neticelerim/${attemptId}`);
  await finalizeExpiredAttempts({ userId: user.id });
  const result = await getAttemptResult(user.id, attemptId);
  if (!result) {
    const [open] = await db.select({ id: examAttempts.id }).from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, user.id), eq(examAttempts.status, "in_progress"))).limit(1);
    if (open) redirect(`/imtahan/${attemptId}`);
    notFound();
  }

  if (result.state === "pending") {
    return (
      <div>
        <PageHeader title={result.exam.title} />
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto text-success" size={44} aria-hidden />
          <h2 className="mt-3 font-display text-2xl font-semibold">Cavablarınız qəbul olundu</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {result.auto ? "Vaxt bitdiyi üçün sınaq avtomatik təqdim olundu. " : ""}
            {RELEASE_HINT[result.exam.resultRelease as keyof typeof RELEASE_HINT](formatDateTime(result.exam.endsAt))}
          </p>
          <Link href="/panel/sinaqlar" className={buttonClasses("primary", "md", "mt-6")}>Sınaqlara qayıt</Link>
        </Card>
      </div>
    );
  }

  const { attempt: a, exam, review, byTopic, byDifficulty, history, lessons: recs, reviewAllowed } = result;
  const { goster } = await searchParams;
  const onlyMistakes = goster !== "hamisi";
  const shown = onlyMistakes ? review.filter((r) => r.status !== "correct") : review;
  const pct = Number(a.percentage);
  const prev = history.filter((h) => !h.current && h.no < a.attemptNo).at(-1);
  const weak = byTopic.filter((t) => t.percent < 60);

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.title}
        intro={`${exam.subjectName} · cəhd ${a.attemptNo} · ${a.submittedAt ? formatDateTime(a.submittedAt) : ""}${a.status === "auto_submitted" ? " · vaxt bitdiyi üçün avtomatik təqdim olunub" : ""}`}
        actions={<><PrintButton /><Link href="/panel/sinaqlar" className={buttonClasses("outline", "sm", "no-print")}>Sınaqlar</Link></>}
      />

      <Card className="print-card overflow-hidden">
        <div className="grid gap-6 bg-navy-900 p-6 text-white sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 px-8 py-5">
            <p className="font-display text-5xl font-semibold tabular-nums text-gold-300">{formatPercent(pct)}</p>
            <p className="mt-1 text-sm text-white/70">{formatScore(Number(a.score))} / {formatScore(Number(a.maxScore))} bal</p>
          </div>
          <div className="flex flex-col justify-center">
            <Badge tone={a.passed ? "success" : "danger"} className="self-start">{a.passed ? "Keçid balı toplanıb" : "Keçid balı toplanmayıb"}</Badge>
            <p className="mt-3 text-white/80">Keçid həddi: {formatPercent(Number(exam.passingPercent))}{Number(exam.negativeMarking) > 0 ? ` · səhv cavab üçün −${Number(exam.negativeMarking) * 100}% bal` : ""}</p>
            {prev && (
              <p className="mt-1 text-sm text-white/70">
                Əvvəlki cəhdlə müqayisədə: <strong className={pct >= prev.percentage ? "text-gold-300" : "text-red-300"}>{pct >= prev.percentage ? "+" : "−"}{formatPercent(Math.abs(pct - prev.percentage)).replace("%", " faiz bəndi")}</strong>
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Düzgün" value={<span className="text-success">{a.correctCount}</span>} icon={<CheckCircle2 size={18} />} />
        <StatTile label="Səhv" value={<span className="text-danger">{a.incorrectCount}</span>} icon={<XCircle size={18} />} />
        <StatTile label="Cavabsız" value={a.unansweredCount} icon={<CircleSlash size={18} />} />
        <StatTile label="Sərf olunan vaxt" value={<span className="text-2xl">{a.timeSpentSec != null ? formatDuration(a.timeSpentSec) : "—"}</span>} hint={`Ayrılan: ${exam.durationMin} dəq`} icon={<Clock size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="print-card">
          <CardHeader title="Mövzular üzrə nəticə" subtitle="Ən zəifdən ən güclüyə" />
          <ul className="space-y-4 p-5">
            {byTopic.map((t) => (
              <li key={t.name}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-semibold">{t.name}</span><span className="tabular-nums text-muted">{t.correct}/{t.total} · {formatPercent(t.percent)}</span></div>
                <ProgressBar value={t.percent} tone={t.percent >= 70 ? "success" : t.percent >= 40 ? "gold" : "danger"} label={t.name} />
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-4 text-sm">
            <p className="mb-2 font-semibold">Çətinlik səviyyəsi üzrə</p>
            <div className="flex flex-wrap gap-2">
              {byDifficulty.map((d) => <Badge key={d.name} tone={d.percent >= 70 ? "success" : d.percent >= 40 ? "warning" : "danger"}>{DIFFICULTY_LABEL[d.name as keyof typeof DIFFICULTY_LABEL] ?? d.name}: {d.correct}/{d.total}</Badge>)}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {history.length > 1 && (
            <Card className="print-card">
              <CardHeader title="Cəhdlərin müqayisəsi" />
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>{h.current ? <strong>Cəhd {h.no} (bu)</strong> : <Link href={`/panel/neticelerim/${h.id}`} className="hover:underline">Cəhd {h.no}</Link>}<span className="ml-2 text-xs text-muted">{h.submittedAt ? formatDateTime(h.submittedAt) : ""}</span></span>
                    <span className="font-bold tabular-nums">{formatPercent(h.percentage)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="print-card">
            <CardHeader title="Növbəti addım" />
            <div className="space-y-3 p-5 text-sm">
              {weak.length > 0 ? <p>Diqqət tələb edən mövzular: <strong>{weak.map((w) => w.name).join(", ")}</strong>. Əvvəlcə bu mövzuların dərslərinə baxın, sonra səhvlərinizi təkrar həll edin.</p> : <p>Bütün mövzularda yaxşı nəticə göstərmisiniz. Çətinlik səviyyəsini artıraraq yeni sınaqla davam edin.</p>}
              {recs.length > 0 && (
                <ul className="space-y-2">
                  {recs.map((l) => (
                    <li key={l.slug}><Link href={`/dersler/${l.slug}`} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 hover:bg-surface-2"><PlayCircle size={18} className="shrink-0 text-accent-ink" /><span><span className="block font-semibold">{l.title}</span><span className="text-xs text-muted">{l.reason}</span></span></Link></li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>

      <section aria-labelledby="review">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review" className="font-sans text-lg font-bold">Səhvlərin təhlili</h2>
          <div className="no-print flex gap-2 text-sm">
            <Link href={`/panel/neticelerim/${attemptId}`} aria-current={onlyMistakes} className={buttonClasses(onlyMistakes ? "secondary" : "outline", "sm")}>Yalnız səhvlər ({review.filter((r) => r.status !== "correct").length})</Link>
            <Link href={`/panel/neticelerim/${attemptId}?goster=hamisi`} aria-current={!onlyMistakes} className={buttonClasses(!onlyMistakes ? "secondary" : "outline", "sm")}>Bütün suallar ({review.length})</Link>
          </div>
        </div>
        {!reviewAllowed && <p className="mb-3 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">Bu sınaq üçün düzgün cavablar və izahlar göstərilmir. Yalnız hər sualın nəticəsi görünür.</p>}
        {shown.length === 0 ? (
          <Card className="p-8 text-center"><CheckCircle2 className="mx-auto text-success" size={36} /><p className="mt-2 font-display text-xl font-semibold">Səhvsiz! Bütün suallara düzgün cavab verdiniz.</p></Card>
        ) : (
          <ol className="space-y-4">{shown.map((r) => <ReviewCard key={r.questionId} r={r} reviewAllowed={reviewAllowed} />)}</ol>
        )}
      </section>
    </div>
  );
}

function ReviewCard({ r, reviewAllowed }: { r: ReviewItem; reviewAllowed: boolean }) {
  const s = STATUS[r.status];
  return (
    <li>
      <Card className="print-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={s.tone}><s.Icon size={13} /> {s.label}</Badge>
          <span className="text-sm font-bold">Sual {r.n}</span>
          {r.topic && <Badge>{r.topic}</Badge>}
          <Badge tone="info">{DIFFICULTY_LABEL[r.difficulty]}</Badge>
          <span className="ml-auto text-xs tabular-nums text-muted">{formatScore(r.pointsAwarded)} / {formatScore(r.points)} bal</span>
        </div>
        <p className="mt-3 whitespace-pre-line text-[1.02rem] leading-relaxed">{r.text}</p>
        {r.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt="Sual üçün şəkil" className="mt-3 max-h-64 rounded-xl border border-border object-contain" />
        )}

        {r.type !== "numeric" && r.options ? (
          <ul className="mt-4 space-y-2 text-sm">
            {r.options.map((o) => (
              <li key={o.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${o.correct ? "border-success/50 bg-success-bg" : o.chosen ? "border-danger/50 bg-danger-bg" : "border-border"}`}>
                <span className="flex-1">{o.text}</span>
                {o.chosen && <Badge tone={o.correct ? "success" : "danger"}>Sizin cavab</Badge>}
                {o.correct && !o.chosen && <Badge tone="success">Düzgün cavab</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex gap-2"><dt className="text-muted">Sizin cavab:</dt><dd className="font-semibold">{r.chosenText ?? "Cavab verilməyib"}</dd></div>
            {reviewAllowed && r.correctText && <div className="flex gap-2"><dt className="text-muted">Düzgün cavab:</dt><dd className="font-semibold text-success">{r.correctText}</dd></div>}
          </dl>
        )}

        {reviewAllowed && (r.whyWrong || r.explanation || (r.steps && r.steps.length > 0) || r.concept) && r.status !== "correct" && (
          <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-4 text-sm">
            {r.whyWrong && <div><p className="font-bold">Niyə bu cavab yanlışdır?</p><p className="mt-0.5 text-muted">{r.whyWrong}</p></div>}
            {r.explanation && <div><p className="font-bold">İzah</p><Prose text={r.explanation} className="mt-0.5 text-muted" /></div>}
            {r.steps && r.steps.length > 0 && <div><p className="font-bold">Həll addımları</p><ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">{r.steps.map((st, i) => <li key={i}>{st}</li>)}</ol></div>}
            {r.concept && <p className="flex gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-ink" /><span><strong>Yoxlanılan anlayış:</strong> {r.concept}</span></p>}
          </div>
        )}
        {r.status !== "correct" && (
          <p className="no-print mt-3 text-sm">
            {r.lesson ? <>Növbəti addım: <Link href={`/dersler/${r.lesson.slug}`} className="font-semibold text-accent-ink hover:underline">“{r.lesson.title}” dərsinə baxın</Link>{r.topic ? ` və “${r.topic}” mövzusunda oxşar sualları təkrar edin.` : "."}</> : r.topic ? <>Növbəti addım: “{r.topic}” mövzusunu təkrar edin.</> : null}
          </p>
        )}
      </Card>
    </li>
  );
}
