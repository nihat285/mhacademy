import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { Badge, Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { examPhase, PHASE_LABEL, PHASE_TONE } from "@/lib/exam-phase";
import { DIFFICULTY_LABEL, formatDateTime, formatMinutes } from "@/lib/format";
import { getPublicExamBySlug } from "@/lib/queries/catalog";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getPublicExamBySlug((await params).slug);
  return e ? { title: e.title, description: e.description ?? undefined } : { title: "Sınaq tapılmadı" };
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const e = await getPublicExamBySlug(slug);
  if (!e) notFound();
  const user = await getCurrentUser();
  const phase = examPhase(e);
  const rows: [string, string][] = [
    ["Fənn", e.subjectName],
    ["Başlama", formatDateTime(e.startsAt)],
    ["Bitmə", formatDateTime(e.endsAt)],
    ["Müddət", formatMinutes(e.durationMin)],
    ["Sual sayı", String(e.questionCount)],
    ["Keçid balı", `${Number(e.passingPercent)}%`],
    ["Cəhd sayı", String(e.attemptLimit)],
    ["Çətinlik", DIFFICULTY_LABEL[e.difficulty]],
  ];
  if (Number(e.negativeMarking) > 0) rows.push(["Səhv cavab", `−${Number(e.negativeMarking)} bal`]);
  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Ana səhifə" }, { href: "/sinaqlar", label: "Sınaqlar" }, { label: e.title }]} eyebrow={e.subjectName} title={e.title} intro={e.description ?? undefined} />
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <Card className="p-6">
            <h2 className="text-xl font-semibold">Sınaq haqqında</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border py-2 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="h-fit p-6">
            <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
            {phase === "ended" ? (
              <p className="mt-3 text-sm text-muted">Bu sınaq bitib. Yeni sınaqlara baxın.</p>
            ) : user ? (
              <p className="mt-3 text-sm text-muted">Sınağa qoşulma və cavablandırma şagird panelində açılacaq.</p>
            ) : (
              <p className="mt-3 text-sm text-muted">Sınaqda iştirak üçün hesaba daxil olun.</p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {!user && phase !== "ended" && <LinkButton href={`/giris?next=${encodeURIComponent(`/sinaqlar/${e.slug}`)}`} className="w-full">Daxil ol</LinkButton>}
              {!user && phase !== "ended" && <LinkButton href="/qeydiyyat" variant="outline" className="w-full">Qeydiyyat</LinkButton>}
              <LinkButton href="/sinaqlar" variant="ghost" className="w-full">Bütün sınaqlar</LinkButton>
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
}
