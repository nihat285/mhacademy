import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, ClipboardCheck, Clock, Lightbulb, MonitorPlay, Quote, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { CourseCard, ExamCard, LessonCard, SubjectCard, TeacherCard } from "@/components/cards";
import { DashboardPreview } from "@/components/site/dashboard-preview";
import { FaqList } from "@/components/site/faq";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, Section } from "@/components/ui/card";
import { MarkWatermark, Signature } from "@/components/ui/logo";
import { examPhase } from "@/lib/exam-phase";
import { formatDateTime, formatMinutes, formatNumber } from "@/lib/format";
import {
  getFaqs,
  getFeaturedCourses,
  getFeaturedLessons,
  getPlatformStats,
  getSubjectsWithCounts,
  getTeachers,
  getTestimonials,
  getUpcomingExams,
} from "@/lib/queries/public";

export default async function HomePage() {
  const [stats, subjects, courses, teachers, exams, lessons, testimonials, faqs] = await Promise.all([
    getPlatformStats(),
    getSubjectsWithCounts(true),
    getFeaturedCourses(3),
    getTeachers({ featuredOnly: true, limit: 4 }),
    getUpcomingExams(4),
    getFeaturedLessons(3),
    getTestimonials(),
    getFaqs(),
  ]);
  const next = exams[0];

  const STEPS = [
    { icon: ClipboardCheck, title: "Sınaq seçin", text: "Fənn, çətinlik və vaxta görə sınaq seçib qeydiyyatdan keçin." },
    { icon: Timer, title: "Real imtahan mühiti", text: "Tam ekran interfeys, serverdə hesablanan taymer və avtomatik saxlanılan cavablar." },
    { icon: BarChart3, title: "Dərhal nəticə", text: "Bal, düzgün/səhv/cavabsız sayı və mövzular üzrə performans." },
    { icon: Lightbulb, title: "Səhv təhlili", text: "Hər səhv üçün izah, niyə yanlış olduğu və təkrar üçün dərs tövsiyəsi." },
  ];

  return (
    <>
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(60rem 28rem at 85% -10%, rgb(212 175 55 / 0.18), transparent 60%), radial-gradient(40rem 24rem at -10% 110%, rgb(39 64 113 / 0.55), transparent 60%)" }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
        <MarkWatermark className="-bottom-16 -right-10 h-[28rem] opacity-[0.04]" />
        <Signature className="right-6 top-6 h-14 w-[4.5rem] sm:right-12 sm:top-10 sm:h-24 sm:w-32" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gold-300">
              <ShieldCheck size={14} /> Premium onlayn təhsil
            </p>
            <h1 className="mt-6 text-4xl font-semibold text-balance sm:text-5xl lg:text-[3.4rem]">
              Hazırlığınızı real imtahan mühitində <span className="text-gold-400">yoxlayın</span>, səhvlərinizdən öyrənin.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              Onlayn sınaqlar, ətraflı səhv təhlili və peşəkar müəllimlərin dərsləri bir platformada. Hər cəhddən sonra nəyi təkrar etməli olduğunuzu dəqiq bilirsiniz.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/sinaqlar" size="lg">
                Sınağa başla <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/muellimler" variant="onDark" size="lg">
                Müəllimlərimizi kəşf et
              </LinkButton>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {["Serverdə qorunan taymer", "Avtomatik saxlama", "Mövzu üzrə səhv təhlili"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-gold-400" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rise [animation-delay:120ms]">
            <Card className="border-white/15 bg-white/[0.06] p-6 text-white shadow-hero backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">{next && examPhase(next) === "live" ? "İndi açıqdır" : "Növbəti sınaq"}</p>
              {next ? (
                <>
                  <h2 className="mt-3 font-display text-2xl font-semibold">{next.title}</h2>
                  <ul className="mt-4 space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2"><CalendarClock size={16} className="text-gold-400" />{examPhase(next) === "live" ? `${formatDateTime(next.endsAt)}-dək` : formatDateTime(next.startsAt)}</li>
                    <li className="flex items-center gap-2"><Clock size={16} className="text-gold-400" />{formatMinutes(next.durationMin)} · {next.questionCount} sual</li>
                    <li className="flex items-center gap-2"><MonitorPlay size={16} className="text-gold-400" />{next.subjectName}</li>
                  </ul>
                  <LinkButton href={`/sinaqlar/${next.slug}`} className="mt-6 w-full">
                    {examPhase(next) === "live" ? "Sınağa başla" : "Qeydiyyatdan keç"}
                  </LinkButton>
                </>
              ) : (
                <p className="mt-3 text-white/75">Hazırda planlaşdırılmış sınaq yoxdur. Yeni sınaqlar elan olunduqca burada görünəcək.</p>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------ Stats ------------------------------ */}
      <section aria-label="Platforma statistikası" className="border-b border-border bg-surface">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-5 py-8 sm:px-8 md:grid-cols-4">
          {[
            ["Qeydiyyatlı şagird", stats.students],
            ["Tamamlanmış sınaq", stats.completedExams],
            ["Mövcud dərs", stats.lessons],
            ["Müəllim", stats.teachers],
          ].map(([label, value]) => (
            <div key={label as string} className="text-center md:border-r md:border-border md:last:border-r-0">
              <dd className="font-display text-4xl font-semibold tabular-nums">{formatNumber(value as number)}</dd>
              <dt className="mt-1 text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ----------------------- Subjects & courses ----------------------- */}
      <Section id="fenler" eyebrow="Fənlər və kurslar" title="Hər fənn üçün sistemli hazırlıq" intro="Mövzular üzrə qurulmuş kurslar, dərslər və sınaqlar eyni yerdə.">
        {subjects.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <SubjectCard key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <EmptyState title="Fənlər tezliklə əlavə olunacaq" />
        )}
        {courses.length > 0 && (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        )}
        <div className="mt-8">
          <LinkButton href="/fenler" variant="outline">Bütün fənlərə bax</LinkButton>
        </div>
      </Section>

      {/* ----------------------------- Teachers ----------------------------- */}
      <div className="bg-surface-2/60">
        <Section eyebrow="Müəllimlər" title="Təcrübəli və peşəkar müəllim heyəti" intro="Hər müəllimin fənləri, təcrübəsi, dərsləri və dərc etdiyi sınaqları ayrıca profildə.">
          {teachers.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {teachers.map((t) => (
                <TeacherCard key={t.slug} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState title="Müəllim profilləri tezliklə əlavə olunacaq" />
          )}
          <div className="mt-8">
            <LinkButton href="/muellimler" variant="outline">Bütün müəllimlər</LinkButton>
          </div>
        </Section>
      </div>

      {/* ------------------------------- Exams ------------------------------- */}
      <Section id="sinaqlar" eyebrow="Onlayn sınaqlar" title="Yaxınlaşan və davam edən sınaqlar" intro="Qeydiyyatdan keçin, xatırlatma alın və imtahan vaxtı birbaşa platformada iştirak edin.">
        {exams.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {exams.map((e) => (
              <ExamCard key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <EmptyState title="Hazırda planlaşdırılmış sınaq yoxdur">Yeni sınaqlar elan olunduqca burada görünəcək.</EmptyState>
        )}
        <div className="mt-8">
          <LinkButton href="/sinaqlar" variant="outline">Sınaq təqvimi</LinkButton>
        </div>
      </Section>

      {/* ---------------------------- How it works ---------------------------- */}
      <div className="bg-navy-900 text-white">
        <Section eyebrow="Necə işləyir" title={<span className="text-white">Sınaqdan öyrənməyə qədər 4 addım</span>} intro={<span className="text-white/70">Nəticə yalnız bal deyil — nəyi və niyə səhv etdiyinizi başa düşmək üçündür.</span>}>
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-white/12 bg-white/[0.04] p-6">
                <span className="flex items-center justify-between">
                  <s.icon className="text-gold-400" size={26} />
                  <span className="font-display text-3xl text-white/20">0{i + 1}</span>
                </span>
                <h3 className="mt-5 font-sans text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* ------------------------------- Lessons ------------------------------- */}
      <Section id="dersler" eyebrow="Video dərslər" title="Mövzu üzrə qısa və aydın dərslər" intro="Səhv etdiyiniz mövzuya aid dərs sınaq nəticəsindən birbaşa açılır.">
        {lessons.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l) => (
              <LessonCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <EmptyState title="Dərslər tezliklə əlavə olunacaq" />
        )}
        <div className="mt-8">
          <LinkButton href="/dersler" variant="outline">Dərs kitabxanası</LinkButton>
        </div>
      </Section>

      {/* ----------------------------- Testimonials ----------------------------- */}
      {testimonials.length > 0 && (
        <div className="bg-surface-2/60">
          <Section eyebrow="Rəylər" title="İştirakçıların fikirləri">
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.id} className="flex flex-col p-6">
                  <Quote className="text-accent-ink" size={24} />
                  <blockquote className="mt-3 flex-1 text-[0.97rem]">{t.quote}</blockquote>
                  <p className="mt-5 text-sm font-bold">{t.authorName}</p>
                  <p className="text-xs text-muted">{t.authorRole}</p>
                  {t.isPlaceholder && <Badge tone="warning" className="mt-3 self-start">Nümunə mətn — real rəylərlə əvəz olunacaq</Badge>}
                </Card>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ---------------------------- Dashboard preview ---------------------------- */}
      <Section eyebrow="Şəxsi panel" title="İrəliləyişinizi rəqəmlərlə izləyin" intro="Real panelin bütün göstəriciləri sizin saxlanılmış nəticələrinizdən hesablanır. Aşağıda yalnız görünüşü nümayiş etdirən nümunə var.">
        <DashboardPreview />
        <div className="mt-8">
          <LinkButton href="/qeydiyyat">Panelinizi yaradın</LinkButton>
        </div>
      </Section>

      {/* ---------------------------------- FAQ ---------------------------------- */}
      <Section id="faq" eyebrow="Tez-tez verilən suallar" title="Sualınız var?" className="max-w-4xl">
        {faqs.length ? <FaqList items={faqs} /> : <EmptyState title="Suallar tezliklə əlavə olunacaq" />}
        <p className="mt-6 text-sm text-muted">
          Cavabını tapmadınız? <Link href="/elaqe" className="font-semibold text-accent-ink underline underline-offset-4">Bizə yazın</Link>.
        </p>
      </Section>
    </>
  );
}
