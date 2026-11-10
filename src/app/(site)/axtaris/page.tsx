import type { Metadata } from "next";
import { Search } from "lucide-react";
import { CourseCard, ExamCard, LessonCard, SubjectCard, TeacherCard } from "@/components/cards";
import { Block, Container, PageHeader } from "@/components/catalog/page-header";
import { one } from "@/components/catalog/params";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { globalSearch } from "@/lib/queries/catalog";

export const metadata: Metadata = { title: "Axtarış", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = one((await searchParams).q, 80);
  const r = q && q.length >= 2 ? await globalSearch(q) : null;
  const total = r ? r.lessons.length + r.exams.length + r.teachers.length + r.subjects.length + r.courses.length : 0;
  return (
    <>
      <PageHeader eyebrow="Axtarış" title={q ? <>“{q}” üzrə nəticələr</> : "Saytda axtar"}>
        <form action="/axtaris" role="search" className="flex max-w-xl gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">Axtarış sözü</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} type="search" maxLength={80} minLength={2} placeholder="Dərs, fənn, müəllim, sınaq…" className="h-12 w-full rounded-xl border border-white/20 bg-white pl-9 pr-3 text-base text-navy-950 focus:outline-2 focus:outline-gold-400" />
          </label>
          <button className={buttonClasses("primary", "lg")}>Axtar</button>
        </form>
      </PageHeader>
      <Container>
        {!r ? (
          <EmptyState title="Axtarış sözünü yazın">Ən azı 2 simvol daxil edin.</EmptyState>
        ) : total === 0 ? (
          <EmptyState title="Heç nə tapılmadı">Başqa açar söz sınayın.</EmptyState>
        ) : (
          <div className="space-y-12">
            {r.subjects.length > 0 && <Block title="Fənlər"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{r.subjects.map((s) => <SubjectCard key={s.id} s={s} />)}</div></Block>}
            {r.lessons.length > 0 && <Block title="Dərslər"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{r.lessons.map((l) => <LessonCard key={l.id} l={l} />)}</div></Block>}
            {r.courses.length > 0 && <Block title="Kurslar"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{r.courses.map((c) => <CourseCard key={c.id} c={c} />)}</div></Block>}
            {r.exams.length > 0 && <Block title="Sınaqlar"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{r.exams.map((e) => <ExamCard key={e.id} e={e} />)}</div></Block>}
            {r.teachers.length > 0 && <Block title="Müəllimlər"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{r.teachers.map((t) => <TeacherCard key={t.slug} t={t} />)}</div></Block>}
          </div>
        )}
      </Container>
    </>
  );
}
