import type { Metadata } from "next";
import { ExamCard } from "@/components/cards";
import { FilterChips } from "@/components/catalog/filter-chips";
import { Block, Container, PageHeader } from "@/components/catalog/page-header";
import { slugParam } from "@/components/catalog/params";
import { EmptyState } from "@/components/ui/card";
import { getPublicExams, getSubjectOptions } from "@/lib/queries/catalog";

export const metadata: Metadata = { title: "Sınaqlar", description: "Yaxınlaşan və davam edən onlayn sınaqlar." };

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const subject = slugParam((await searchParams).fen);
  const [subjects, upcoming, ended] = await Promise.all([getSubjectOptions(), getPublicExams({ subject }), getPublicExams({ subject, ended: true, limit: 6 })]);
  return (
    <>
      <PageHeader eyebrow="Sınaqlar" title="Onlayn sınaqlar" intro="Real imtahan formatında, vaxt məhdudiyyəti ilə keçirilən sınaqlar.">
        <FilterChips label="Fənlər" allHref="/sinaqlar" active={subject} items={subjects.map((s) => ({ key: s.slug, label: s.name, href: `/sinaqlar?fen=${s.slug}` }))} />
      </PageHeader>
      <Container>
        <Block title="Davam edən və yaxınlaşan">
          {upcoming.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <ExamCard key={e.id} e={e} />)}</div>
          ) : (
            <EmptyState title="Yaxınlaşan sınaq yoxdur">Yeni sınaqlar elan olunduqca burada görünəcək.</EmptyState>
          )}
        </Block>
        {ended.length > 0 && (
          <Block title="Keçmiş sınaqlar">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{ended.map((e) => <ExamCard key={e.id} e={e} />)}</div>
          </Block>
        )}
      </Container>
    </>
  );
}
