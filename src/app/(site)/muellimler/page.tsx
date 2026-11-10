import type { Metadata } from "next";
import { TeacherCard } from "@/components/cards";
import { FilterChips } from "@/components/catalog/filter-chips";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { slugParam } from "@/components/catalog/params";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { getSubjectOptions, getTeacherDirectory } from "@/lib/queries/catalog";

export const metadata: Metadata = {
  title: "Müəllimlər",
  description: "MH Academy müəllimləri: fənləri, təcrübəsi, dərsləri və sınaqları ilə tanış olun.",
};

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const fen = slugParam(sp.fen);
  const [subjects, { rows, subject }] = await Promise.all([getSubjectOptions(), getTeacherDirectory(fen)]);

  return (
    <>
      <PageHeader eyebrow="Müəllimlər" title="Dərsləri və sınaqları hazırlayan müəllimlər" intro="Hər müəllimin fənləri, təcrübəsi, dərsləri və dərc etdiyi sınaqları ayrıca profildə yerləşir.">
        {subjects.length > 0 && (
          <FilterChips label="Fənnə görə süzgəc" allHref="/muellimler" active={subject?.slug} items={subjects.map((s) => ({ key: s.slug, label: s.name, href: `/muellimler?fen=${encodeURIComponent(s.slug)}` }))} />
        )}
      </PageHeader>
      <Container>
        {fen && !subject && <p className="mb-6 rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">Belə fənn tapılmadı, bütün müəllimlər göstərilir.</p>}
        {rows.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted" aria-live="polite">
              {subject ? `${subject.name} fənni üzrə ` : ""}
              {rows.length} müəllim
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((t) => (
                <TeacherCard key={t.slug} t={t} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title={subject ? `${subject.name} üzrə müəllim tapılmadı` : "Müəllim profilləri tezliklə əlavə olunacaq"} action={subject ? <LinkButton href="/muellimler" variant="outline">Bütün müəllimlər</LinkButton> : undefined}>
            {subject ? "Bu fənn üçün hələ dərc olunmuş müəllim profili yoxdur." : "Dərc olunmuş müəllim profili hazırda yoxdur."}
          </EmptyState>
        )}
      </Container>
    </>
  );
}
