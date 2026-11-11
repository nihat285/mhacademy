import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { NoAccess } from "@/components/teacher/no-access";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { selectClass, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatDuration, formatPercent, formatScore } from "@/lib/format";
import { can } from "@/lib/permissions";
import { getExamResults } from "@/lib/queries/teacher-results";

export const metadata: Metadata = { title: "Sınaq nəticələri" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const UUID = /^[0-9a-f-]{36}$/i;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default async function ExamResults({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireRole(["teacher", "admin"], `/muellim/neticeler/${id}`);
  if (!UUID.test(id)) notFound();
  if (!can(user, "exams.manage")) return <><PageHeader title="Nəticələr" /><NoAccess what="Sınaq nəticələri" /></>;
  const sp = await searchParams;
  const classRaw = one(sp.sinif) ?? "";
  const data = await getExamResults(user, id, UUID.test(classRaw) ? classRaw : undefined);
  if (!data) notFound();
  const { exam, classes, activeClass, attempts, stats, questionStats } = data;
  const hardest = [...questionStats].sort((a, b) => a.correct / Math.max(1, a.total) - b.correct / Math.max(1, b.total));

  return (
    <>
      <PageHeader
        title={exam.title}
        intro={`${exam.subject} · keçid həddi ${formatPercent(Number(exam.passingPercent))}${activeClass ? ` · sinif: ${activeClass.name}` : ""}`}
        actions={<LinkButton href="/muellim/neticeler" variant="outline"><ArrowLeft size={16} /> Bütün nəticələr</LinkButton>}
      />

      {classes.length > 0 && (
        <form className="mb-5 flex gap-2">
          <select name="sinif" defaultValue={activeClass?.id ?? ""} className={selectClass} aria-label="Sinif">
            <option value="">Bütün şagirdlər</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90">Filtrlə</button>
        </form>
      )}

      {attempts.length === 0 ? (
        <EmptyState title="Hələ nəticə yoxdur">{activeClass ? "Bu sinifdən heç kim bu sınağı həll etməyib." : "Şagirdlər sınağı həll etdikdən sonra nəticələr burada görünəcək."}</EmptyState>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Həll edən şagird" value={String(stats.students)} />
            <Stat label="Orta nəticə" value={formatPercent(stats.avg)} />
            <Stat label="Ən yüksək" value={formatPercent(stats.max)} />
            <Stat label="Ən aşağı" value={formatPercent(stats.min)} />
            <Stat label="Keçənlər" value={formatPercent(stats.passRate)} />
          </div>
          {stats.inProgress > 0 && <p className="mb-4 text-sm text-muted">{stats.inProgress} cəhd hələ davam edir və statistikaya daxil deyil.</p>}

          <h2 className="mb-3 font-sans text-lg font-bold">Şagirdlər</h2>
          <TableWrap>
            <THead>
              <tr><Th>Şagird</Th><Th>Cəhd</Th><Th>Bal</Th><Th>Faiz</Th><Th>Düz / səhv / boş</Th><Th>Vaxt</Th><Th>Təqdim</Th></tr>
            </THead>
            <tbody>
              {attempts.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-semibold">{a.student}<span className="block text-xs font-normal text-muted">{a.email}</span></Td>
                  <Td>{a.attemptNo}</Td>
                  {a.status === "in_progress" ? (
                    <Td colSpan={4} className="text-muted">Həll edir…</Td>
                  ) : (
                    <>
                      <Td className="tabular-nums">{a.score === null ? "—" : `${formatScore(Number(a.score))} / ${formatScore(Number(a.maxScore))}`}</Td>
                      <Td>
                        {formatPercent(a.percentage === null ? null : Number(a.percentage))}{" "}
                        {a.passed != null && <Badge tone={a.passed ? "success" : "danger"}>{a.passed ? "Keçdi" : "Keçmədi"}</Badge>}
                      </Td>
                      <Td className="tabular-nums text-xs">{a.correct ?? 0} / {a.incorrect ?? 0} / {a.unanswered ?? 0}</Td>
                      <Td className="whitespace-nowrap text-xs">{a.timeSpentSec == null ? "—" : formatDuration(a.timeSpentSec)}</Td>
                    </>
                  )}
                  <Td className="whitespace-nowrap text-xs">
                    {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                    {a.status === "auto_submitted" && <span className="block text-muted">vaxt bitdi</span>}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>

          {hardest.length > 0 && (
            <Card className="mt-10 p-5 sm:p-6">
              <h2 className="font-sans text-lg font-bold">Suallar üzrə təhlil</h2>
              <p className="mt-1 text-sm text-muted">Ən çətin suallar yuxarıdadır. Düz cavab faizi aşağı olan suallar üzərində dərsdə yenidən dayanmaq məsləhətdir.</p>
              <ul className="mt-4 divide-y divide-border">
                {hardest.map((q) => {
                  const rate = (q.correct / Math.max(1, q.total)) * 100;
                  return (
                    <li key={q.id} className="flex items-center gap-4 py-3">
                      <span className="w-8 shrink-0 text-center text-xs font-semibold text-muted">№{q.position + 1}</span>
                      <p className="min-w-0 flex-1 text-sm leading-snug">{q.text.length > 160 ? `${q.text.slice(0, 160)}…` : q.text}</p>
                      <div className="w-36 shrink-0">
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(rate)}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs tabular-nums text-muted">{formatPercent(rate)} düz · {q.wrong} səhv</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
