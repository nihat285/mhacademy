import { Award, Clock, Mail, MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard, ExamCard, LessonCard, Photo } from "@/components/cards";
import { Block, Container, PageHeader } from "@/components/catalog/page-header";
import { Prose } from "@/components/prose";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { getTeacherBySlug, getTeacherCourses, getTeacherExams, getTeacherLessons } from "@/lib/queries/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTeacherBySlug(slug);
  if (!t) return { title: "Müəllim tapılmadı" };
  return { title: t.name, description: t.headline ?? t.bio?.slice(0, 160) ?? `${t.name} — MH Academy müəllimi.` };
}

export default async function TeacherProfilePage({ params }: Props) {
  const { slug } = await params;
  const t = await getTeacherBySlug(slug);
  if (!t) notFound();
  const [courses, lessons, exams] = await Promise.all([getTeacherCourses(t.userId), getTeacherLessons(t.userId), getTeacherExams(t.userId)]);

  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Ana səhifə" }, { href: "/muellimler", label: "Müəllimlər" }, { label: t.name }]} title={t.name} intro={t.headline ?? undefined}>
        <ul className="flex flex-wrap gap-2">
          {t.subjects.map((s) => (
            <li key={s.slug}>
              <Link href={`/fenler/${s.slug}`} className="inline-flex rounded-full border border-gold-500/50 px-3.5 py-1 text-sm font-semibold text-gold-300 transition hover:bg-white/10">
                {s.name}
              </Link>
            </li>
          ))}
          {t.isDemo && (
            <li>
              <Badge tone="warning">Demo profil</Badge>
            </li>
          )}
        </ul>
      </PageHeader>

      <Container>
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden p-0">
              <div className="aspect-[4/5] bg-navy-900">
                <Photo src={t.photoUrl} alt={t.name} className="h-full w-full object-cover" />
              </div>
            </Card>
            <Card className="space-y-4 p-5 text-sm">
              {t.experienceYears != null && t.experienceYears > 0 && (
                <p className="flex items-center gap-3">
                  <Award size={18} className="shrink-0 text-accent-ink" />
                  <span>
                    <span className="font-semibold">{t.experienceYears} il</span> təcrübə
                  </span>
                </p>
              )}
              {t.officeHours && (
                <div className="flex gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-accent-ink" />
                  <div>
                    <p className="font-semibold">Qəbul saatları</p>
                    <Prose text={t.officeHours} className="mt-1 text-muted" />
                  </div>
                </div>
              )}
              {t.contactEmail && (
                <p className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0 text-accent-ink" />
                  <a href={`mailto:${t.contactEmail}`} className="break-all font-semibold underline-offset-4 hover:underline">
                    {t.contactEmail}
                  </a>
                </p>
              )}
              {!t.officeHours && !t.contactEmail && !(t.experienceYears && t.experienceYears > 0) && <p className="text-muted">Əlavə əlaqə məlumatı göstərilməyib. Suallarınız üçün <Link href="/elaqe" className="font-semibold underline underline-offset-4">əlaqə formasından</Link> istifadə edin.</p>}
            </Card>
          </aside>

          <div className="min-w-0 space-y-12">
            <section aria-labelledby="haqqinda">
              <h2 id="haqqinda" className="text-2xl font-semibold sm:text-3xl">Haqqında</h2>
              {t.bio ? <Prose text={t.bio} className="mt-4 text-[1.02rem]" /> : <p className="mt-3 text-muted">Müəllim haqqında ətraflı məlumat tezliklə əlavə olunacaq.</p>}
              {t.qualifications && (
                <>
                  <h3 className="mt-8 text-xl font-semibold">Təhsil və ixtisas</h3>
                  <Prose text={t.qualifications} className="mt-3" />
                </>
              )}
            </section>

            <Block id="kurslar" title="Kurslar">
              {courses.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {courses.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Kurs hələ əlavə olunmayıb">Bu müəllimin dərc olunmuş kursu hazırda yoxdur.</EmptyState>
              )}
            </Block>

            <Block id="video-dersler" title="Video dərslər" action={lessons.length > 0 ? <Link href={`/dersler?muellim=${t.slug}`} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">Hamısına bax</Link> : undefined}>
              {lessons.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {lessons.map((l) => (
                    <LessonCard key={l.id} l={l} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Dərs hələ əlavə olunmayıb">Bu müəllimin dərc olunmuş dərsi hazırda yoxdur.</EmptyState>
              )}
            </Block>

            <Block id="sinaqlar" title="Sınaqlar">
              {exams.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {exams.map((e) => (
                    <ExamCard key={e.id} e={e} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Dərc olunmuş sınaq yoxdur">Bu müəllimin açıq sınağı hazırda yoxdur.</EmptyState>
              )}
            </Block>

            <Block id="rey" title="Şagird rəyləri">
              <EmptyState icon={<MessageSquareQuote size={28} />} title="Hələ rəy yoxdur">
                Şagird rəyləri toplanmağa başlayanda burada göstəriləcək. Uydurma rəy və ya reytinq göstərmirik.
              </EmptyState>
            </Block>
          </div>
        </div>
      </Container>
    </>
  );
}
