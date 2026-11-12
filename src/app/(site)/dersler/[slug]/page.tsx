import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonCard } from "@/components/cards";
import { Photo } from "@/components/cards";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { safeFileUrl } from "@/components/catalog/video-source";
import { LessonWatch } from "@/components/catalog/lesson-watch";
import { Prose } from "@/components/prose";
import { Badge, Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { getCompletedLessonIds, getCourseLessonList, getLessonBySlug, getLessonMaterials, getLessonStudentState, getRelatedLessons } from "@/lib/queries/catalog";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getLessonBySlug(slug);
  if (!l) return { title: "Dərs tapılmadı" };
  return { title: l.title, description: l.description ?? `${l.subjectName} fənni üzrə video dərs.` };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  const user = await getCurrentUser();
  const viewer = !user ? null : user.role === "student" ? "student" : "staff";
  const [materials, courseLessons, related, state] = await Promise.all([
    getLessonMaterials(lesson.id),
    lesson.courseId ? getCourseLessonList(lesson.courseId) : Promise.resolve([]),
    getRelatedLessons(lesson),
    user?.role === "student" ? getLessonStudentState(user.id, lesson.id) : Promise.resolve({ positionSec: 0, completed: false, bookmarked: false }),
  ]);
  const done = user?.role === "student" ? await getCompletedLessonIds(user.id, courseLessons.map((c) => c.id)) : new Set<string>();

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Ana səhifə" }, { href: "/dersler", label: "Dərslər" }, { href: `/dersler?fen=${lesson.subjectSlug}`, label: lesson.subjectName }, { label: lesson.title }]}
        title={lesson.title}
      />
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <LessonWatch
              lessonId={lesson.id}
              title={lesson.title}
              provider={lesson.provider}
              videoRef={lesson.videoRef}
              signInHref={`/giris?next=${encodeURIComponent(`/dersler/${lesson.slug}`)}`}
              viewer={viewer}
              initial={state}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="gold">{lesson.subjectName}</Badge>
              {lesson.topicName && <Badge>{lesson.topicName}</Badge>}
              {lesson.durationSec > 0 && <Badge>{formatDuration(lesson.durationSec)}</Badge>}
            </div>
            {lesson.description && <p className="mt-4 text-lg text-muted">{lesson.description}</p>}
            {lesson.notes && (
              <section className="mt-8" aria-labelledby="notes-h">
                <h2 id="notes-h" className="text-2xl font-semibold">Dərs qeydləri</h2>
                <Prose text={lesson.notes} className="mt-3" />
              </section>
            )}
            {materials.length > 0 && (
              <section className="mt-8" aria-labelledby="mat-h">
                <h2 id="mat-h" className="text-2xl font-semibold">Dərs materialları</h2>
                <ul className="mt-3 space-y-2">
                  {materials.map((m) => {
                    const href = safeFileUrl(m.fileUrl);
                    if (!href) return null;
                    const size = m.sizeBytes ? (m.sizeBytes >= 1048576 ? `${(m.sizeBytes / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(m.sizeBytes / 1024))} KB`) : null;
                    const download = href.includes("blob.vercel-storage.com") ? `${href}${href.includes("?") ? "&" : "?"}download=1` : href;
                    return (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                        <FileText size={20} className="shrink-0 text-accent-ink" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{m.title}</p>
                          <p className="text-xs text-muted">PDF{size ? ` · ${size}` : ""}</p>
                        </div>
                        <div className="flex gap-2">
                          <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">Aç</a>
                          <a href={download} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:opacity-90"><Download size={14} /> Endir</a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {lesson.teacherName && (
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <Photo src={lesson.teacherPhoto} alt={lesson.teacherName} className="h-16 w-16 rounded-full object-cover text-xl" />
                  <div>
                    <p className="font-display text-lg font-semibold">{lesson.teacherName}</p>
                    {lesson.teacherHeadline && <p className="text-sm text-muted">{lesson.teacherHeadline}</p>}
                  </div>
                </div>
                {lesson.teacherSlug && lesson.teacherPublished && (
                  <Link href={`/muellimler/${lesson.teacherSlug}`} className="mt-4 block text-sm font-semibold text-accent-ink hover:underline">Müəllimin profili →</Link>
                )}
              </Card>
            )}
            {courseLessons.length > 1 && (
              <Card className="p-4">
                <h2 className="px-1 pb-2 font-sans text-sm font-bold uppercase tracking-widest text-accent-ink">{lesson.courseTitle}</h2>
                <ol className="space-y-1">
                  {courseLessons.map((c, i) => (
                    <li key={c.id}>
                      <Link href={`/dersler/${c.slug}`} aria-current={c.id === lesson.id ? "page" : undefined} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface-2 ${c.id === lesson.id ? "bg-surface-2 font-semibold" : ""}`}>
                        <span>{done.has(c.id) ? "✓ " : `${i + 1}. `}{c.title}</span>
                        <span className="shrink-0 text-xs text-muted">{formatDuration(c.durationSec)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-14" aria-labelledby="rel-h">
            <h2 id="rel-h" className="mb-5 text-2xl font-semibold">Oxşar dərslər</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((l) => (
                <LessonCard key={l.id} l={l} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
