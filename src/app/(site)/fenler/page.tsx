import type { Metadata } from "next";
import { SubjectCard } from "@/components/cards";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { EmptyState } from "@/components/ui/card";
import { getSubjectsWithCounts } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Fənlər",
  description: "MH Academy fənləri: hər fənn üzrə mövzular, kurslar, video dərslər, sınaqlar və müəllimlər.",
};

export default async function SubjectsPage() {
  const subjects = await getSubjectsWithCounts();
  return (
    <>
      <PageHeader eyebrow="Fənlər" title="Hər fənn üzrə sistemli hazırlıq" intro="Fənni seçin: mövzular, kurslar, dərslər, yaxınlaşan sınaqlar və müəllimlər bir səhifədə." />
      <Container>
        {subjects.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <div key={s.id} className="flex flex-col">
                <SubjectCard s={s} />
                <p className="mt-2 px-1 text-xs text-muted">{s.teacherCount} müəllim</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Fənlər tezliklə əlavə olunacaq">Dərc olunmuş fənn hazırda yoxdur.</EmptyState>
        )}
      </Container>
    </>
  );
}
