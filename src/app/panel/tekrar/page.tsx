import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/panel/shell";
import { PracticeSession } from "@/components/panel/practice-session";
import { one } from "@/components/catalog/params";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requireRole } from "@/lib/auth";
import { getActiveMistakes, getPracticeQuestions, sampleMistakeIds } from "@/lib/queries/mistakes";

export const metadata: Metadata = { title: "Təkrar" };

const COUNTS = [5, 10, 20] as const;
type SP = Promise<Record<string, string | string[] | undefined>>;

const chip = (active: boolean) =>
  cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition", active ? "border-accent bg-accent text-on-accent" : "border-border-strong hover:bg-surface-2");

export default async function PracticePage({ searchParams }: { searchParams: SP }) {
  const user = await requireRole(["student"], "/panel/tekrar");
  const sp = await searchParams;
  const subject = one(sp.fen, 80);
  const sayRaw = Number.parseInt(one(sp.say, 3) ?? "", 10);
  const say = (COUNTS as readonly number[]).includes(sayRaw) ? sayRaw : 10;
  const start = one(sp.basla, 2) === "1";

  const all = await getActiveMistakes(user.id);
  const subjects = [...new Map(all.map((m) => [m.subjectSlug, m.subjectName])).entries()].map(([slug, name]) => ({
    slug,
    name,
    n: all.filter((m) => m.subjectSlug === slug).length,
  }));
  const pool = subject ? all.filter((m) => m.subjectSlug === subject) : all;
  const qs = (o: { fen?: string; say?: number; basla?: boolean }) => {
    const p = new URLSearchParams();
    if (o.fen) p.set("fen", o.fen);
    if (o.say) p.set("say", String(o.say));
    if (o.basla) p.set("basla", "1");
    const s = p.toString();
    return `/panel/tekrar${s ? `?${s}` : ""}`;
  };

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Təkrar" intro="Səhv etdiyin sualları yenidən həll et." />
        <EmptyState
          icon={<PartyPopper size={30} />}
          title="Təkrar ediləcək səhvin yoxdur"
          action={<LinkButton href="/sinaqlar">Sınaqlara bax</LinkButton>}
        >
          Sınaq nəticələrin açıqlandıqdan sonra səhv cavablandırdığın suallar burada görünəcək.
        </EmptyState>
      </>
    );
  }

  if (start && pool.length > 0) {
    const picked = sampleMistakeIds(pool, say);
    const questions = await getPracticeQuestions(picked);
    return (
      <>
        <PageHeader title="Təkrar" intro={subject ? `${pool[0].subjectName} fənni üzrə səhvlərin` : "Bütün fənlər üzrə səhvlərin"} actions={<LinkButton href={qs({ fen: subject, say })} variant="outline" size="sm">Çıx</LinkButton>} />
        <PracticeSession key={picked.join("")} questions={questions} backHref="/panel/sehvlerim" restartHref={qs({ fen: subject, say, basla: true })} />
      </>
    );
  }

  const available = pool.length;
  return (
    <>
      <PageHeader title="Təkrar" intro="Səhv etdiyin sualları yenidən həll et. Düzgün cavab verdiyin sual səhvlər siyahısından çıxır." />
      <Card className="max-w-2xl p-6">
        <h2 className="font-sans text-base font-bold">Fənn</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={qs({ say })} className={chip(!subject)}>Hamısı · {all.length}</Link>
          {subjects.map((s) => (
            <Link key={s.slug} href={qs({ fen: s.slug, say })} className={chip(subject === s.slug)}>{s.name} · {s.n}</Link>
          ))}
        </div>

        <h2 className="mt-6 font-sans text-base font-bold">Sual sayı</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <Link key={c} href={qs({ fen: subject, say: c })} className={chip(say === c)}>{c}</Link>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          {available > 0 ? (
            <LinkButton href={qs({ fen: subject, say, basla: true })} size="lg">Başla ({Math.min(say, available)} sual)</LinkButton>
          ) : (
            <p className="text-sm text-muted">Bu fənn üzrə təkrar ediləcək səhvin yoxdur.</p>
          )}
          <Link href="/panel/sehvlerim" className="text-sm font-semibold text-accent-ink hover:underline">Səhvlərimə bax</Link>
        </div>
      </Card>
    </>
  );
}
