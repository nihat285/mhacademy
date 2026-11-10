import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard, ExamCard, LessonCard, TeacherCard } from "@/components/cards";
import { Block, Container, PageHeader } from "@/components/catalog/page-header";
import { TopicTree } from "@/components/catalog/topic-tree";
import { Card, EmptyState } from "@/components/ui/card";
import { getSubjectBySlug, getSubjectCourses, getSubjectLessons, getSubjectTeachers, getSubjectUpcomingExams, getTopicTree } from "@/lib/queries/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSubjectBySlug(slug);
  if (!s) return { title: "Fənn tapılmadı" };
  return { title: s.name, description: s.description ?? `${s.name} üzrə mövzular, dərslər, sınaqlar və müəllimlər.` };
}

export default async function SubjectPage({ params }: Props) {
  const { slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) notFound();
  const [tree, courses, lessons, exams, teachers] = await Promise.all([
    getTopicTree(subject.id),
    getSubjectCourses(subject.id),
    getSubjectLessons(subject.id, 6),
    getSubjectUpcomingExams(subject.id),
    getSubjectTeachers(subject.id),
  ]);

  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Ana səhifə" }, { href: "/fenler", label: "Fənlər" }, { label: subject.name }]} eyebrow="Fənn" title={subject.name} intro={subject.description ?? undefined} />
      <div aria-hidden className="h-1" style={{ background: subject.accent ?? "var(--accent)" }} />
      <Container>
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-4">
              <h2 className="px-3 pt-1 pb-2 font-sans text-sm font-bold uppercase tracking-widest text-accent-ink">Mövzular</h2>
              {tree.length ? <TopicTree nodes={tree} subjectSlug={subject.slug} /> : <p className="px-3 pb-3 text-sm text-muted">Mövzular tezliklə əlavə olunacaq.</p>}
              <Link href={`/dersler?fen=${subject.slug}`} className="mt-3 block rounded-lg px-3 py-2 text-sm font-semibold text-accent-ink hover:bg-surface-2">
                Bu fənnin bütün dərsləri →
              </Link>
            </Card>
          </aside>

          <div className="min-w-0 space-y-12">
            <Block id="kurslar" title="Kurslar">
              {courses.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {courses.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Kurs hələ əlavə olunmayıb" />
              )}
            </Block>

            <Block id="dersler" title="Video dərslər" action={lessons.length > 0 ? <Link href={`/dersler?fen=${subject.slug}`} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">Hamısına bax</Link> : undefined}>
              {lessons.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {lessons.map((l) => (
                    <LessonCard key={l.id} l={l} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Dərs hələ əlavə olunmayıb" />
              )}
            </Block>

            <Block id="sinaqlar" title="Yaxınlaşan sınaqlar" action={<Link href="/sinaqlar" className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">Bütün sınaqlar</Link>}>
              {exams.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {exams.map((e) => (
                    <ExamCard key={e.id} e={e} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Yaxınlaşan sınaq yoxdur">Yeni sınaqlar elan olunduqca burada görünəcək.</EmptyState>
              )}
            </Block>

            <Block id="muellimler" title="Müəllimlər">
              {teachers.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {teachers.map((t) => (
                    <TeacherCard key={t.slug} t={t} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Müəllim təyin olunmayıb" />
              )}
            </Block>
          </div>
        </div>
      </Container>
    </>
  );
}
