import { BookOpen, Calendar, Clock, FileQuestion, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { examPhase, PHASE_LABEL, PHASE_TONE } from "@/lib/exam-phase";
import { DIFFICULTY_LABEL, formatDateTime, formatDuration, formatMinutes } from "@/lib/format";

/* eslint-disable @next/next/no-img-element */
export function Photo({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  if (!src) {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center bg-navy-800 font-display text-4xl text-gold-400 ${className ?? ""}`}>
        {alt
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

export function SubjectCard({ s }: { s: { slug: string; name: string; description: string | null; accent: string | null; lessonCount: number; examCount: number } }) {
  return (
    <Link href={`/fenler/${s.slug}`} className="group block">
      <Card className="h-full overflow-hidden p-0 transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="h-1.5" style={{ background: s.accent ?? "var(--accent)" }} />
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold">{s.name}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted">{s.description}</p>
          <p className="mt-4 flex gap-4 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1"><PlayCircle size={14} /> {s.lessonCount} dərs</span>
            <span className="inline-flex items-center gap-1"><FileQuestion size={14} /> {s.examCount} sınaq</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function CourseCard({ c }: { c: { slug: string; title: string; thumbnailUrl: string | null; subjectName: string; teacherName: string | null; lessonCount: number; grade: number | null } }) {
  return (
    <Link href={`/dersler?course=${c.slug}`} className="group block">
      <Card className="h-full overflow-hidden p-0 transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="aspect-video bg-navy-900">
          <Photo src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover" />
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">{c.subjectName}</Badge>
            {c.grade && <Badge>{c.grade}-ci sinif</Badge>}
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold">{c.title}</h3>
          <p className="mt-2 flex items-center gap-3 text-xs text-muted">
            {c.teacherName && <span>{c.teacherName}</span>}
            <span className="inline-flex items-center gap-1"><BookOpen size={13} /> {c.lessonCount} dərs</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function TeacherCard({ t }: { t: { slug: string; name: string; headline: string | null; bio: string | null; qualifications: string | null; photoUrl: string | null; subjectNames: string[]; isDemo: boolean } }) {
  return (
    <Link href={`/muellimler/${t.slug}`} className="group block">
      <Card className="h-full overflow-hidden p-0 transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="relative aspect-[4/5] bg-navy-900">
          <Photo src={t.photoUrl} alt={t.name} className="h-full w-full object-cover" />
          {t.isDemo && <Badge tone="warning" className="absolute left-3 top-3">Demo profil</Badge>}
        </div>
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold">{t.name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-accent-ink">{t.subjectNames.join(" · ") || t.headline}</p>
          {t.qualifications && <p className="mt-2 line-clamp-2 text-xs text-muted">{t.qualifications}</p>}
          {t.bio && <p className="mt-2 line-clamp-3 text-sm text-muted">{t.bio}</p>}
        </div>
      </Card>
    </Link>
  );
}

export function ExamCard({
  e,
  action,
}: {
  e: { slug: string; title: string; startsAt: Date; endsAt: Date; durationMin: number; difficulty: "easy" | "medium" | "hard"; subjectName: string; questionCount: number };
  action?: React.ReactNode;
}) {
  const phase = examPhase(e);
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="gold">{e.subjectName}</Badge>
        <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
        <Badge>{DIFFICULTY_LABEL[e.difficulty]}</Badge>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">{e.title}</h3>
      <ul className="mt-3 space-y-1.5 text-sm text-muted">
        <li className="inline-flex items-center gap-2"><Calendar size={15} /> {phase === "live" ? `${formatDateTime(e.endsAt)}-dək açıqdır` : formatDateTime(e.startsAt)}</li>
        <li className="flex items-center gap-2"><Clock size={15} /> {formatMinutes(e.durationMin)} · {e.questionCount} sual</li>
      </ul>
      <div className="mt-auto pt-5">
        {action ?? (
          <LinkButton href={`/sinaqlar/${e.slug}`} variant={phase === "live" ? "primary" : "outline"} size="sm" className="w-full">
            {phase === "live" ? "Sınağa başla" : phase === "upcoming" ? "Qeydiyyatdan keç" : "Ətraflı"}
          </LinkButton>
        )}
      </div>
    </Card>
  );
}

export function LessonCard({ l }: { l: { slug: string; title: string; description: string | null; durationSec: number; thumbnailUrl: string | null; hasVideo: boolean; subjectName: string; teacherName: string | null } }) {
  return (
    <Link href={`/dersler/${l.slug}`} className="group block">
      <Card className="h-full overflow-hidden p-0 transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="relative aspect-video bg-navy-900">
          <Photo src={l.thumbnailUrl} alt={l.title} className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-navy-950/25 text-white opacity-90 transition group-hover:bg-navy-950/10">
            <PlayCircle size={46} strokeWidth={1.4} />
          </span>
          <span className="absolute bottom-2 right-2 rounded-md bg-navy-950/80 px-2 py-0.5 text-xs font-semibold text-white">{formatDuration(l.durationSec)}</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Badge tone="gold">{l.subjectName}</Badge>
            {!l.hasVideo && <Badge>Mətn dərsi</Badge>}
          </div>
          <h3 className="mt-2 font-display text-base font-semibold leading-snug">{l.title}</h3>
          {l.teacherName && <p className="mt-1 text-xs text-muted">{l.teacherName}</p>}
        </div>
      </Card>
    </Link>
  );
}
