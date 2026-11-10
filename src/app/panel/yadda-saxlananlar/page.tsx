import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bookmark, BookMarked, PlayCircle } from "lucide-react";
import { db } from "@/db";
import { lessonBookmarks, lessons, questionBookmarks, questions, subjects, users } from "@/db/schema";
import { removeLessonBookmarkAction, removeQuestionBookmarkAction } from "@/app/actions/profile";
import { PageHeader } from "@/components/panel/shell";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { DIFFICULTY_LABEL, formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Yadda saxlanılanlar" };

export default async function SavedPage() {
  const user = await requireRole(["student"], "/panel/yadda-saxlananlar");
  // Question bookmarks expose the question text only — never options, answers or explanations.
  const [savedLessons, savedQuestions] = await Promise.all([
    db
      .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, durationSec: lessons.durationSec, subject: subjects.name, teacher: users.name, savedAt: lessonBookmarks.createdAt })
      .from(lessonBookmarks)
      .innerJoin(lessons, eq(lessons.id, lessonBookmarks.lessonId))
      .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .where(eq(lessonBookmarks.userId, user.id))
      .orderBy(desc(lessonBookmarks.createdAt)),
    db
      .select({ id: questions.id, text: questions.text, difficulty: questions.difficulty, subject: subjects.name, savedAt: questionBookmarks.createdAt })
      .from(questionBookmarks)
      .innerJoin(questions, eq(questions.id, questionBookmarks.questionId))
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(eq(questionBookmarks.userId, user.id))
      .orderBy(desc(questionBookmarks.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Yadda saxlanılanlar" intro="Sonradan baxmaq üçün işarələdiyiniz dərslər və suallar." />

      <section aria-labelledby="saved-lessons">
        <h2 id="saved-lessons" className="mb-3 font-sans text-lg font-bold">Dərslər ({savedLessons.length})</h2>
        {savedLessons.length === 0 ? (
          <EmptyState icon={<PlayCircle size={28} />} title="Saxlanılmış dərs yoxdur" action={<Link href="/dersler" className={buttonClasses("primary", "md")}>Video dərslərə bax</Link>}>
            Dərs səhifəsindəki əlfəcin düyməsi ilə dərsi buraya əlavə edə bilərsiniz.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedLessons.map((l) => (
              <Card key={l.id} className="flex flex-col p-5">
                <Badge tone="gold" className="self-start">{l.subject}</Badge>
                <Link href={`/dersler/${l.slug}`} className="mt-3 font-display text-lg font-semibold hover:underline">{l.title}</Link>
                <p className="mt-1 text-sm text-muted">{l.teacher ?? "MH Academy"}{l.durationSec ? ` · ${formatDuration(l.durationSec)}` : ""}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/dersler/${l.slug}`} className={buttonClasses("outline", "sm")}>Aç</Link>
                  <form action={removeLessonBookmarkAction.bind(null, l.id)}>
                    <button type="submit" className="text-sm font-semibold text-danger hover:underline">Siyahıdan çıxar</button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="saved-questions">
        <h2 id="saved-questions" className="mb-3 font-sans text-lg font-bold">Suallar ({savedQuestions.length})</h2>
        {savedQuestions.length === 0 ? (
          <EmptyState icon={<BookMarked size={28} />} title="Saxlanılmış sual yoxdur">Sınaq nəticələrini nəzərdən keçirərkən çətin sualları işarələyib burada toplaya bilərsiniz.</EmptyState>
        ) : (
          <Card>
            <CardHeader title="İşarələnmiş suallar" subtitle="Düzgün cavablar yalnız sınağın nəticə icmalında göstərilir." />
            <ul className="divide-y divide-border">
              {savedQuestions.map((q) => (
                <li key={q.id} className="flex items-start gap-3 p-5">
                  <Bookmark size={18} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line">{q.text.length > 280 ? `${q.text.slice(0, 280)}…` : q.text}</p>
                    <p className="mt-2 flex gap-2 text-xs"><Badge>{q.subject}</Badge><Badge tone="info">{DIFFICULTY_LABEL[q.difficulty]}</Badge></p>
                  </div>
                  <form action={removeQuestionBookmarkAction.bind(null, q.id)}>
                    <button type="submit" className="text-sm font-semibold text-danger hover:underline">Çıxar</button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
