import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";
import { LessonCard } from "@/components/cards";
import { FilterChips } from "@/components/catalog/filter-chips";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { one, slugParam } from "@/components/catalog/params";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { getLessonFilterOptions, LESSON_SORTS, LESSONS_PAGE_SIZE, searchLessons, type LessonSort } from "@/lib/queries/catalog";

export const metadata: Metadata = {
  title: "Video dərslər",
  description: "Fənn, mövzu və müəllimə görə süzülən video dərs kitabxanası.",
};

const SORT_LABEL: Record<LessonSort, string> = { yeni: "Ən yeni", muddet: "Ən uzun", ad: "Ada görə" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LessonsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const subject = slugParam(sp.fen);
  const topic = slugParam(sp.movzu);
  const teacher = slugParam(sp.muellim);
  const course = slugParam(sp.course);
  const sortRaw = one(sp.sirala);
  const sort = (LESSON_SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as LessonSort) : "yeni";
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page, 6) ?? "1", 10) || 1));

  const [opts, { rows, total }] = await Promise.all([getLessonFilterOptions(), searchLessons({ q, subject, topic, teacher, course, sort, page })]);

  const params = { q, fen: subject, movzu: topic, muellim: teacher, course, sirala: sort === "yeni" ? undefined : sort };
  const hrefFor = (fen?: string) => {
    const u = new URLSearchParams();
    if (fen) u.set("fen", fen);
    if (q) u.set("q", q);
    const s = u.toString();
    return s ? `/dersler?${s}` : "/dersler";
  };
  const topicsForSubject = subject ? opts.topics.filter((t) => t.subjectSlug === subject) : [];
  const select = "h-11 rounded-xl border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none";

  return (
    <>
      <PageHeader eyebrow="Video dərslər" title="Dərs kitabxanası" intro="Fənn və mövzu üzrə süzün, müəllimlərin hazırladığı dərsləri izləyin və irəliləyişinizi saxlayın.">
        <FilterChips label="Fənlər" allHref={hrefFor()} active={subject} items={opts.subjects.map((s) => ({ key: s.slug, label: s.name, href: hrefFor(s.slug) }))} />
      </PageHeader>
      <Container>
        <form action="/dersler" className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          {subject && <input type="hidden" name="fen" value={subject} />}
          <label className="relative block">
            <span className="sr-only">Dərs axtar</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} type="search" maxLength={120} placeholder="Dərs adı və ya təsvir…" className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:border-accent focus:outline-none" />
          </label>
          {topicsForSubject.length > 0 && (
            <select name="movzu" defaultValue={topic ?? ""} aria-label="Mövzu" className={select}>
              <option value="">Bütün mövzular</option>
              {topicsForSubject.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          )}
          <select name="muellim" defaultValue={teacher ?? ""} aria-label="Müəllim" className={select}>
            <option value="">Bütün müəllimlər</option>
            {opts.teachers.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
          <select name="sirala" defaultValue={sort} aria-label="Sıralama" className={select}>
            {LESSON_SORTS.map((s) => (
              <option key={s} value={s}>{SORT_LABEL[s]}</option>
            ))}
          </select>
          <button className={buttonClasses("primary", "md")}>Süz</button>
        </form>

        {course && <p className="mb-4 text-sm text-muted">Kurs üzrə süzgəc aktivdir. <Link href="/dersler" className="font-semibold text-accent-ink hover:underline">Sıfırla</Link></p>}

        {rows.length ? (
          <>
            <p className="mb-4 text-sm text-muted">{total} dərs tapıldı</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((l) => (
                <LessonCard key={l.id} l={l} />
              ))}
            </div>
            <Pagination page={page} total={total} pageSize={LESSONS_PAGE_SIZE} basePath="/dersler" params={params} />
          </>
        ) : (
          <EmptyState title="Dərs tapılmadı" action={<Link href="/dersler" className={buttonClasses("outline", "sm")}>Süzgəcləri sıfırla</Link>}>
            Axtarış sözünü və ya süzgəcləri dəyişməyi yoxlayın.
          </EmptyState>
        )}
      </Container>
    </>
  );
}
